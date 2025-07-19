import Stripe from 'stripe';
import { SmartPricingEngine } from './pricing-engine';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export interface PaymentRequest {
  slotType: 'premium' | 'featured' | 'standard';
  duration: number; // days
  startDate: Date;
  country: string;
  adFormat: 'image' | 'video' | 'text';
  aiGenerated?: boolean;
  userId: string;
  campaignId?: string;
}

export interface PaymentSession {
  sessionId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  metadata: {
    slotType: string;
    duration: number;
    startDate: string;
    country: string;
    userId: string;
    campaignId?: string;
  };
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // partial refund amount, if not provided, full refund
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
}

export class PaymentEngine {
  /**
   * Create a payment session for ad booking
   */
  static async createPaymentSession(request: PaymentRequest): Promise<PaymentSession> {
    try {
      // Calculate pricing using the pricing engine
      const pricing = await PricingEngine.calculatePrice({
        slotType: request.slotType,
        duration: request.duration,
        startDate: request.startDate,
        country: request.country,
        adFormat: request.adFormat,
        aiGenerated: request.aiGenerated,
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pricing.totalCost * 100), // Convert to cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          slotType: request.slotType,
          duration: request.duration.toString(),
          startDate: request.startDate.toISOString(),
          country: request.country,
          userId: request.userId,
          campaignId: request.campaignId || '',
          adFormat: request.adFormat,
          aiGenerated: request.aiGenerated ? 'true' : 'false',
        },
      });

      // Create checkout session for hosted payment page
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Billboard Ad - ${request.slotType.charAt(0).toUpperCase() + request.slotType.slice(1)} Slot`,
                description: `${request.duration} day campaign starting ${request.startDate.toLocaleDateString()}`,
                images: ['https://example.com/billboard-ad-image.jpg'], // Replace with actual image
              },
              unit_amount: Math.round(pricing.totalCost * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
        metadata: {
          slotType: request.slotType,
          duration: request.duration.toString(),
          startDate: request.startDate.toISOString(),
          country: request.country,
          userId: request.userId,
          campaignId: request.campaignId || '',
          paymentIntentId: paymentIntent.id,
        },
      });

      return {
        sessionId: session.id,
        paymentIntentId: paymentIntent.id,
        amount: pricing.totalCost,
        currency: 'usd',
        status: 'pending',
        metadata: {
          slotType: request.slotType,
          duration: request.duration,
          startDate: request.startDate.toISOString(),
          country: request.country,
          userId: request.userId,
          campaignId: request.campaignId,
        },
      };
    } catch (error) {
      throw new Error(`Payment session creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Verify payment completion
   */
  static async verifyPayment(sessionId: string): Promise<{
    success: boolean;
    paymentIntent?: Stripe.PaymentIntent;
    session?: Stripe.Checkout.Session;
  }> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid' && session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent as string
        );
        
        return {
          success: true,
          paymentIntent,
          session,
        };
      }
      
      return { success: false, session };
    } catch (error) {
      throw new Error(`Payment verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process refund
   */
  static async processRefund(request: RefundRequest): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: request.paymentIntentId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason,
      });

      return refund;
    } catch (error) {
      throw new Error(`Refund processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment history for a user
   */
  static async getPaymentHistory(userId: string, limit: number = 10): Promise<Stripe.PaymentIntent[]> {
    try {
      const paymentIntents = await stripe.paymentIntents.list({
        limit,
        metadata: {
          userId,
        },
      });

      return paymentIntents.data;
    } catch (error) {
      throw new Error(`Failed to fetch payment history: ${(error as Error).message}`);
    }
  }

  /**
   * Create subscription for recurring ads
   */
  static async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      throw new Error(`Subscription creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Handle webhook events
   */
  static async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPayment(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Update campaign status to active
    // Send confirmation email
    // Update user credits/balance
    console.log('Payment succeeded:', paymentIntent.id);
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Update campaign status to failed
    // Send failure notification
    // Release reserved ad slot
    console.log('Payment failed:', paymentIntent.id);
  }

  /**
   * Handle completed checkout session
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    // Activate the ad campaign
    // Update database records
    // Send welcome email
    console.log('Checkout completed:', session.id);
  }

  /**
   * Handle subscription payment
   */
  private static async handleSubscriptionPayment(invoice: Stripe.Invoice): Promise<void> {
    // Renew ad campaign
    // Update subscription status
    // Send renewal confirmation
    console.log('Subscription payment succeeded:', invoice.id);
  }

  /**
   * Calculate platform fees and revenue sharing
   */
  static calculateRevenue(amount: number): {
    platformFee: number;
    processingFee: number;
    netRevenue: number;
    affiliateCommission?: number;
  } {
    const processingFee = amount * 0.029 + 0.30; // Stripe fees
    const platformFee = amount * 0.05; // 5% platform fee
    const netRevenue = amount - processingFee - platformFee;
    
    return {
      platformFee,
      processingFee,
      netRevenue,
    };
  }

  /**
   * Create customer in Stripe
   */
  static async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      throw new Error(`Customer creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer payment methods
   */
  static async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      throw new Error(`Failed to fetch payment methods: ${(error as Error).message}`);
    }
  }
}


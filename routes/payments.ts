import { Router } from "express";
import { PaymentEngine, type PaymentRequest } from "../services/payment-engine";
import { z } from "zod";
import Stripe from 'stripe';

const router = Router();

// Validation schema for payment requests
const paymentRequestSchema = z.object({
  slotType: z.enum(['premium', 'featured', 'standard']),
  duration: z.number().min(1).max(365),
  startDate: z.string().transform(str => new Date(str)),
  country: z.string(),
  adFormat: z.enum(['image', 'video', 'text']),
  aiGenerated: z.boolean().optional(),
  userId: z.string(),
  campaignId: z.string().optional(),
});

// Create payment session
router.post("/create-session", async (req, res) => {
  try {
    const validatedData = paymentRequestSchema.parse(req.body);
    
    const paymentRequest: PaymentRequest = {
      slotType: validatedData.slotType,
      duration: validatedData.duration,
      startDate: validatedData.startDate,
      country: validatedData.country,
      adFormat: validatedData.adFormat,
      aiGenerated: validatedData.aiGenerated,
      userId: validatedData.userId,
      campaignId: validatedData.campaignId,
    };
    
    const session = await PaymentEngine.createPaymentSession(paymentRequest);
    
    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Payment session creation error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Verify payment completion
router.get("/verify/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const verification = await PaymentEngine.verifyPayment(sessionId);
    
    res.json({
      success: true,
      ...verification,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify payment",
    });
  }
});

// Get payment history
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    const history = await PaymentEngine.getPaymentHistory(
      userId,
      limit ? parseInt(limit as string) : 10
    );
    
    res.json({
      success: true,
      payments: history,
    });
  } catch (error) {
    console.error("Payment history error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment history",
    });
  }
});

// Process refund
router.post("/refund", async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;
    
    if (!paymentIntentId || !reason) {
      return res.status(400).json({
        success: false,
        error: "Payment intent ID and reason are required",
      });
    }
    
    const refund = await PaymentEngine.processRefund({
      paymentIntentId,
      amount,
      reason,
    });
    
    res.json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process refund",
    });
  }
});

// Create customer
router.post("/create-customer", async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }
    
    const customer = await PaymentEngine.createCustomer(email, name);
    
    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Customer creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create customer",
    });
  }
});

// Get payment methods
router.get("/payment-methods/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const paymentMethods = await PaymentEngine.getPaymentMethods(customerId);
    
    res.json({
      success: true,
      paymentMethods,
    });
  } catch (error) {
    console.error("Payment methods error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment methods",
    });
  }
});

// Stripe webhook endpoint
router.post("/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    return res.status(400).json({
      success: false,
      error: "Webhook secret not configured",
    });
  }
  
  let event: Stripe.Event;
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20',
    });
    
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({
      success: false,
      error: 'Invalid signature',
    });
  }
  
  try {
    await PaymentEngine.handleWebhook(event);
    
    res.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook handling failed',
    });
  }
});

// Calculate revenue breakdown
router.post("/calculate-revenue", async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount is required",
      });
    }
    
    const revenue = PaymentEngine.calculateRevenue(amount);
    
    res.json({
      success: true,
      revenue,
    });
  } catch (error) {
    console.error("Revenue calculation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate revenue",
    });
  }
});

export default router;


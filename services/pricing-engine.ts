import {
  BASE_RATES,
  SLOT_MULTIPLIERS,
  GEO_MULTIPLIERS,
  TIME_MULTIPLIERS,
  FORMAT_MULTIPLIERS,
  DURATION_DISCOUNTS,
  DEMAND_MULTIPLIERS,
  SLOT_TIER_MAPPING,
  AD_SLOT_TYPES,
  type SlotType,
  type SlotTier,
  type CountryCode,
  type TimeSlot,
  type AdFormat,
  type DemandLevel,
} from "../src/lib/shared";

export interface PricingRequest {
  slotType: SlotType;
  duration: number; // days
  countryCode: CountryCode;
  startDate: Date;
  adFormat: AdFormat;
  isAiGenerated?: boolean;
}

export interface PricingBreakdown {
  baseRate: number;
  slotMultiplier: number;
  geoMultiplier: number;
  timeMultiplier: number;
  formatMultiplier: number;
  durationDiscount: number;
  demandMultiplier: number;
  aiGeneratedBonus: number;
  subtotal: number;
  total: number;
  dailyRate: number;
}

export interface PricingResult {
  total: number;
  dailyRate: number;
  breakdown: PricingBreakdown;
  currency: string;
}

export class SmartPricingEngine {
  /**
   * Calculate the price for an ad placement based on multiple factors
   */
  static calculatePrice(request: PricingRequest): PricingResult {
    const slotTier = SLOT_TIER_MAPPING[request.slotType] as SlotTier;
    const baseRate = this.getBaseRate(slotTier);
    
    // Calculate multipliers
    const slotMultiplier = SLOT_MULTIPLIERS[slotTier];
    const geoMultiplier = this.getGeoMultiplier(request.countryCode);
    const timeMultiplier = this.getTimeMultiplier(request.startDate);
    const formatMultiplier = FORMAT_MULTIPLIERS[request.adFormat];
    const durationDiscount = this.getDurationDiscount(request.duration);
    const demandMultiplier = this.getDemandMultiplier(request.slotType, request.startDate);
    const aiGeneratedBonus = request.isAiGenerated ? FORMAT_MULTIPLIERS.AI_GENERATED_BONUS : 0;
    
    // Calculate subtotal (before AI bonus)
    const subtotal = baseRate * 
      slotMultiplier * 
      geoMultiplier * 
      timeMultiplier * 
      formatMultiplier * 
      durationDiscount * 
      demandMultiplier * 
      request.duration;
    
    // Add AI bonus (flat rate)
    const total = subtotal + aiGeneratedBonus;
    const dailyRate = total / request.duration;
    
    const breakdown: PricingBreakdown = {
      baseRate,
      slotMultiplier,
      geoMultiplier,
      timeMultiplier,
      formatMultiplier,
      durationDiscount,
      demandMultiplier,
      aiGeneratedBonus,
      subtotal,
      total,
      dailyRate,
    };
    
    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      dailyRate: Math.round(dailyRate * 100) / 100,
      breakdown,
      currency: 'USD',
    };
  }
  
  /**
   * Get base rate for slot tier
   */
  private static getBaseRate(slotTier: SlotTier): number {
    switch (slotTier) {
      case 'TOP':
        return BASE_RATES.TOP_TIER;
      case 'MID':
        return BASE_RATES.MID_TIER;
      case 'BOTTOM':
        return BASE_RATES.BOTTOM_TIER;
      default:
        return BASE_RATES.BOTTOM_TIER;
    }
  }
  
  /**
   * Get geographic multiplier based on country code
   */
  private static getGeoMultiplier(countryCode: CountryCode): number {
    return GEO_MULTIPLIERS[countryCode] || GEO_MULTIPLIERS.DEFAULT;
  }
  
  /**
   * Get time-based multiplier based on start date and time
   */
  private static getTimeMultiplier(startDate: Date): number {
    const hour = startDate.getHours();
    const dayOfWeek = startDate.getDay();
    
    // Weekend multiplier
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return TIME_MULTIPLIERS.WEEKEND;
    }
    
    // Time-based multipliers (weekdays)
    if (hour >= 18 && hour < 22) {
      return TIME_MULTIPLIERS.PRIME_TIME;
    } else if (hour >= 9 && hour < 17) {
      return TIME_MULTIPLIERS.BUSINESS_HOURS;
    } else if (hour >= 17 && hour < 21) {
      return TIME_MULTIPLIERS.EVENING;
    } else if (hour >= 6 && hour < 9) {
      return TIME_MULTIPLIERS.MORNING;
    } else {
      return TIME_MULTIPLIERS.LATE_NIGHT;
    }
  }
  
  /**
   * Get duration discount based on number of days
   */
  private static getDurationDiscount(duration: number): number {
    if (duration >= 30) return DURATION_DISCOUNTS[30];
    if (duration >= 14) return DURATION_DISCOUNTS[14];
    if (duration >= 7) return DURATION_DISCOUNTS[7];
    if (duration >= 3) return DURATION_DISCOUNTS[3];
    return DURATION_DISCOUNTS[1];
  }
  
  /**
   * Get demand multiplier based on slot popularity and date
   * This would typically query a database for historical data
   * For now, we'll use a simplified algorithm
   */
  private static getDemandMultiplier(slotType: SlotType, startDate: Date): number {
    // Simplified demand calculation
    // In production, this would analyze historical booking data
    
    const hour = startDate.getHours();
    const dayOfWeek = startDate.getDay();
    
    // Higher demand for premium slots during prime time
    if (slotType === AD_SLOT_TYPES.TOP_CENTER) {
      if (hour >= 18 && hour < 22) {
        return DEMAND_MULTIPLIERS.VERY_HIGH;
      } else if (hour >= 9 && hour < 17) {
        return DEMAND_MULTIPLIERS.HIGH;
      }
    }
    
    // Weekend demand patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return DEMAND_MULTIPLIERS.MEDIUM;
    }
    
    // Default medium demand
    return DEMAND_MULTIPLIERS.MEDIUM;
  }
  
  /**
   * Get available slots for a given date range
   */
  static async getAvailableSlots(startDate: Date, endDate: Date): Promise<SlotAvailability[]> {
    // This would query the database for existing bookings
    // For now, return all slots as available
    
    const slots: SlotAvailability[] = Object.values(AD_SLOT_TYPES).map(slotType => ({
      slotType: slotType as SlotType,
      isAvailable: true,
      bookedDates: [],
      popularityScore: Math.random() * 100, // Mock popularity
    }));
    
    return slots;
  }
  
  /**
   * Calculate price for multiple slots and durations
   */
  static calculateBulkPricing(requests: PricingRequest[]): PricingResult[] {
    return requests.map(request => this.calculatePrice(request));
  }
  
  /**
   * Get pricing estimate for quick preview
   */
  static getQuickEstimate(
    slotType: SlotType,
    duration: number,
    countryCode: CountryCode = 'US'
  ): number {
    const request: PricingRequest = {
      slotType,
      duration,
      countryCode,
      startDate: new Date(),
      adFormat: 'IMAGE',
      isAiGenerated: false,
    };
    
    return this.calculatePrice(request).total;
  }
}

export interface SlotAvailability {
  slotType: SlotType;
  isAvailable: boolean;
  bookedDates: Date[];
  popularityScore: number;
}

// Example usage and testing
export function testPricingEngine() {
  const testRequest: PricingRequest = {
    slotType: AD_SLOT_TYPES.TOP_CENTER,
    duration: 3,
    countryCode: 'US',
    startDate: new Date('2024-01-15T19:00:00'), // Prime time
    adFormat: 'VIDEO',
    isAiGenerated: true,
  };
  
  const result = SmartPricingEngine.calculatePrice(testRequest);
  console.log('Pricing Test Result:', result);
  
  // Expected: ~$215 for 3-day top-center US slot during evening
  // Base: $15 * 2.0 (top) * 1.5 (US) * 1.4 (prime) * 1.5 (video) * 0.95 (3-day discount) * 1.8 (high demand) * 3 days + $10 AI bonus
  // = $15 * 2.0 * 1.5 * 1.4 * 1.5 * 0.95 * 1.8 * 3 + 10 = ~$215
  
  return result;
}


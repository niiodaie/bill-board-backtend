import { Router } from "express";
import { SmartPricingEngine, type PricingRequest } from "../services/pricing-engine";
import { z } from "zod";

const router = Router();

// Validation schema for pricing requests
const pricingRequestSchema = z.object({
  slotType: z.string(),
  duration: z.number().min(1).max(30),
  countryCode: z.string().length(2),
  startDate: z.string().transform((str) => new Date(str)),
  adFormat: z.enum(['IMAGE', 'VIDEO', 'TEXT']),
  isAiGenerated: z.boolean().optional().default(false),
});

// Calculate pricing for a single ad placement
router.post("/calculate", async (req, res) => {
  try {
    const validatedData = pricingRequestSchema.parse(req.body);
    
    const pricingRequest: PricingRequest = {
      slotType: validatedData.slotType as any,
      duration: validatedData.duration,
      countryCode: validatedData.countryCode as any,
      startDate: validatedData.startDate,
      adFormat: validatedData.adFormat,
      isAiGenerated: validatedData.isAiGenerated,
    };
    
    const result = SmartPricingEngine.calculatePrice(pricingRequest);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Pricing calculation error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Get quick estimate for preview
router.get("/estimate", async (req, res) => {
  try {
    const { slotType, duration, countryCode } = req.query;
    
    if (!slotType || !duration) {
      return res.status(400).json({
        success: false,
        error: "slotType and duration are required",
      });
    }
    
    const estimate = SmartPricingEngine.getQuickEstimate(
      slotType as any,
      parseInt(duration as string),
      (countryCode as string) || 'US'
    );
    
    res.json({
      success: true,
      estimate,
      currency: 'USD',
    });
  } catch (error) {
    console.error("Pricing estimate error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate estimate",
    });
  }
});

// Get available slots for date range
router.get("/availability", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const availability = await SmartPricingEngine.getAvailableSlots(start, end);
    
    res.json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check availability",
    });
  }
});

// Calculate bulk pricing for multiple requests
router.post("/bulk", async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: "requests must be an array",
      });
    }
    
    const validatedRequests = requests.map(request => {
      const validated = pricingRequestSchema.parse(request);
      return {
        slotType: validated.slotType as any,
        duration: validated.duration,
        countryCode: validated.countryCode as any,
        startDate: validated.startDate,
        adFormat: validated.adFormat,
        isAiGenerated: validated.isAiGenerated,
      };
    });
    
    const results = SmartPricingEngine.calculateBulkPricing(validatedRequests);
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Bulk pricing error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Get pricing constants for frontend
router.get("/constants", (req, res) => {
  res.json({
    success: true,
    constants: {
      baseRates: {
        TOP_TIER: 15,
        MID_TIER: 10,
        BOTTOM_TIER: 5,
      },
      slotTypes: [
        'top_center', 'top_left', 'top_right',
        'mid_center', 'mid_left', 'mid_right',
        'bottom_center', 'bottom_left', 'bottom_right',
        'mobile_banner', 'mobile_interstitial'
      ],
      adFormats: ['IMAGE', 'VIDEO', 'TEXT'],
      maxDuration: 30,
      minDuration: 1,
    },
  });
});

export default router;


import { Router } from "express";
import { SurpriseGenerator, type SurpriseRequest } from "../services/surprise-generator";
import { z } from "zod";

const router = Router();

// Validation schema for surprise requests
const surpriseRequestSchema = z.object({
  occasion: z.enum(['birthday', 'anniversary', 'date_night', 'apology', 'just_because', 'holiday']),
  relationship: z.enum(['partner', 'friend', 'family', 'colleague']),
  budget: z.enum(['low', 'medium', 'high', 'unlimited']),
  location: z.string().optional(),
  interests: z.array(z.string()).optional(),
  personalityType: z.enum(['adventurous', 'romantic', 'practical', 'creative', 'social']).optional(),
});

// Generate personalized surprise ideas
router.post("/generate", async (req, res) => {
  try {
    const validatedData = surpriseRequestSchema.parse(req.body);
    
    const surpriseRequest: SurpriseRequest = {
      occasion: validatedData.occasion,
      relationship: validatedData.relationship,
      budget: validatedData.budget,
      location: validatedData.location,
      interests: validatedData.interests,
      personalityType: validatedData.personalityType,
    };
    
    const result = await SurpriseGenerator.generateSurprises(surpriseRequest);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Surprise generation error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Get quick surprise ideas for homepage
router.get("/quick", async (req, res) => {
  try {
    const ideas = await SurpriseGenerator.generateQuickSurprises();
    
    res.json({
      success: true,
      ideas,
    });
  } catch (error) {
    console.error("Quick surprises error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate quick surprise ideas",
    });
  }
});

// Get location-specific surprise ideas
router.get("/location/:location", async (req, res) => {
  try {
    const { location } = req.params;
    const { occasion } = req.query;
    
    const result = await SurpriseGenerator.generateLocationSurprises(
      location,
      occasion as string || 'date_night'
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Location surprises error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate location-specific surprises",
    });
  }
});

// Get surprise ideas by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { location } = req.query;
    
    if (!['romantic', 'friendship', 'family', 'professional'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: "Invalid category. Must be one of: romantic, friendship, family, professional",
      });
    }
    
    const ideas = await SurpriseGenerator.generateByCategory(
      category as any,
      location as string
    );
    
    res.json({
      success: true,
      ideas,
      category,
    });
  } catch (error) {
    console.error("Category surprises error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate category-specific surprises",
    });
  }
});

// Get seasonal surprise ideas
router.get("/seasonal/:season", async (req, res) => {
  try {
    const { season } = req.params;
    const { location } = req.query;
    
    const ideas = await SurpriseGenerator.generateSeasonalSurprises(
      season,
      location as string
    );
    
    res.json({
      success: true,
      ideas,
      season,
    });
  } catch (error) {
    console.error("Seasonal surprises error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate seasonal surprises",
    });
  }
});

export default router;


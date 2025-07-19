import { Router } from "express";
import { ReferralEngine } from "../services/referral-engine";
import { z } from "zod";

const router = Router();

// Validation schemas
const generateCodeSchema = z.object({
  userId: z.string(),
  customCode: z.string().optional(),
});

const applyCodeSchema = z.object({
  code: z.string(),
  newUserId: z.string(),
});

const promotionalCodeSchema = z.object({
  userId: z.string(),
  customCode: z.string(),
  rewardType: z.enum(['credit', 'discount', 'free_slot']),
  rewardValue: z.number().positive(),
  maxUses: z.number().positive().optional(),
  expiresAt: z.string().transform(str => new Date(str)).optional(),
});

// Generate referral code
router.post("/generate-code", async (req, res) => {
  try {
    const validatedData = generateCodeSchema.parse(req.body);
    
    const referralCode = ReferralEngine.generateReferralCode(
      validatedData.userId,
      validatedData.customCode
    );
    
    res.json({
      success: true,
      referralCode,
    });
  } catch (error) {
    console.error("Referral code generation error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Apply referral code
router.post("/apply-code", async (req, res) => {
  try {
    const validatedData = applyCodeSchema.parse(req.body);
    
    const result = await ReferralEngine.applyReferralCode(
      validatedData.code,
      validatedData.newUserId
    );
    
    if (result.success) {
      res.json({
        success: true,
        reward: result.reward,
        message: "Referral code applied successfully!",
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Referral code application error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply referral code",
    });
  }
});

// Get referral statistics
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await ReferralEngine.getReferralStats(userId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch referral statistics",
    });
  }
});

// Create promotional code
router.post("/create-promotional", async (req, res) => {
  try {
    const validatedData = promotionalCodeSchema.parse(req.body);
    
    const promotionalCode = ReferralEngine.createPromotionalCode(
      validatedData.userId,
      validatedData.customCode,
      validatedData.rewardType,
      validatedData.rewardValue,
      validatedData.maxUses,
      validatedData.expiresAt
    );
    
    res.json({
      success: true,
      promotionalCode,
    });
  } catch (error) {
    console.error("Promotional code creation error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid request data",
    });
  }
});

// Process referral rewards
router.post("/process-rewards", async (req, res) => {
  try {
    const { rewardIds } = req.body;
    
    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Reward IDs array is required",
      });
    }
    
    const result = await ReferralEngine.processRewards(rewardIds);
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Reward processing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process rewards",
    });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { limit } = req.query;
    
    const leaderboard = await ReferralEngine.getLeaderboard(
      limit ? parseInt(limit as string) : 10
    );
    
    res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard",
    });
  }
});

// Generate referral links
router.get("/links/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { baseUrl } = req.query;
    
    const links = ReferralEngine.generateReferralLink(
      code,
      baseUrl as string
    );
    
    res.json({
      success: true,
      links,
    });
  } catch (error) {
    console.error("Referral links generation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate referral links",
    });
  }
});

// Validate referral code
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    // This would typically check the database for code validity
    // For now, we'll return a mock validation
    const isValid = code.length >= 6 && /^[A-Z0-9]+$/.test(code);
    
    res.json({
      success: true,
      valid: isValid,
      message: isValid ? "Referral code is valid" : "Invalid referral code format",
    });
  } catch (error) {
    console.error("Referral code validation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate referral code",
    });
  }
});

// Get user's referral codes
router.get("/codes/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In production, this would fetch from database
    // For now, return mock data
    const codes = [
      {
        id: "ref_123",
        code: "BILLBOARD10",
        userId,
        createdAt: new Date(),
        isActive: true,
        currentUses: 5,
        rewardType: "credit",
        rewardValue: 10,
      },
    ];
    
    res.json({
      success: true,
      codes,
    });
  } catch (error) {
    console.error("User referral codes error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user referral codes",
    });
  }
});

// Get referral rewards for a user
router.get("/rewards/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    // In production, this would fetch from database with optional status filter
    // For now, return mock data
    const rewards = [
      {
        id: "reward_123",
        referrerId: userId,
        refereeId: "user_456",
        rewardType: "credit",
        rewardValue: 10,
        status: "paid",
        createdAt: new Date(),
        paidAt: new Date(),
      },
    ];
    
    const filteredRewards = status 
      ? rewards.filter(r => r.status === status)
      : rewards;
    
    res.json({
      success: true,
      rewards: filteredRewards,
    });
  } catch (error) {
    console.error("User referral rewards error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user referral rewards",
    });
  }
});

export default router;


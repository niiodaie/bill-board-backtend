import { Router } from "express";
import { DealsAggregator } from "../services/deals-aggregator";

const router = Router();

// Get daily deals
router.get("/daily", async (req, res) => {
  try {
    const { location, limit } = req.query;
    
    const deals = await DealsAggregator.getDailyDeals(
      location as string || 'Global',
      parseInt(limit as string) || 10
    );
    
    res.json({
      success: true,
      ...deals,
    });
  } catch (error) {
    console.error("Failed to fetch daily deals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily deals",
    });
  }
});

// Get deal of the day
router.get("/deal-of-the-day", async (req, res) => {
  try {
    const { location } = req.query;
    
    const deal = await DealsAggregator.getDealOfTheDay(location as string || 'Global');
    
    res.json({
      success: true,
      deal,
    });
  } catch (error) {
    console.error("Failed to fetch deal of the day:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deal of the day",
    });
  }
});

// Get deals by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { location } = req.query;
    
    const deals = await DealsAggregator.getDealsByCategory(
      category,
      location as string || 'Global'
    );
    
    res.json({
      success: true,
      deals,
      category,
    });
  } catch (error) {
    console.error("Failed to fetch deals by category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deals by category",
    });
  }
});

// Get trending deals
router.get("/trending", async (req, res) => {
  try {
    const { location, limit } = req.query;
    
    const deals = await DealsAggregator.getTrendingDeals(
      location as string || 'Global',
      parseInt(limit as string) || 5
    );
    
    res.json({
      success: true,
      deals,
    });
  } catch (error) {
    console.error("Failed to fetch trending deals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch trending deals",
    });
  }
});

// Get local deals
router.get("/local", async (req, res) => {
  try {
    const { location, limit } = req.query;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location parameter is required for local deals",
      });
    }
    
    const deals = await DealsAggregator.getLocalDeals(
      location as string,
      parseInt(limit as string) || 8
    );
    
    res.json({
      success: true,
      deals,
      location,
    });
  } catch (error) {
    console.error("Failed to fetch local deals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch local deals",
    });
  }
});

// Search deals
router.get("/search", async (req, res) => {
  try {
    const { q, location } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query parameter 'q' is required",
      });
    }
    
    const deals = await DealsAggregator.searchDeals(
      q as string,
      location as string || 'Global'
    );
    
    res.json({
      success: true,
      deals,
      query: q,
    });
  } catch (error) {
    console.error("Failed to search deals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search deals",
    });
  }
});

// Get deals statistics
router.get("/stats", async (req, res) => {
  try {
    const { location } = req.query;
    
    const stats = await DealsAggregator.getDealsStats(location as string || 'Global');
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch deals stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deals statistics",
    });
  }
});

export default router;


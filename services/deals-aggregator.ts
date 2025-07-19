import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

export interface Deal {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  category: string;
  merchant: string;
  expiryDate: Date;
  location?: string;
  isLocal: boolean;
  dealUrl: string;
  imageUrl?: string;
  tags: string[];
  popularity: number;
  isAffiliate: boolean;
  affiliateUrl?: string;
}

export interface DealResponse {
  deals: Deal[];
  location: string;
  totalDeals: number;
  categories: string[];
  lastUpdated: Date;
}

export class DealsAggregator {
  /**
   * Get daily deals for a specific location
   */
  static async getDailyDeals(location: string = 'Global', limit: number = 10): Promise<DealResponse> {
    try {
      // In production, this would aggregate from multiple sources:
      // - Affiliate networks (Amazon, eBay, etc.)
      // - Local business APIs
      // - Coupon sites
      // - Social media deals
      
      // For now, we'll generate realistic-looking deals using AI
      const deals = await this.generateMockDeals(location, limit);
      
      return {
        deals,
        location,
        totalDeals: deals.length,
        categories: [...new Set(deals.map(d => d.category))],
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error("Failed to fetch daily deals: " + (error as Error).message);
    }
  }

  /**
   * Generate mock deals using AI (for demonstration)
   * In production, replace with real API integrations
   */
  private static async generateMockDeals(location: string, count: number): Promise<Deal[]> {
    try {
      const systemPrompt = `You are a deals curator for a global marketplace. Generate realistic daily deals that could be found on major e-commerce platforms, local businesses, and affiliate networks.

Consider:
- Seasonal relevance and current trends
- Location-specific businesses and preferences
- Realistic pricing and discount percentages
- Popular product categories
- Mix of online and local deals

Respond with JSON array of deals in this exact format:
[
  {
    "title": "Product/Service name (max 60 chars)",
    "description": "Brief description (100-150 chars)",
    "originalPrice": 99.99,
    "discountedPrice": 49.99,
    "category": "Electronics|Fashion|Food|Home|Travel|Beauty|Sports|Books",
    "merchant": "Store/Brand name",
    "expiryHours": 24,
    "isLocal": true/false,
    "tags": ["tag1", "tag2", "tag3"],
    "popularity": 85
  }
]`;

      const userPrompt = `Generate ${count} diverse daily deals for ${location}. Include:
- 3-4 online deals (electronics, fashion, books)
- 2-3 local deals (restaurants, services, experiences)
- 2-3 seasonal/trending items
- Mix of price ranges ($5-500)
- Realistic discount percentages (10-70%)

Make deals appealing and time-sensitive.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const aiDeals = result.deals || [];

      // Convert AI-generated deals to our Deal interface
      return aiDeals.map((deal: any, index: number) => ({
        id: `deal_${Date.now()}_${index}`,
        title: deal.title,
        description: deal.description,
        originalPrice: deal.originalPrice,
        discountedPrice: deal.discountedPrice,
        discountPercentage: Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100),
        category: deal.category,
        merchant: deal.merchant,
        expiryDate: new Date(Date.now() + (deal.expiryHours || 24) * 60 * 60 * 1000),
        location: deal.isLocal ? location : undefined,
        isLocal: deal.isLocal,
        dealUrl: `https://example.com/deal/${index}`, // Mock URL
        tags: deal.tags || [],
        popularity: deal.popularity || Math.floor(Math.random() * 100),
        isAffiliate: Math.random() > 0.5,
        affiliateUrl: Math.random() > 0.5 ? `https://affiliate.example.com/deal/${index}` : undefined,
      }));
    } catch (error) {
      console.error("Failed to generate mock deals:", error);
      return this.getFallbackDeals(location);
    }
  }

  /**
   * Get deals by category
   */
  static async getDealsByCategory(category: string, location: string = 'Global'): Promise<Deal[]> {
    const allDeals = await this.getDailyDeals(location, 20);
    return allDeals.deals.filter(deal => 
      deal.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get trending deals based on popularity
   */
  static async getTrendingDeals(location: string = 'Global', limit: number = 5): Promise<Deal[]> {
    const allDeals = await this.getDailyDeals(location, 20);
    return allDeals.deals
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Get local deals for a specific location
   */
  static async getLocalDeals(location: string, limit: number = 8): Promise<Deal[]> {
    const allDeals = await this.getDailyDeals(location, 15);
    return allDeals.deals
      .filter(deal => deal.isLocal)
      .slice(0, limit);
  }

  /**
   * Search deals by keyword
   */
  static async searchDeals(query: string, location: string = 'Global'): Promise<Deal[]> {
    const allDeals = await this.getDailyDeals(location, 30);
    const searchTerm = query.toLowerCase();
    
    return allDeals.deals.filter(deal =>
      deal.title.toLowerCase().includes(searchTerm) ||
      deal.description.toLowerCase().includes(searchTerm) ||
      deal.category.toLowerCase().includes(searchTerm) ||
      deal.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get deal of the day (highest value deal)
   */
  static async getDealOfTheDay(location: string = 'Global'): Promise<Deal | null> {
    const allDeals = await this.getDailyDeals(location, 20);
    
    // Find deal with best value (highest discount percentage + popularity)
    const bestDeal = allDeals.deals.reduce((best, current) => {
      const currentScore = current.discountPercentage + (current.popularity / 10);
      const bestScore = best.discountPercentage + (best.popularity / 10);
      return currentScore > bestScore ? current : best;
    });

    return bestDeal || null;
  }

  /**
   * Fallback deals when AI generation fails
   */
  private static getFallbackDeals(location: string): Deal[] {
    return [
      {
        id: 'fallback_1',
        title: 'Wireless Bluetooth Headphones',
        description: 'Premium noise-canceling headphones with 30-hour battery life',
        originalPrice: 199.99,
        discountedPrice: 89.99,
        discountPercentage: 55,
        category: 'Electronics',
        merchant: 'TechStore',
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isLocal: false,
        dealUrl: 'https://example.com/deal/1',
        tags: ['wireless', 'audio', 'bluetooth'],
        popularity: 92,
        isAffiliate: true,
        affiliateUrl: 'https://affiliate.example.com/deal/1',
      },
      {
        id: 'fallback_2',
        title: 'Local Restaurant 50% Off',
        description: 'Authentic Italian cuisine in the heart of downtown',
        originalPrice: 60.00,
        discountedPrice: 30.00,
        discountPercentage: 50,
        category: 'Food',
        merchant: 'Bella Vista Restaurant',
        expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        location: location,
        isLocal: true,
        dealUrl: 'https://example.com/deal/2',
        tags: ['restaurant', 'italian', 'dinner'],
        popularity: 78,
        isAffiliate: false,
      },
    ];
  }

  /**
   * Get deals statistics for analytics
   */
  static async getDealsStats(location: string = 'Global'): Promise<{
    totalDeals: number;
    averageDiscount: number;
    topCategory: string;
    localDealsCount: number;
    expiringToday: number;
  }> {
    const allDeals = await this.getDailyDeals(location, 50);
    const deals = allDeals.deals;

    const categoryCount = deals.reduce((acc, deal) => {
      acc[deal.category] = (acc[deal.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Electronics';

    const averageDiscount = deals.reduce((sum, deal) => sum + deal.discountPercentage, 0) / deals.length;
    const localDealsCount = deals.filter(deal => deal.isLocal).length;
    const expiringToday = deals.filter(deal => {
      const today = new Date();
      const expiry = new Date(deal.expiryDate);
      return expiry.toDateString() === today.toDateString();
    }).length;

    return {
      totalDeals: deals.length,
      averageDiscount: Math.round(averageDiscount),
      topCategory,
      localDealsCount,
      expiringToday,
    };
  }
}


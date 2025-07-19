import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

export interface SurpriseRequest {
  occasion: 'birthday' | 'anniversary' | 'date_night' | 'apology' | 'just_because' | 'holiday';
  relationship: 'partner' | 'friend' | 'family' | 'colleague';
  budget: 'low' | 'medium' | 'high' | 'unlimited';
  location?: string;
  interests?: string[];
  personalityType?: 'adventurous' | 'romantic' | 'practical' | 'creative' | 'social';
}

export interface SurpriseIdea {
  title: string;
  description: string;
  estimatedCost: string;
  timeRequired: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  materials?: string[];
  steps?: string[];
  tips?: string[];
  alternatives?: string[];
}

export interface SurpriseResponse {
  ideas: SurpriseIdea[];
  location: string;
  occasion: string;
  shareableText: string;
  shareableImage?: string;
}

export class SurpriseGenerator {
  /**
   * Generate personalized surprise ideas using AI
   */
  static async generateSurprises(request: SurpriseRequest): Promise<SurpriseResponse> {
    try {
      const systemPrompt = `You are a creative surprise and gift expert with deep knowledge of relationships, celebrations, and meaningful gestures. Generate thoughtful, personalized surprise ideas that create memorable experiences.

Consider:
- Cultural appropriateness and local customs
- Budget constraints and practical feasibility
- Relationship dynamics and boundaries
- Seasonal and location-specific opportunities
- Personal interests and personality types

Respond with JSON in this exact format:
{
  "ideas": [
    {
      "title": "Creative title (max 60 chars)",
      "description": "Detailed description (150-200 words)",
      "estimatedCost": "Budget range (e.g., '$20-50', 'Free', '$100+')",
      "timeRequired": "Time needed (e.g., '30 minutes', '2 hours', '1 day')",
      "difficulty": "easy|medium|hard",
      "category": "Category (e.g., 'Experience', 'Gift', 'Activity')",
      "materials": ["item1", "item2"],
      "steps": ["step1", "step2", "step3"],
      "tips": ["tip1", "tip2"],
      "alternatives": ["alternative1", "alternative2"]
    }
  ],
  "shareableText": "Engaging social media caption with hashtags"
}`;

      const userPrompt = `Generate 5 creative surprise ideas for:
- Occasion: ${request.occasion}
- Relationship: ${request.relationship}
- Budget: ${request.budget}
${request.location ? `- Location: ${request.location}` : ''}
${request.interests?.length ? `- Interests: ${request.interests.join(', ')}` : ''}
${request.personalityType ? `- Personality: ${request.personalityType}` : ''}

Make each idea unique, thoughtful, and actionable. Include local elements if location is provided.`;

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
      
      return {
        ideas: result.ideas || [],
        location: request.location || 'Global',
        occasion: request.occasion,
        shareableText: result.shareableText || `Check out these amazing ${request.occasion} surprise ideas! 🎉 #SurpriseIdeas #${request.occasion} #Billboard`,
      };
    } catch (error) {
      throw new Error("Failed to generate surprise ideas: " + (error as Error).message);
    }
  }

  /**
   * Generate location-specific surprise ideas
   */
  static async generateLocationSurprises(
    location: string,
    occasion: string = 'date_night'
  ): Promise<SurpriseResponse> {
    const request: SurpriseRequest = {
      occasion: occasion as any,
      relationship: 'partner',
      budget: 'medium',
      location,
      personalityType: 'adventurous'
    };

    return this.generateSurprises(request);
  }

  /**
   * Generate quick surprise ideas for homepage
   */
  static async generateQuickSurprises(): Promise<SurpriseIdea[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Generate 3 quick, universal surprise ideas that work for any relationship and occasion. Keep them simple, affordable, and widely applicable."
          },
          {
            role: "user",
            content: "Generate 3 surprise ideas that are: 1) Easy to execute, 2) Budget-friendly, 3) Universally appealing. Format as JSON array of objects with title, description, estimatedCost, timeRequired, difficulty, category."
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.ideas || [];
    } catch (error) {
      console.error("Failed to generate quick surprises:", error);
      return [
        {
          title: "Handwritten Letter",
          description: "Write a heartfelt letter expressing your appreciation and favorite memories together.",
          estimatedCost: "Free",
          timeRequired: "30 minutes",
          difficulty: "easy" as const,
          category: "Personal",
          materials: ["Paper", "Pen"],
          steps: ["Find quiet space", "Reflect on memories", "Write from heart", "Present beautifully"],
          tips: ["Be specific about what you appreciate", "Include future hopes"],
          alternatives: ["Voice recording", "Digital note with photos"]
        }
      ];
    }
  }

  /**
   * Generate surprise ideas by category
   */
  static async generateByCategory(
    category: 'romantic' | 'friendship' | 'family' | 'professional',
    location?: string
  ): Promise<SurpriseIdea[]> {
    const categoryMap = {
      romantic: { occasion: 'date_night', relationship: 'partner' },
      friendship: { occasion: 'just_because', relationship: 'friend' },
      family: { occasion: 'birthday', relationship: 'family' },
      professional: { occasion: 'just_because', relationship: 'colleague' }
    };

    const config = categoryMap[category];
    const request: SurpriseRequest = {
      occasion: config.occasion as any,
      relationship: config.relationship as any,
      budget: 'medium',
      location
    };

    const response = await this.generateSurprises(request);
    return response.ideas;
  }

  /**
   * Generate seasonal surprise ideas
   */
  static async generateSeasonalSurprises(season: string, location?: string): Promise<SurpriseIdea[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Generate seasonal surprise ideas for ${season}. Consider weather, holidays, seasonal activities, and local traditions.`
          },
          {
            role: "user",
            content: `Generate 4 surprise ideas perfect for ${season}${location ? ` in ${location}` : ''}. Include seasonal activities, weather-appropriate options, and holiday tie-ins. Format as JSON array.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.ideas || [];
    } catch (error) {
      console.error("Failed to generate seasonal surprises:", error);
      return [];
    }
  }
}


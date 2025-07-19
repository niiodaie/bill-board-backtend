import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

export interface AdGenerationRequest {
  prompt: string;
  adType: 'banner' | 'video' | 'text' | 'interactive';
  targetAudience: string;
  industry: string;
  goal: 'awareness' | 'conversion' | 'engagement' | 'traffic';
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxury';
  language: string;
  location?: string;
}

export interface GeneratedAd {
  title: string;
  description: string;
  callToAction: string;
  keywords: string[];
  targetingTips: string[];
  estimatedPerformance: {
    clickThroughRate: number;
    engagementScore: number;
    conversionPotential: number;
  };
}

export async function generateAdvancedAd(request: AdGenerationRequest): Promise<GeneratedAd> {
  try {
    const systemPrompt = `You are an expert AI advertising strategist with deep knowledge of digital marketing, consumer psychology, and global advertising trends. 

Create compelling ad content that:
- Resonates with the target audience
- Aligns with the specified goal and tone
- Incorporates location-specific cultural nuances if provided
- Follows advertising best practices for the specified industry
- Optimizes for the chosen ad type and platform

Respond with JSON in this exact format:
{
  "title": "compelling headline (max 60 chars)",
  "description": "engaging description (max 150 chars)", 
  "callToAction": "action-oriented CTA (max 25 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "targetingTips": ["tip1", "tip2", "tip3"],
  "estimatedPerformance": {
    "clickThroughRate": 0.0,
    "engagementScore": 0.0,
    "conversionPotential": 0.0
  }
}`;

    const userPrompt = `Create a ${request.adType} ad for:
- Industry: ${request.industry}
- Target Audience: ${request.targetAudience}
- Goal: ${request.goal}
- Tone: ${request.tone}
- Language: ${request.language}
${request.location ? `- Location: ${request.location}` : ''}

User's creative brief: ${request.prompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "Your Ad Title",
      description: result.description || "Ad description",
      callToAction: result.callToAction || "Learn More",
      keywords: result.keywords || [],
      targetingTips: result.targetingTips || [],
      estimatedPerformance: {
        clickThroughRate: result.estimatedPerformance?.clickThroughRate || 2.5,
        engagementScore: result.estimatedPerformance?.engagementScore || 7.5,
        conversionPotential: result.estimatedPerformance?.conversionPotential || 6.0
      }
    };
  } catch (error) {
    throw new Error("Failed to generate advanced ad: " + (error as Error).message);
  }
}

export async function generateMultiLanguageAd(
  baseAd: GeneratedAd, 
  targetLanguages: string[]
): Promise<Record<string, GeneratedAd>> {
  const translations: Record<string, GeneratedAd> = {};
  
  for (const language of targetLanguages) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator and localization expert. Translate and culturally adapt the following ad content to ${language}. Maintain the marketing impact while ensuring cultural appropriateness.`
          },
          {
            role: "user",
            content: `Translate and adapt this ad to ${language}:
Title: ${baseAd.title}
Description: ${baseAd.description}
Call to Action: ${baseAd.callToAction}

Respond with JSON: {"title": "...", "description": "...", "callToAction": "..."}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const translated = JSON.parse(response.choices[0].message.content || "{}");
      
      translations[language] = {
        ...baseAd,
        title: translated.title || baseAd.title,
        description: translated.description || baseAd.description,
        callToAction: translated.callToAction || baseAd.callToAction
      };
    } catch (error) {
      console.error(`Translation failed for ${language}:`, error);
      translations[language] = baseAd; // Fallback to original
    }
  }
  
  return translations;
}

export async function optimizeAdForPlatform(
  ad: GeneratedAd,
  platform: 'billboard' | 'social' | 'search' | 'display'
): Promise<GeneratedAd> {
  try {
    const platformSpecs = {
      billboard: "Large format digital billboard - needs bold, readable text from distance, high contrast colors",
      social: "Social media feed - needs scroll-stopping visuals, conversational tone, hashtag-friendly",
      search: "Search engine results - needs keyword optimization, clear value proposition, action-oriented",
      display: "Display network - needs attention-grabbing visuals, clear branding, compelling offer"
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Optimize this ad for ${platform} platform. ${platformSpecs[platform]}. Maintain the core message while adapting format and style.`
        },
        {
          role: "user",
          content: `Original ad:
Title: ${ad.title}
Description: ${ad.description}
CTA: ${ad.callToAction}

Optimize for ${platform} while keeping the same JSON format.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const optimized = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      ...ad,
      title: optimized.title || ad.title,
      description: optimized.description || ad.description,
      callToAction: optimized.callToAction || ad.callToAction
    };
  } catch (error) {
    console.error("Platform optimization failed:", error);
    return ad; // Return original if optimization fails
  }
}

export async function generateAdVariations(
  baseAd: GeneratedAd,
  variationCount: number = 3
): Promise<GeneratedAd[]> {
  const variations: GeneratedAd[] = [];
  
  for (let i = 0; i < variationCount; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Create a variation of this ad that maintains the same core message but uses different wording, tone, or approach. Each variation should be unique and compelling."
          },
          {
            role: "user",
            content: `Create variation ${i + 1} of this ad:
Title: ${baseAd.title}
Description: ${baseAd.description}
CTA: ${baseAd.callToAction}

Use the same JSON format but with fresh, creative copy.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      const variation = JSON.parse(response.choices[0].message.content || "{}");
      
      variations.push({
        ...baseAd,
        title: variation.title || baseAd.title,
        description: variation.description || baseAd.description,
        callToAction: variation.callToAction || baseAd.callToAction
      });
    } catch (error) {
      console.error(`Failed to generate variation ${i + 1}:`, error);
      variations.push(baseAd); // Fallback to original
    }
  }
  
  return variations;
}

export async function analyzeAdPerformance(
  adContent: string,
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }
): Promise<{
  insights: string[];
  recommendations: string[];
  optimizationScore: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI marketing analyst. Analyze ad performance data and provide actionable insights and recommendations."
        },
        {
          role: "user",
          content: `Analyze this ad performance:
Ad Content: ${adContent}
Impressions: ${metrics.impressions}
Clicks: ${metrics.clicks}
Conversions: ${metrics.conversions}
Spend: $${metrics.spend}

CTR: ${((metrics.clicks / metrics.impressions) * 100).toFixed(2)}%
Conversion Rate: ${((metrics.conversions / metrics.clicks) * 100).toFixed(2)}%
CPC: $${(metrics.spend / metrics.clicks).toFixed(2)}

Provide insights, recommendations, and an optimization score (0-10) in JSON format:
{
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "optimizationScore": 0.0
}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      optimizationScore: analysis.optimizationScore || 5.0
    };
  } catch (error) {
    console.error("Performance analysis failed:", error);
    return {
      insights: ["Unable to analyze performance at this time"],
      recommendations: ["Please try again later"],
      optimizationScore: 5.0
    };
  }
}


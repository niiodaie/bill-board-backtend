import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export async function generateAdText(prompt: string, adType: string, goal: string): Promise<{
  title: string;
  description: string;
  callToAction: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert advertising copywriter. Create compelling ad copy for a ${adType} ad with the goal of ${goal}. Respond with JSON in this format: { "title": "string", "description": "string", "callToAction": "string" }`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      title: result.title || "Your Ad Title",
      description: result.description || "Ad description",
      callToAction: result.callToAction || "Learn More",
    };
  } catch (error) {
    throw new Error("Failed to generate ad text: " + (error as Error).message);
  }
}

export async function generateAdImage(prompt: string): Promise<{ url: string }> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a vibrant, eye-catching advertisement image: ${prompt}. The image should be suitable for digital billboard display with bold colors and clear visual hierarchy.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return { url: response.data[0].url || "" };
  } catch (error) {
    throw new Error("Failed to generate ad image: " + (error as Error).message);
  }
}

export async function enhanceAdPrompt(userPrompt: string, adType: string, targetAudience: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating detailed prompts for advertising content generation. Enhance the user's prompt to be more specific and effective for creating compelling ads.",
        },
        {
          role: "user",
          content: `Original prompt: "${userPrompt}"
Ad type: ${adType}
Target audience: ${targetAudience}

Please enhance this prompt to be more detailed and specific for generating effective advertising content.`,
        },
      ],
    });

    return response.choices[0].message.content || userPrompt;
  } catch (error) {
    console.error("Failed to enhance prompt:", error);
    return userPrompt; // Return original prompt if enhancement fails
  }
}

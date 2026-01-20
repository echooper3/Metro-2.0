
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// Safe access to the API key to prevent ReferenceErrors in browser environments
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

export interface FetchOptions {
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[] }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Please set API_KEY in your environment.");
      return { events: [], sources: [] };
    }

    const ai = new GoogleGenAI({ apiKey });
    const { category, startDate, endDate, keyword, page = 1 } = options;
    
    let prompt = `List 10 diverse upcoming events and activities.`;
    if (page > 1) {
      prompt = `List 10 *more* unique upcoming events and activities (different from the ones you previously suggested).`;
    }

    if (cityName !== 'All') {
      prompt += ` Specifically for ${cityName}.`;
    } else {
      prompt += ` Across Tulsa, Oklahoma City, Dallas, and Houston.`;
    }

    if (keyword) prompt += ` Searching for the keyword: "${keyword}".`;
    if (category && category !== 'All') prompt += ` Filtering for category: "${category}".`;
    if (startDate && endDate) {
      prompt += ` Occurring between ${startDate} and ${endDate}.`;
    } else if (startDate) {
      prompt += ` Occurring after ${startDate}.`;
    }

    prompt += ` 
    Include a mix of sports, family activities, entertainment, food & drink, night life, arts & culture, and outdoors.
    Provide the result as a structured list with title, category, description, date (if known), location, and cityName.
    Ensure categories map to: Trending, Sports, Family Activities, Entertainment, Visitor Activities, Food & Drink, Night Life, Arts & Culture, Outdoors, or Community.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              location: { type: Type.STRING },
              cityName: { type: Type.STRING }
            },
            required: ["title", "category", "description", "location"]
          }
        }
      },
    });

    const jsonStr = response.text.trim();
    const rawEvents = JSON.parse(jsonStr);
    const events: EventActivity[] = rawEvents.map((e: any, index: number) => ({
      ...e,
      id: `${cityName}-${index}-${Math.random().toString(36).substr(2, 9)}`
    }));

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    return { events, sources };
  } catch (error) {
    console.error("Error fetching events:", error);
    return { events: [], sources: [] };
  }
};

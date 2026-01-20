
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

const eventCache = new Map<string, { events: EventActivity[], sources: GroundingSource[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

// Track quota status globally to avoid redundant 429 triggers
let isQuotaExhausted = false;
let quotaResetTime = 0;

const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env.API_KEY) || '';
  } catch (e) {
    return '';
  }
};

const extractJson = (text: string) => {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0];
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export interface FetchOptions {
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  userLocation?: { latitude: number; longitude: number };
}

export const getQuotaStatus = () => ({
  isExhausted: isQuotaExhausted && Date.now() < quotaResetTime,
  remainingTime: Math.max(0, quotaResetTime - Date.now())
});

/**
 * Fetches events from Gemini. 
 * Detects 429 Quota Exhaustion and handles it gracefully.
 */
export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[] } | null> => {
  const { category, startDate, endDate, keyword, page = 1 } = options;
  const cacheKey = JSON.stringify({ cityName, category, startDate, endDate, keyword, page });

  // Check Quota Standby
  if (isQuotaExhausted && Date.now() < quotaResetTime) {
    console.warn("Inside The Metro: AI Sourcing in Standby Mode due to rate limits.");
    return null;
  }

  const cached = eventCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { events: cached.events, sources: cached.sources };
  }

  const apiKey = getApiKey();
  if (!apiKey) return null; 

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-3-flash-preview";
    
    let categoryConstraint = "";
    if (category && category !== 'All') {
      categoryConstraint = `ONLY include events that strictly fall under the category: "${category}".`;
    } else {
      categoryConstraint = `Include a diverse mix of all categories. Prioritize trending/popular events.`;
    }

    const prompt = `Act as a local event concierge for ${cityName}. 
    Provide 10 unique, real-world events happening in or near ${cityName} for Page ${page}.
    
    Constraints:
    - ${categoryConstraint}
    - Dates: ${startDate || 'Today'} to ${endDate || 'the next month'}.
    - Keyword: ${keyword || 'None'}
    
    Return a JSON array of objects with fields: title, category, description, date (MM/DD/YYYY), time, location, venue, cityName, sourceUrl, isTrending (boolean), lat, lng, ageRestriction.`;

    const response = await ai.models.generateContent({
      model: modelName,
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
              time: { type: Type.STRING },
              location: { type: Type.STRING },
              venue: { type: Type.STRING },
              cityName: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              isTrending: { type: Type.BOOLEAN },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              ageRestriction: { type: Type.STRING }
            },
            required: ["title", "category", "description", "location", "date", "lat", "lng"]
          }
        }
      },
    });

    const cleanJson = extractJson(response.text);
    const rawEvents = JSON.parse(cleanJson);
    
    const events: EventActivity[] = rawEvents.map((e: any, index: number) => ({
      ...e,
      id: `live-${cityName}-${page}-${index}-${Date.now()}`
    }));

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      });
    }

    const result = { events, sources };
    eventCache.set(cacheKey, { ...result, timestamp: Date.now() });
    
    // Clear standby if it was set
    isQuotaExhausted = false;
    
    return result;
  } catch (error: any) {
    // Handle 429 RESOURCE_EXHAUSTED
    if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
      console.error("Gemini API: Quota Exhausted. Entering standby mode.");
      isQuotaExhausted = true;
      // Set standby for 15 minutes or until next cycle
      quotaResetTime = Date.now() + (15 * 60 * 1000); 
    }
    return null;
  }
};

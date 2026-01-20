
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

const eventCache = new Map<string, { events: EventActivity[], sources: GroundingSource[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

const getApiKey = () => {
  try {
    // Check if process.env exists and has the key
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
  userLocation?: { latitude: number; longitude: number };
}

/**
 * Fetches events from Gemini. If API_KEY is missing or fetch fails, 
 * returns null to indicate that the caller should stick with seed data.
 */
export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[] } | null> => {
  const { category, startDate, endDate, keyword, page = 1 } = options;
  const cacheKey = JSON.stringify({ cityName, category, startDate, endDate, keyword, page });

  const cached = eventCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { events: cached.events, sources: cached.sources };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Inside The Metro: API_KEY is missing. Using pre-populated seed data only.");
    return null; 
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-3-flash-preview";
    
    const categoryInstruction = category === 'Sports' 
      ? `Include professional, collegiate, LOCAL HIGH SCHOOL (UIL/OSSAA), and YOUTH sports. Focus on actual game schedules for ${cityName}.` 
      : (category && category !== 'All' 
          ? `Filter for ${category}.` 
          : `Include High School/Youth sports, local festivals, and nightlife.`);

    const dateInstruction = (startDate || endDate) 
      ? `Range: ${startDate || 'today'} to ${endDate || 'future'}.` 
      : "Focus on the next 7-14 days.";

    const prompt = `Source 10 unique events in ${cityName} (Page ${page}).
    ${categoryInstruction}
    ${dateInstruction}
    ${keyword ? `Keyword: ${keyword}` : ""}

    MANDATORY: 
    - High School Sports (football/basketball/soccer) MUST be included in 'Sports' or 'All'.
    - Format: MM/DD/YYYY.
    - Output: JSON Array.
    - ageRestriction: "All Ages", "21+", "18+".
    - isTrending: true for popular/rivalry games.
    - Category must match: Sports, Family Activities, Entertainment, Food & Drink, Night Life, Arts & Culture, Outdoors, Community.`;

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
            required: ["title", "category", "description", "location", "date", "lat", "lng", "ageRestriction"]
          }
        }
      },
    });

    const jsonStr = response.text.trim();
    const rawEvents = JSON.parse(jsonStr);
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
    return result;
  } catch (error) {
    console.error("Gemini Sourcing Error:", error);
    return null; // Return null so UI knows to keep the seed data
  }
};

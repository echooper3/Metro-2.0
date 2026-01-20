
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// In-memory cache for instant navigation
const eventCache = new Map<string, { events: EventActivity[], sources: GroundingSource[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

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
  userLocation?: { latitude: number; longitude: number };
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[] }> => {
  const { category, startDate, endDate, keyword, page = 1 } = options;
  const cacheKey = JSON.stringify({ cityName, category, startDate, endDate, keyword, page });

  const cached = eventCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { events: cached.events, sources: cached.sources };
  }

  try {
    const apiKey = getApiKey();
    if (!apiKey) return { events: [], sources: [] };

    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-3-flash-preview";
    
    // Explicitly include High School and Youth Sports in the Sports category
    const categoryInstruction = category === 'Sports' 
      ? `Include professional, collegiate, LOCAL HIGH SCHOOL, and YOUTH sports (football, basketball, soccer, baseball). Focus on game schedules for schools in ${cityName}.` 
      : (category && category !== 'All' 
          ? `Strictly filter for ${category}.` 
          : `Diverse mix: local festivals, High School/Youth sports, arts, and nightlife.`);

    const dateInstruction = (startDate || endDate) 
      ? `Dates: ${startDate || 'today'} to ${endDate || 'future'}.` 
      : "Upcoming this week/month.";

    const prompt = `Find 10 unique local events for ${cityName} (Page ${page}).
    ${categoryInstruction}
    ${dateInstruction}
    ${keyword ? `Keyword: ${keyword}` : ""}

    MANDATORY: 
    - If category is Sports, include High School (UIL/OSSAN) and Youth athletic events.
    - Format: MM/DD/YYYY.
    - JSON Array only.
    - ageRestriction: "All Ages", "21+", "18+".
    - isTrending: true for popular picks.
    - Include lat/lng for mapping.
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
      id: `${cityName}-${page}-${index}-${Date.now()}`
    }));

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      });
    }

    eventCache.set(cacheKey, { events, sources, timestamp: Date.now() });
    return { events, sources };
  } catch (error) {
    console.error("Fetch error:", error);
    return { events: [], sources: [] };
  }
};

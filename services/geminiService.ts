import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource, Category } from "../types";

const CACHE_KEY_PREFIX = "itm_cache_v8_";

const extractJson = (text: string) => {
  if (!text) return "[]";
  const startIdx = text.indexOf('[');
  const endIdx = text.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }
  return text.trim();
};

const getPersistentCache = (key: string) => {
  const item = localStorage.getItem(CACHE_KEY_PREFIX + key);
  if (!item) return null;
  try { return JSON.parse(item); } catch (e) { localStorage.removeItem(CACHE_KEY_PREFIX + key); }
  return null;
};

const setPersistentCache = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_KEY_PREFIX)) localStorage.removeItem(k);
    });
  }
};

export interface FetchOptions {
  category?: string;
  keyword?: string;
  page?: number;
  forceRefresh?: boolean;
}

export const getCacheKey = (cityName: string | 'All', options: FetchOptions = {}) => {
  const { category, keyword, page } = options;
  return btoa(JSON.stringify({ cityName, category, keyword, page }));
};

export const getCachedData = (key: string) => {
  const cached = getPersistentCache(key);
  return cached ? cached.data : null;
};

async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean) {
  const { category, keyword } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";
  
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Explicitly prioritize youth and high school sports schedules
  const categoryContext = category === 'Sports' 
    ? 'Category: Sports (CRITICAL: Include schedules for Local High School Varsity games, Youth Tournaments, and Club Sports alongside Professional teams)' 
    : (category && category !== 'All' ? `Category: ${category}` : '');

  const prompt = `REAL-TIME SOURCE: Find 10 upcoming events and schedules in ${cityName === 'All' ? 'Tulsa, OKC, Dallas, Houston' : cityName}. 
  Today: ${currentDateStr}.
  Source priority: MaxPreps, School District Calendars (TPS, OKCPD, DISD, HISD), Ticketmaster, Eventbrite.
  ${categoryContext}
  ${keyword ? `Keyword: ${keyword}` : ''}
  Return JSON: [{title, category, description, date(MM/DD/YYYY), time, venue, location, cityName, sourceUrl, imageUrl, price, isFree, organizerName, organizerUrl, organizerContact}].
  STRICT: Normalize "cityName" to Tulsa|Oklahoma City|Dallas|Houston. For HS sports, "organizerName" should be the school name.`;

  const config: any = {
    responseMimeType: "application/json",
    systemInstruction: `You are the high-speed event engine for Inside The Metro. 
    Accuracy and Speed are 10/10 priority. 
    When sourcing "Sports", you MUST include local high school athletic schedules (Football, Basketball, Baseball) and youth competitive tournaments. Use MaxPreps and district sites as primary sources.
    Normalize city names to: Tulsa, Oklahoma City, Dallas, Houston.`,
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
          venue: { type: Type.STRING },
          location: { type: Type.STRING },
          cityName: { type: Type.STRING },
          sourceUrl: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
          price: { type: Type.STRING },
          isFree: { type: Type.BOOLEAN },
          organizerName: { type: Type.STRING },
          organizerUrl: { type: Type.STRING },
          organizerContact: { type: Type.STRING }
        },
        required: ["title", "category", "description", "date", "cityName", "venue"]
      }
    }
  };

  if (useGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config
  });

  const rawEvents = JSON.parse(extractJson(response.text || "[]"));
  
  const events: EventActivity[] = rawEvents.map((e: any, index: number) => ({
    ...e,
    id: `live-${Date.now()}-${index}`
  }));

  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    });
  }

  return { events, sources };
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}) => {
  const cacheKey = getCacheKey(cityName, options);
  
  try {
    const result = await queryGemini(cityName, options, true);
    const finalResult = { ...result, status: result.sources.length > 0 ? 'grounded' : 'ai' };
    setPersistentCache(cacheKey, finalResult);
    return finalResult;
  } catch (error) {
    try {
      const result = await queryGemini(cityName, options, false);
      return { ...result, status: 'ai' };
    } catch (e) {
      return null;
    }
  }
};

export const searchPlaces = async (input: string) => {
  if (input.length < 3) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find 5 major venues or high school stadiums for: "${input}" in Tulsa, OKC, Dallas or Houston. JSON: [{name, address, lat, lng}].`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(extractJson(response.text || "[]"));
};

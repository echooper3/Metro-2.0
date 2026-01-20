
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// Persistent Cache Configuration
const CACHE_KEY_PREFIX = "itm_cache_";
const CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

// Track quota status globally
let isGroundedQuotaExhausted = false;
let isGlobalQuotaExhausted = false;
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

const getPersistentCache = (key: string) => {
  const item = localStorage.getItem(CACHE_KEY_PREFIX + key);
  if (!item) return null;
  try {
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.data;
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  } catch (e) {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  }
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
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  userLocation?: { latitude: number; longitude: number };
  forceRefresh?: boolean;
}

export const getQuotaStatus = () => ({
  isGroundedExhausted: isGroundedQuotaExhausted,
  isGlobalExhausted: isGlobalQuotaExhausted && Date.now() < quotaResetTime,
  resetTime: quotaResetTime
});

export const resetQuotaStandby = () => {
  isGroundedQuotaExhausted = false;
  isGlobalQuotaExhausted = false;
  quotaResetTime = 0;
};

/**
 * Internal helper to call Gemini with or without tools
 */
async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean) {
  const { category, startDate, endDate, keyword, page = 1 } = options;
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-flash-preview";
  
  let categoryConstraint = (category && category !== 'All') 
    ? `ONLY include events that strictly fall under the category: "${category}".` 
    : `Include a diverse mix of all categories.`;

  const currentDateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = `Act as a local event concierge for ${cityName}. 
  Provide 10 unique, REAL-WORLD events happening in or near ${cityName} for Page ${page}.
  
  URGENT PRIORITY: 
  - Today is ${currentDateStr}. 
  - Prioritize events happening TODAY and THIS WEEKEND.
  - DO NOT include events from the past.
  
  Constraints:
  - ${categoryConstraint}
  - Range: ${startDate || 'Today'} to ${endDate || '30 days from now'}.
  - Keyword: ${keyword || 'None'}
  
  Return a JSON array of objects with fields: title, category, description, date (MM/DD/YYYY), time, location, venue, cityName, sourceUrl, isTrending (boolean), lat, lng, ageRestriction.`;

  const config: any = {
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
  };

  // Only add search grounding if requested and not already known to be exhausted
  if (useGrounding && !isGroundedQuotaExhausted) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config
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

  return { events, sources, isGrounded: !!chunks };
}

/**
 * Fetches events with an intelligent multi-stage retry/fallback
 */
export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[], status: 'grounded' | 'ai' } | null> => {
  const { forceRefresh = false } = options;
  const cacheKey = btoa(JSON.stringify({ cityName, ...options, forceRefresh: false }));

  // 1. Check Global Rate Limit
  if (isGlobalQuotaExhausted && Date.now() < quotaResetTime && !forceRefresh) {
    return null;
  }

  // 2. Persistent Cache
  if (!forceRefresh) {
    const cached = getPersistentCache(cacheKey);
    if (cached) return { ...cached, status: cached.sources?.length > 0 ? 'grounded' : 'ai' };
  }

  // 3. ATTEMPT 1: Grounded Search (The Gold Standard)
  try {
    const result = await queryGemini(cityName, options, true);
    setPersistentCache(cacheKey, result);
    return { ...result, status: 'grounded' };
  } catch (error: any) {
    const errorMsg = error?.message || "";
    
    // If it's a 429, handle specifically
    if (errorMsg.includes('429') || error?.status === 429) {
      console.warn("Gemini Search Quota Exhausted. Attempting AI Knowledge fallback...");
      isGroundedQuotaExhausted = true;
      
      // 4. ATTEMPT 2: Fallback to Pure AI (No Search Tool)
      try {
        const fallbackResult = await queryGemini(cityName, options, false);
        setPersistentCache(cacheKey, fallbackResult);
        return { ...fallbackResult, status: 'ai' };
      } catch (fallbackError: any) {
        // Both failed -> Global Rate Limit hit
        console.error("Gemini Global Quota Exhausted.");
        isGlobalQuotaExhausted = true;
        quotaResetTime = Date.now() + (30 * 60 * 1000); 
        return null;
      }
    }
    return null;
  }
};

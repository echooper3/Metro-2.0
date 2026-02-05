
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource, Category } from "../types";

const CACHE_KEY_PREFIX = "itm_cache_v11_";
const activeRequests = new Map<string, AbortController>();

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
  excludeTitles?: string[];
}

export const getCacheKey = (cityName: string | 'All', options: FetchOptions = {}) => {
  const { category, keyword, page = 1 } = options;
  return btoa(JSON.stringify({ cityName, category, keyword, page }));
};

export const getCachedData = (key: string) => {
  const cached = getPersistentCache(key);
  return cached ? cached.data : null;
};

async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean) {
  const { category, keyword, page = 1, excludeTitles = [] } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";
  
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  let categoryContext = '';
  if (category && category !== 'All') {
    categoryContext = `Return ONLY events for Category: "${category}".`;
  }

  const prompt = `SEARCH AND LIST: Find 10 upcoming events for ${cityName === 'All' ? 'Tulsa, OKC, Dallas, and Houston' : cityName}. 
  Today: ${currentDateStr}.
  Exclusion List: [${excludeTitles.join(', ')}]
  ${categoryContext}
  ${keyword ? `Keyword: "${keyword}"` : ''}
  Return JSON: [{title, category, description, date(MM/DD/YYYY), time, venue, location, cityName, sourceUrl, imageUrl, price, isFree, organizerName, organizerUrl}]`;

  const config: any = {
    responseMimeType: "application/json",
    systemInstruction: "You are a local event expert. Accuracy is 10/10 priority. Normalize city names to Tulsa, Oklahoma City, Dallas, Houston.",
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
          organizerUrl: { type: Type.STRING }
        },
        required: ["title", "category", "description", "date", "cityName", "venue", "sourceUrl"]
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
  const uniqueEvents: EventActivity[] = [];
  const seenTitles = new Set(excludeTitles.map(t => t.toLowerCase()));

  rawEvents.forEach((e: any, index: number) => {
    const titleKey = e.title.toLowerCase();
    if (!seenTitles.has(titleKey)) {
      uniqueEvents.push({ ...e, id: `live-${Date.now()}-${index}-${page}` });
      seenTitles.add(titleKey);
    }
  });

  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    });
  }

  return { events: uniqueEvents, sources };
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}) => {
  const cacheKey = getCacheKey(cityName, options);
  
  if (activeRequests.has(cacheKey)) {
    activeRequests.get(cacheKey)?.abort();
    activeRequests.delete(cacheKey);
  }

  const controller = new AbortController();
  activeRequests.set(cacheKey, controller);

  try {
    const result = await queryGemini(cityName, options, true);
    const finalResult = { ...result, status: result.sources.length > 0 ? 'grounded' : 'ai' };
    if (finalResult.events.length > 0) setPersistentCache(cacheKey, finalResult);
    activeRequests.delete(cacheKey);
    return finalResult;
  } catch (error: any) {
    if (error.name === 'AbortError') return null;
    
    // Check for API Limit/Quota Errors
    const isLimitError = error.message?.includes('429') || error.message?.includes('403') || error.message?.toLowerCase().includes('quota');
    if (isLimitError) {
      console.warn("Gemini API Limit reached. Switching to localized seed engine.");
      return { events: [], sources: [], status: 'quota-limited' };
    }

    try {
      const result = await queryGemini(cityName, options, false);
      activeRequests.delete(cacheKey);
      return { ...result, status: 'ai' };
    } catch (e) {
      activeRequests.delete(cacheKey);
      return null;
    }
  }
};

export const searchPlaces = async (input: string) => {
  if (input.length < 3) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Venues in Tulsa, OKC, Dallas or Houston: "${input}". JSON: [{name, address, lat, lng}].`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(extractJson(response.text || "[]"));
  } catch (e) { return []; }
};

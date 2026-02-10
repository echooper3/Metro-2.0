
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource, Category } from "../types";

const CACHE_KEY_PREFIX = "itm_cache_v15_";
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
  try { 
    const parsed = JSON.parse(item);
    const expiry = parsed.cityName === 'All' ? 7200000 : 3600000; // Longer cache for landing
    if (Date.now() - parsed.timestamp > expiry) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return parsed; 
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
    // Eviction policy: remove oldest half of cache if storage is full
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.sort((a, b) => {
      const aT = JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
      const bT = JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
      return aT - bT;
    });
    keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
  }
};

export interface FetchOptions {
  category?: string;
  keyword?: string;
  page?: number;
  forceRefresh?: boolean;
  excludeTitles?: string[];
  fastSync?: boolean; 
}

export const getCacheKey = (cityName: string | 'All', options: FetchOptions = {}) => {
  const { category, keyword, page = 1, fastSync } = options;
  return btoa(JSON.stringify({ cityName, category, keyword, page, fastSync }));
};

export const getCachedData = (key: string) => {
  const cached = getPersistentCache(key);
  return cached ? cached.data : null;
};

async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean, signal?: AbortSignal) {
  const { category, keyword, page = 1 } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";
  
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Streamlined prompt to reduce token count and speed up generation
  let context = `Today: ${currentDateStr}. Location: ${cityName === 'All' ? 'Tulsa, OKC, Dallas, Houston' : cityName}. List REAL future events.`;
  if (category && category !== 'All') context += ` Cat: ${category}.`;
  if (keyword) context += ` Search: ${keyword}.`;

  const config: any = {
    responseMimeType: "application/json",
    systemInstruction: "JSON ONLY. No markdown. No text outside array. Valid JSON schema. Identify age restrictions (e.g., 21+, All Ages).",
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
          ageRestriction: { type: Type.STRING, description: "Age requirement for the event, e.g., 21+, 18+, All Ages" }
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
    contents: context,
    config
  });

  if (signal?.aborted) throw new Error('AbortError');

  const rawEvents = JSON.parse(extractJson(response.text || "[]"));
  const processedEvents: EventActivity[] = rawEvents.map((e: any, index: number) => ({
    ...e,
    id: `live-${Date.now()}-${index}-${page}`,
    isLive: true,
    isTrending: index < 2,
    isVerified: useGrounding
  }));

  const sources: GroundingSource[] = [];
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    });
  }

  return { events: processedEvents, sources };
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}) => {
  const cacheKey = getCacheKey(cityName, options);
  
  if (activeRequests.has(cacheKey)) {
    activeRequests.get(cacheKey)?.abort();
  }

  const controller = new AbortController();
  activeRequests.set(cacheKey, controller);

  try {
    const useGrounding = !options.fastSync;
    const result = await queryGemini(cityName, options, useGrounding, controller.signal);
    
    let status: any = 'ai';
    if (options.fastSync) status = 'live';
    else if (result.sources.length > 0) status = 'grounded';

    const finalResult = { ...result, status };
    if (finalResult.events.length > 0) setPersistentCache(cacheKey, finalResult);
    
    activeRequests.delete(cacheKey);
    return finalResult;
  } catch (error: any) {
    activeRequests.delete(cacheKey);
    return null;
  }
};

let venueAbortController: AbortController | null = null;

export const searchPlaces = async (input: string) => {
  if (input.length < 3) return [];
  
  // Performance: Cancel previous search if user is still typing
  if (venueAbortController) venueAbortController.abort();
  venueAbortController = new AbortController();

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Venue lookup OK/TX: "${input}". Return JSON: [{name, address, lat, lng}]. Limit 5.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(extractJson(response.text || "[]"));
  } catch (e) { 
    return []; 
  }
};


import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { EventActivity, GroundingSource, Category } from "../types";

const CACHE_KEY_PREFIX = "itm_cache_v15_";
let globalFetchController: AbortController | null = null;

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean, signal?: AbortSignal) {
  const { category, keyword, page = 1 } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = "gemini-3-flash-preview";
  
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Streamlined prompt to reduce token count and speed up generation
  let context = `Today: ${currentDateStr}. Location: ${cityName === 'All' ? 'Tulsa, OKC, Dallas, Houston' : cityName}. List at least 12 REAL future events.
  CRITICAL: The "cityName" field MUST be exactly one of: "Tulsa", "Oklahoma City", "Dallas", or "Houston".`;
  if (category && category !== 'All') context += ` Cat: ${category}.`;
  if (keyword) context += ` Search: ${keyword}.`;
  if (page > 1) context += ` This is page ${page} of results. Provide completely different events from typical top results.`;
  if (options.excludeTitles && options.excludeTitles.length > 0) {
    context += ` DO NOT include these events: ${options.excludeTitles.slice(-20).join(', ')}.`;
  }

  const config: any = {
    responseMimeType: "application/json",
    systemInstruction: "JSON ARRAY ONLY. Valid JSON. Identify age restrictions and extract event organizer info. Ensure events are REAL and upcoming.",
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
          ageRestriction: { type: Type.STRING },
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

  let lastError: any = null;
  const maxRetries = 5;
  
  for (let i = 0; i < maxRetries; i++) {
    if (signal?.aborted) throw new Error('AbortError');
    
    try {
      // If we're on the last retry, simplify the prompt significantly
      const finalContext = i === maxRetries - 1 ? 
        `List 5 real upcoming events in ${cityName === 'All' ? 'Tulsa/OKC/Dallas/Houston' : cityName}. JSON ONLY.` : 
        context;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: finalContext,
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
    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError' || error.message === 'AbortError') {
        throw new Error('AbortError');
      }
      
      lastError = error;
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.includes('RESOURCE_EXHAUSTED') ||
                           error.status === 'RESOURCE_EXHAUSTED' ||
                           error.code === 429;

      if (isQuotaError && i < maxRetries - 1) {
        // Exponential backoff with jitter: (2^i * 3000ms) + random(0-2000ms)
        const waitTime = (Math.pow(2, i) * 3000) + (Math.random() * 2000);
        console.warn(`Gemini Quota Exceeded. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      
      // For other errors, retry at least once after a short delay
      if (i < 1) {
        await delay(1000);
        continue;
      }
      
      // If we're on the last retry, try without grounding as a last resort
      if (i === maxRetries - 2 && useGrounding) {
        console.warn("Last retry: falling back to non-grounding.");
        return queryGemini(cityName, { ...options, fastSync: true }, false, signal);
      }
      
      throw error;
    }
  }
  throw lastError;
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}) => {
  const cacheKey = getCacheKey(cityName, options);
  
  // Cancel ANY previous fetchEvents request to avoid overlapping quota usage
  if (globalFetchController) {
    globalFetchController.abort();
  }
  globalFetchController = new AbortController();
  const signal = globalFetchController.signal;

  try {
    const useGrounding = !options.fastSync;
    let result = await queryGemini(cityName, options, useGrounding, signal);
    
    // Fallback: If grounding returned nothing, try without grounding
    if ((!result || result.events.length === 0) && useGrounding) {
      if (signal.aborted) throw new Error('AbortError');
      console.warn("Grounding returned no events, falling back to AI generation.");
      result = await queryGemini(cityName, { ...options, fastSync: true }, false, signal);
    }

    if (!result) return null;

    let status: any = 'ai';
    if (options.fastSync) status = 'live';
    else if (result.sources.length > 0) status = 'grounded';

    const finalResult = { ...result, status };
    if (finalResult.events.length > 0 && (!options.page || options.page === 1)) {
      setPersistentCache(cacheKey, finalResult);
    }
    
    return finalResult;
  } catch (error: any) {
    if (error.message === 'AbortError') {
      // Silent ignore for intentional cancellations
      return null;
    }
    console.error("Gemini Fetch Error:", error);
    return null;
  } finally {
    if (globalFetchController?.signal === signal) {
      globalFetchController = null;
    }
  }
};

let venueAbortController: AbortController | null = null;

export const searchPlaces = async (input: string) => {
  if (input.length < 3) return [];
  
  // Performance: Cancel previous search if user is still typing
  if (venueAbortController) venueAbortController.abort();
  venueAbortController = new AbortController();

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Venue lookup OK/TX: "${input}". Return JSON: [{name, address, lat, lng}]. Limit 5.`,
      config: { 
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json" 
      }
    });
    return JSON.parse(extractJson(response.text || "[]"));
  } catch (e) { 
    return []; 
  }
};

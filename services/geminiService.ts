
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// Persistent Cache Configuration
const CACHE_KEY_PREFIX = "itm_cache_v2_";
const VENUE_CACHE_KEY = "itm_venue_cache";

// Local Directory for Instant Autocomplete (Tulsa, OKC, Dallas, Houston staples)
const LOCAL_DIRECTORY = [
    { name: "BOK Center", address: "200 S Denver Ave, Tulsa, OK 74103", lat: 36.153, lng: -95.993 },
    { name: "Cains Ballroom", address: "423 N Main St, Tulsa, OK 74103", lat: 36.160, lng: -95.992 },
    { name: "Paycom Center", address: "100 W Reno Ave, Oklahoma City, OK 73102", lat: 35.463, lng: -97.515 },
    { name: "Scissortail Park", address: "300 SW 7th St, Oklahoma City, OK 73109", lat: 35.460, lng: -97.518 },
    { name: "American Airlines Center", address: "2500 Victory Ave, Dallas, TX 75219", lat: 32.790, lng: -96.810 },
    { name: "Klyde Warren Park", address: "2012 Woodall Rodgers Fwy, Dallas, TX 75201", lat: 32.789, lng: -96.801 },
    { name: "Minute Maid Park", address: "501 Crawford St, Houston, TX 77002", lat: 29.757, lng: -95.355 },
    { name: "Discovery Green", address: "1500 McKinney St, Houston, TX 77010", lat: 29.753, lng: -95.359 }
];

let groundedQuotaExhaustedUntil = 0;
let globalQuotaExhaustedUntil = 0;

const extractJson = (text: string) => {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0];
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
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
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  userLocation?: { latitude: number; longitude: number };
  forceRefresh?: boolean;
}

export const getQuotaStatus = () => {
  const now = Date.now();
  return {
    isGroundedExhausted: groundedQuotaExhaustedUntil > now,
    isGlobalExhausted: globalQuotaExhaustedUntil > now
  };
};

export const resetQuotaStandby = () => {
  groundedQuotaExhaustedUntil = 0;
  globalQuotaExhaustedUntil = 0;
};

export const getCacheKey = (cityName: string | 'All', options: FetchOptions = {}) => {
  const { category, keyword, page } = options;
  return btoa(JSON.stringify({ cityName, category, keyword, page }));
};

export const getCachedData = (key: string) => {
  const cached = getPersistentCache(key);
  return cached ? cached.data : null;
};

async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean) {
  const { category, keyword, page = 1 } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";
  const currentDateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = `Act as a local event concierge for ${cityName}. Find 8-10 REAL upcoming events.
  Current Date: ${currentDateStr}. Page: ${page}.
  Filters: Category: "${category || 'All'}". ${keyword ? `Keywords: "${keyword}"` : ''}
  Return a valid JSON array matching the schema: title, category, description, date (MM/DD/YYYY), time, location, venue, cityName, sourceUrl, imageUrl, lat, lng, price, isFree.`;

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
          imageUrl: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          price: { type: Type.STRING },
          isFree: { type: Type.BOOLEAN }
        },
        required: ["title", "category", "description", "location", "date"]
      }
    }
  };

  if (useGrounding && groundedQuotaExhaustedUntil < Date.now()) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config
  });

  const rawEvents = JSON.parse(extractJson(response.text));
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

  return { events, sources };
}

export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[], status: string } | null> => {
  const cacheKey = getCacheKey(cityName, options);
  const now = Date.now();

  if (globalQuotaExhaustedUntil > now && !options.forceRefresh) {
    const cached = getPersistentCache(cacheKey);
    return cached ? { ...cached.data, status: 'cache' } : null;
  }

  try {
    const isSearchDisabled = groundedQuotaExhaustedUntil > now;
    const result = await queryGemini(cityName, options, !isSearchDisabled);
    const finalResult = { ...result, status: (result.sources.length > 0 ? 'grounded' : 'ai') };
    setPersistentCache(cacheKey, finalResult);
    return finalResult;
  } catch (error: any) {
    if (error?.status === 429) {
        if (error?.message?.includes('Search')) groundedQuotaExhaustedUntil = now + (10 * 60 * 1000);
        else globalQuotaExhaustedUntil = now + (5 * 60 * 1000);
    }
    const cached = getPersistentCache(cacheKey);
    return cached ? { ...cached.data, status: 'cache' } : null;
  }
};

export const searchPlaces = async (input: string): Promise<Array<{ name: string; address: string; lat: number; lng: number }>> => {
  if (input.length < 2) return [];

  // 1. INSTANT LOCAL CHECK (Makes autocomplete feel zero-lag)
  const localMatches = LOCAL_DIRECTORY.filter(v => 
    v.name.toLowerCase().includes(input.toLowerCase()) || 
    v.address.toLowerCase().includes(input.toLowerCase())
  );
  if (localMatches.length > 0 && input.length < 6) return localMatches;

  // 2. API CHECK (For specific addresses)
  if (globalQuotaExhaustedUntil > Date.now()) return localMatches;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Identify top 5 locations for: "${input}" in Tulsa, OKC, Dallas or Houston. Return JSON: [{name, address, lat, lng}].`,
      config: { responseMimeType: "application/json" }
    });
    const results = JSON.parse(extractJson(response.text || "[]"));
    return [...localMatches, ...results].slice(0, 5);
  } catch (error) {
    return localMatches;
  }
};

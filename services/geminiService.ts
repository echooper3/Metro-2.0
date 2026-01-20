
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// In-memory cache for ultra-fast navigation between pages/cities
const eventCache = new Map<string, { events: EventActivity[], sources: GroundingSource[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes cache life

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
  const { category, startDate, endDate, keyword, page = 1, userLocation } = options;
  const cacheKey = JSON.stringify({ cityName, category, startDate, endDate, keyword, page });

  // Return from cache if available and fresh for speed
  const cached = eventCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { events: cached.events, sources: cached.sources };
  }

  try {
    const apiKey = getApiKey();
    if (!apiKey) return { events: [], sources: [] };

    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-3-flash-preview";
    
    let categoryInstruction = "";
    if (category && category !== 'All') {
      categoryInstruction = `CRITICAL: Only return events that strictly belong to the "${category}" category.`;
    } else {
      categoryInstruction = `Return a diverse mix of events across all categories (Sports, Family, Food, etc.). Identify the most popular/trending ones and mark them as isTrending: true. List trending events at the beginning of the array.`;
    }

    let dateInstruction = "";
    if (startDate || endDate) {
      dateInstruction = `Only include events occurring ${startDate ? `after ${startDate}` : ''} ${endDate ? `and before ${endDate}` : ''}.`;
    }

    let keywordInstruction = keyword ? `The events must relate to the following keyword: "${keyword}".` : "";

    let prompt = `Find 10 events for ${cityName}. 
    INTEGRATE GOOGLE TRENDS: Use search data to prioritize what is popular "Inside the metro" right now.
    
    ${categoryInstruction}
    ${dateInstruction}
    ${keywordInstruction}
    
    ${page > 1 ? `List 10 *more* unique events (page ${page}).` : ""}

    MANDATORY NICHE TARGETS FOR EACH CATEGORY:
    - COMMUNITY: networking, entrepreneurship, social gatherings, product launches.
    - OUTDOORS: kayaking, mountain climbing, trails, trail runs, walking trails, running trails, rafting, white water rafting, caves & lakes, waterfalls, National parks, beaches, zip lining, rock climbing, cliffs, hills, forests, islands, wildlife attractions, landscapes.
    - VISITOR ATTRACTIONS: golf courses, amusement parks, water parks, museums, festivals and fairs, music halls, national parks, historical landmarks, religious sites, shopping districts, Place of worship, culinary classes, heritage attractions, exhibitions, petting animals, zoo, aquariums, casinos, haunted houses, theme parks, concert hall & theatre.
    - NIGHT LIFE: Cigar bars, speakeasies, karaoke, dance classes.
    - SPORTS: Pro/Collegiate/Youth Soccer, Body Building, Wrestling, Baseball, Rugby, Lacrosse, etc.
    - FOOD & DRINK: Soul Food, Italian, Seafood, BBQ, Breweries.

    RULES:
    1. DATE: MUST be MM/DD/YYYY.
    2. TIME: Include time (e.g., 07:00 PM). If not listed, infer from description.
    3. VENUE: Identify specific venue or district name.
    4. COORDINATES: Provide accurate latitude and longitude for the venue.
    5. AGE RESTRICTION: Identify if the event has age limits (e.g., "All Ages", "21+", "18+"). If unsure, default to "All Ages".
    6. NO "Trending" category label. Map to the specific categories provided.

    Return as JSON array: title, category, description, date (MM/DD/YYYY), time, location, venue, cityName, sourceUrl, isTrending (boolean), lat (number), lng (number), ageRestriction (string).`;

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
              date: { type: Type.STRING, description: "Format: MM/DD/YYYY" },
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

    const jsonStr = response.text.trim();
    const rawEvents = JSON.parse(jsonStr);
    const events: EventActivity[] = rawEvents.map((e: any, index: number) => ({
      ...e,
      id: `${cityName}-${index}-${Math.random().toString(36).substr(2, 6)}`
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

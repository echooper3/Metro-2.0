import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';
import { EventActivity } from '../types';
import { parseEventDate, toInputDateFormat } from '../utils/dateUtils';

export interface ScrapedEventDraft {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  endTime?: string;
  venue: string;
  location: string;
  cityName: string;
  price?: string;
  isFree?: boolean;
  imageUrl?: string;
  sourceUrl: string;
  confidence?: number;
  rawDetails?: string;
}

export interface ScraperSourceConfig {
  id: string;
  name: string;
  url: string;
  cityName: string;
  category: string;
  enabled: boolean;
  lastCrawled?: string;
  eventsFound?: number;
}

export const DEFAULT_CRAWLER_SOURCES: ScraperSourceConfig[] = [
  {
    id: 'cains-tulsa',
    name: "Cain's Ballroom (Tulsa)",
    url: 'https://www.cainsballroom.com/events/',
    cityName: 'Tulsa',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: 'tulsago-events',
    name: 'TulsaGo Community & Festivals',
    url: 'https://www.tulsago.com/events',
    cityName: 'Tulsa',
    category: 'Community',
    enabled: true
  },
  {
    id: 'bok-center-tulsa',
    name: 'BOK Center Arena',
    url: 'https://www.bokcenter.com/events',
    cityName: 'Tulsa',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: 'paycom-okc',
    name: 'Paycom Center (OKC)',
    url: 'https://www.paycomcenter.com/events',
    cityName: 'Oklahoma City',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: 'bricktown-okc',
    name: 'Bricktown Entertainment District (OKC)',
    url: 'https://www.bricktownokc.com/events',
    cityName: 'Oklahoma City',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: 'aac-dallas',
    name: 'American Airlines Center (Dallas)',
    url: 'https://www.americanairlinescenter.com/events',
    cityName: 'Dallas',
    category: 'Sports',
    enabled: true
  },
  {
    id: 'hob-dallas',
    name: 'House of Blues (Dallas)',
    url: 'https://www.houseofblues.com/dallas/concert-events',
    cityName: 'Dallas',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: 'toyota-houston',
    name: 'Toyota Center (Houston)',
    url: 'https://www.toyotacenter.com/events',
    cityName: 'Houston',
    category: 'Entertainment',
    enabled: true
  },
  {
    id: '365-houston',
    name: '365 Things in Houston Calendar',
    url: 'https://365thingsinhouston.com/calendar/',
    cityName: 'Houston',
    category: 'Community',
    enabled: true
  }
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache'
};

/**
 * Normalizes city names. If the city is unknown, unrecognized, or online, returns an empty string ("")
 * so the admin can fill in the correct city name.
 */
export const sanitizeScrapedCity = (cityCandidate?: string): string => {
  if (!cityCandidate || typeof cityCandidate !== 'string') return '';
  const trimmed = cityCandidate.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === 'unknown' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'online' ||
    lower === 'virtual' ||
    lower === 'tbd'
  ) {
    return '';
  }
  return trimmed;
};

/**
 * Safely parses JSON strings, removing markdown code fences or surrounding text if present.
 * Prevents "Unexpected token" errors.
 */
export const safelyParseJson = <T>(raw: string | undefined | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    clean = clean.trim();

    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = clean.lastIndexOf(']');
      if (lastBracket !== -1) {
        clean = clean.slice(firstBracket, lastBracket + 1);
      }
    } else if (firstBrace !== -1) {
      const lastBrace = clean.lastIndexOf('}');
      if (lastBrace !== -1) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }
    }

    return JSON.parse(clean);
  } catch (e) {
    console.warn('safelyParseJson fallback triggered:', e);
    return fallback;
  }
};

/**
 * Extracts event metadata from an individual webpage URL using Cheerio + Gemini AI.
 */
export const extractEventFromUrl = async (targetUrl: string): Promise<ScrapedEventDraft> => {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('Please provide a valid web URL starting with http:// or https://');
  }

  // 1. Fetch webpage HTML
  const response = await fetch(targetUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Failed to load webpage (${response.status}: ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 2. Extract OpenGraph and standard meta tags
  const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
  const ogDescription =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';
  const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';

  // 3. Search for JSON-LD structured Event data
  const jsonLdEvents: any[] = [];
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const text = $(elem).html();
      if (!text) return;
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          if (item?.['@type'] === 'Event' || item?.['@type']?.includes?.('Event')) {
            jsonLdEvents.push(item);
          }
        });
      } else if (parsed?.['@type'] === 'Event' || parsed?.['@type']?.includes?.('Event')) {
        jsonLdEvents.push(parsed);
      } else if (Array.isArray(parsed?.['@graph'])) {
        parsed['@graph'].forEach((item: any) => {
          if (item?.['@type'] === 'Event' || item?.['@type']?.includes?.('Event')) {
            jsonLdEvents.push(item);
          }
        });
      }
    } catch {
      // Ignore JSON parse errors in non-standard JSON-LD blocks
    }
  });

  // 4. Extract readable body text snippet (clearing noisy tags)
  $('script, style, noscript, nav, footer, header, svg').remove();
  const bodyText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);

  // 5. Use Gemini AI to structure the event data accurately
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Basic fallback if Gemini API key is missing
    const jsonLd = jsonLdEvents[0];
    const rawDate = jsonLd?.startDate || '';
    const parsedDate = parseEventDate(rawDate);
    return {
      title: jsonLd?.name || ogTitle || 'Untitled Event',
      category: 'Entertainment',
      description: jsonLd?.description || ogDescription || '',
      date: parsedDate ? toInputDateFormat(parsedDate) : '',
      time: '',
      venue: jsonLd?.location?.name || ogSiteName || '',
      location: jsonLd?.location?.address?.streetAddress || '',
      cityName: sanitizeScrapedCity(jsonLd?.location?.address?.addressLocality),
      imageUrl: jsonLd?.image || ogImage || '',
      sourceUrl: targetUrl,
      isFree: jsonLd?.isAccessibleForFree ?? false
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert event data extraction assistant for an events guide website.
Analyze this webpage content and metadata extracted from "${targetUrl}" and extract the event details.

JSON-LD Data: ${JSON.stringify(jsonLdEvents.slice(0, 2))}
Page Title: "${ogTitle}"
Site: "${ogSiteName}"
Description: "${ogDescription}"
Image: "${ogImage}"
Body Content Snippet:
"${bodyText}"

CRITICAL INSTRUCTIONS:
1. title: The exact, clean event title.
2. date: Standard format YYYY-MM-DD. If missing or cannot be determined, leave as empty string ("").
3. time: Formatted in 12-hour AM/PM (e.g. "7:00 PM" or "2:30 PM"). If unspecified, leave as empty string ("").
4. endTime: Optional end time if mentioned (e.g. "10:00 PM").
5. venue: Venue or facility name (e.g. "Cain's Ballroom", "BOK Center", "Paycom Center").
6. location: Physical address or cross streets.
7. cityName: The city name where this event takes place.
   VERY IMPORTANT RULE: If the city is unknown, not explicitly mentioned, or an online event, YOU MUST LEAVE cityName AS AN EMPTY STRING (""). Do NOT guess or default to Tulsa.
8. category: Must be one of: "Sports", "Family Activities", "Entertainment", "Visitor Attractions", "Food & Drink", "Arts & Culture", "Outdoors", "Community". If unclear, select "Entertainment".
9. price: Clean price string (e.g. "$25 - $45" or "Free").
10. isFree: boolean (true if free admission).
11. description: Concise 2-3 sentence event summary.
12. imageUrl: The highest quality image URL for this event (prioritize event poster/banner over site logos).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            endTime: { type: Type.STRING },
            venue: { type: Type.STRING },
            location: { type: Type.STRING },
            cityName: { type: Type.STRING },
            price: { type: Type.STRING },
            isFree: { type: Type.BOOLEAN },
            imageUrl: { type: Type.STRING }
          },
          required: ['title', 'category', 'description', 'date', 'venue']
        }
      }
    });

    const parsedJson = safelyParseJson(response.text, {} as any);
    const parsedDate = parseEventDate(parsedJson.date);

    return {
      title: parsedJson.title || ogTitle || 'Imported Event',
      category: parsedJson.category || 'Entertainment',
      description: parsedJson.description || ogDescription || '',
      date: parsedDate ? toInputDateFormat(parsedDate) : (parsedJson.date || ''),
      time: parsedJson.time || '',
      endTime: parsedJson.endTime || '',
      venue: parsedJson.venue || '',
      location: parsedJson.location || '',
      cityName: sanitizeScrapedCity(parsedJson.cityName),
      price: parsedJson.price || (parsedJson.isFree ? 'Free' : ''),
      isFree: Boolean(parsedJson.isFree),
      imageUrl: parsedJson.imageUrl || ogImage || '',
      sourceUrl: targetUrl
    };
  } catch (aiErr) {
    console.error('Gemini extraction error:', aiErr);
    // Return extracted meta tags as fallback
    const jsonLd = jsonLdEvents[0];
    const rawDate = jsonLd?.startDate || '';
    const parsedDate = parseEventDate(rawDate);
    return {
      title: jsonLd?.name || ogTitle || 'Imported Event',
      category: 'Entertainment',
      description: jsonLd?.description || ogDescription || '',
      date: parsedDate ? toInputDateFormat(parsedDate) : '',
      time: '',
      venue: jsonLd?.location?.name || '',
      location: jsonLd?.location?.address?.streetAddress || '',
      cityName: sanitizeScrapedCity(jsonLd?.location?.address?.addressLocality),
      imageUrl: jsonLd?.image || ogImage || '',
      sourceUrl: targetUrl,
      isFree: jsonLd?.isAccessibleForFree ?? false
    };
  }
};

/**
 * Crawls a multi-event calendar page, extracting multiple upcoming events.
 */
export const crawlEventsFromPage = async (
  sourceUrl: string,
  defaultCity?: string
): Promise<ScrapedEventDraft[]> => {
  const response = await fetch(sourceUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`Failed to crawl calendar page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. Check for multiple JSON-LD Event blocks
  const foundJsonLdEvents: any[] = [];
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const text = $(elem).html();
      if (!text) return;
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
        ? parsed['@graph']
        : [parsed];
      items.forEach(item => {
        if (item?.['@type'] === 'Event' || item?.['@type']?.includes?.('Event')) {
          foundJsonLdEvents.push(item);
        }
      });
    } catch {
      // ignore
    }
  });

  // 2. Extract readable body text snippet
  $('script, style, noscript, nav, footer, header, svg').remove();
  const textContent = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return foundJsonLdEvents.map(ev => {
      const parsedDate = parseEventDate(ev.startDate);
      return {
        title: ev.name || 'Discovered Event',
        category: 'Entertainment',
        description: ev.description || '',
        date: parsedDate ? toInputDateFormat(parsedDate) : '',
        time: '',
        venue: ev.location?.name || '',
        location: ev.location?.address?.streetAddress || '',
        cityName: sanitizeScrapedCity(ev.location?.address?.addressLocality || defaultCity),
        imageUrl: typeof ev.image === 'string' ? ev.image : ev.image?.url || '',
        sourceUrl: ev.url || sourceUrl,
        isFree: ev.isAccessibleForFree ?? false
      };
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an automated event crawler. Analyze the following calendar webpage from "${sourceUrl}" and extract up to 10 upcoming events.
Default Target City: "${defaultCity || ''}".
JSON-LD Events found: ${JSON.stringify(foundJsonLdEvents.slice(0, 5))}
Page Content:
"${textContent}"

EXTRACT AN ARRAY OF EVENTS FOLLOWING THESE RULES:
- date: YYYY-MM-DD or empty string if unspecified.
- time: 12-hour format e.g. "7:00 PM".
- cityName: Must be the actual city. If unknown or not specified, leave as empty string ("").
- category: One of "Sports", "Family Activities", "Entertainment", "Visitor Attractions", "Food & Drink", "Arts & Culture", "Outdoors", "Community".
- Return JSON array only.`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
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
              price: { type: Type.STRING },
              isFree: { type: Type.BOOLEAN },
              imageUrl: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            },
            required: ['title', 'category', 'description', 'date', 'venue']
          }
        }
      }
    });

    const parsedArray = safelyParseJson(res.text, [] as any[]);
    return (parsedArray || []).map((item: any) => {
      const parsedDate = parseEventDate(item.date);
      return {
        title: item.title || 'Crawled Event',
        category: item.category || 'Entertainment',
        description: item.description || '',
        date: parsedDate ? toInputDateFormat(parsedDate) : (item.date || ''),
        time: item.time || '',
        venue: item.venue || '',
        location: item.location || '',
        cityName: sanitizeScrapedCity(item.cityName || defaultCity),
        price: item.price || (item.isFree ? 'Free' : ''),
        isFree: Boolean(item.isFree),
        imageUrl: item.imageUrl || '',
        sourceUrl: item.sourceUrl || sourceUrl
      };
    });
  } catch (err) {
    console.error('Error crawling events with AI:', err);
    return [];
  }
};

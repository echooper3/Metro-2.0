import { EventActivity } from '../types';
import { parseEventDate, toInputDateFormat } from './dateUtils';

export type DuplicateMatchType = 'exact' | 'title_date' | 'title_city' | 'fuzzy';

export interface DuplicateCluster {
  id: string;
  clusterKey: string;
  matchType: DuplicateMatchType;
  matchReason: string;
  events: EventActivity[];
  recommendedKeepId: string;
  totalScoreDifference: number;
}

/**
 * Normalizes strings by trimming, lowercasing, and stripping special characters/excess whitespace.
 */
export const normalizeText = (str?: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')    // collapse multi-spaces
    .trim();
};

/**
 * Normalizes date representations (YYYY-MM-DD or standard parsable dates)
 */
export const normalizeDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  
  // Safe parser from dateUtils (handles xx-xx-xxxx, xx-xx-xx, xx/xx/xxxx, xx/xx/xx, ISO, text)
  const parsed = parseEventDate(trimmed);
  if (parsed) {
    return toInputDateFormat(parsed);
  }

  // YYYY-MM-DD standard format fallback
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  return normalizeText(trimmed);
};

/**
 * Normalizes price values into a consistent comparable representation.
 * e.g. "$25.00" -> "25", "$0" / "Free" -> "free", "$15 - $30" -> "15-30", "" -> ""
 */
export const normalizePrice = (price?: string, isFree?: boolean): string => {
  if (isFree) return 'free';
  if (!price) return '';
  const trimmed = price.toLowerCase().trim();
  if (
    trimmed === 'free' || 
    trimmed === '0' || 
    trimmed === '$0' || 
    trimmed === '$0.00' || 
    trimmed === 'none' || 
    trimmed === 'complimentary' || 
    trimmed === 'no cover'
  ) {
    return 'free';
  }

  // Remove dollar signs, .00, and whitespace
  const cleaned = trimmed
    .replace(/\$/g, '')
    .replace(/\.00\b/g, '')
    .replace(/\s+/g, '')
    .trim();

  return cleaned;
};

/**
 * Checks whether two venue strings match or are mutually compatible.
 */
export const isVenueMatching = (v1?: string, v2?: string, loc1?: string, loc2?: string): boolean => {
  const normV1 = normalizeText(v1);
  const normV2 = normalizeText(v2);
  const normL1 = normalizeText(loc1);
  const normL2 = normalizeText(loc2);

  // Both empty/unspecified
  if (!normV1 && !normV2) return true;

  // Exact normalized match
  if (normV1 && normV2 && normV1 === normV2) return true;

  // One venue contains the other (e.g. "cains ballroom" and "cains ballroom downtown")
  if (normV1 && normV2 && (normV1.includes(normV2) || normV2.includes(normV1))) return true;

  // Cross-check: venue name in location
  if (normV1 && !normV2 && normL2.includes(normV1)) return true;
  if (normV2 && !normV1 && normL1.includes(normV2)) return true;

  // If one is missing and locations match, allow compatibility
  if ((!normV1 || !normV2) && normL1 && normL2 && isLocationMatching(loc1, loc2)) return true;

  return false;
};

/**
 * Checks whether two location strings match or are mutually compatible.
 */
export const isLocationMatching = (loc1?: string, loc2?: string, v1?: string, v2?: string): boolean => {
  const normL1 = normalizeText(loc1);
  const normL2 = normalizeText(loc2);
  const normV1 = normalizeText(v1);
  const normV2 = normalizeText(v2);

  // Both empty
  if (!normL1 && !normL2) return true;

  // Exact normalized match
  if (normL1 && normL2 && normL1 === normL2) return true;

  // One location contains the other (e.g. "423 n main st" and "423 n main st tulsa ok")
  if (normL1 && normL2 && (normL1.includes(normL2) || normL2.includes(normL1))) return true;

  // Cross-check: location is the venue name
  if (normL1 && normV2 && (normL1.includes(normV2) || normV2.includes(normL1))) return true;
  if (normL2 && normV1 && (normL2.includes(normV1) || normV1.includes(normL2))) return true;

  // If one is missing and venues match, allow compatibility
  if ((!normL1 || !normL2) && normV1 && normV2 && (normV1 === normV2 || normV1.includes(normV2) || normV2.includes(normV1))) return true;

  return false;
};

/**
 * Checks whether two price values match or are mutually compatible.
 */
export const isPriceMatching = (p1?: string, p2?: string, isFree1?: boolean, isFree2?: boolean): boolean => {
  const normP1 = normalizePrice(p1, isFree1);
  const normP2 = normalizePrice(p2, isFree2);

  // Both empty/unspecified
  if (!normP1 && !normP2) return true;

  // Exact normalized match (e.g. "25" === "25", "free" === "free")
  if (normP1 && normP2) {
    return normP1 === normP2;
  }

  // If one is empty and the other is specified (e.g. missing price field), allow compatibility
  return true;
};

/**
 * Simple token-overlap similarity metric between two strings (Dice coefficient on word tokens)
 */
export const calculateTitleSimilarity = (title1: string, title2: string): number => {
  const norm1 = normalizeText(title1);
  const norm2 = normalizeText(title2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const tokens1 = new Set(norm1.split(' ').filter(Boolean));
  const tokens2 = new Set(norm2.split(' ').filter(Boolean));

  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  return (2 * intersection) / (tokens1.size + tokens2.size);
};

/**
 * Master evaluator: Checks whether two events meet ALL 6 duplicate conditions:
 * 1. date
 * 2. location
 * 3. price
 * 4. title
 * 5. cityName
 * 6. venue
 */
export const doEventsMeetDuplicateConditions = (
  e1: EventActivity,
  e2: EventActivity
): boolean => {
  // 1. Date condition: Must match (different dates are NEVER duplicates)
  const d1 = normalizeDate(e1.date);
  const d2 = normalizeDate(e2.date);
  if (d1 !== d2) return false;

  // 2. CityName condition: Must match
  const c1 = normalizeText(e1.cityName || 'tulsa');
  const c2 = normalizeText(e2.cityName || 'tulsa');
  if (c1 !== c2) return false;

  // 3. Title condition: Must match or have high similarity (>=85%)
  const t1 = normalizeText(e1.title);
  const t2 = normalizeText(e2.title);
  if (!t1 || !t2) return false;
  const isTitleMatch = t1 === t2 || calculateTitleSimilarity(e1.title, e2.title) >= 0.85;
  if (!isTitleMatch) return false;

  // 4. Venue condition: Must match or be compatible
  if (!isVenueMatching(e1.venue, e2.venue, e1.location, e2.location)) {
    return false;
  }

  // 5. Location condition: Must match or be compatible
  if (!isLocationMatching(e1.location, e2.location, e1.venue, e2.venue)) {
    return false;
  }

  // 6. Price condition: Must match or be compatible
  if (!isPriceMatching(e1.price, e2.price, e1.isFree, e2.isFree)) {
    return false;
  }

  return true;
};

/**
 * Calculates a score (0-100) reflecting how complete and rich an event record is.
 * Used to intelligently recommend the best primary record to keep.
 */
export const calculateCompletenessScore = (event: EventActivity): number => {
  let score = 0;

  // Has image
  if (event.imageUrl && event.imageUrl.trim().length > 10) score += 25;

  // Description length
  const descLen = (event.description || '').trim().length;
  if (descLen > 100) score += 20;
  else if (descLen > 30) score += 10;

  // Venue & Location
  if (event.venue && event.venue.trim().length > 1) score += 15;
  if (event.location && event.location.trim().length > 1) score += 10;

  // Categorized (not undefined)
  if (event.category && event.category !== 'Undefined') score += 10;

  // Has Time and Date
  if (event.time && event.time.trim().length > 0) score += 5;
  if (event.date && event.date.trim().length > 0) score += 5;

  // Has price
  if (event.price && event.price.trim().length > 0) score += 5;

  // Source & Verification bonus
  if (event.isVerified) score += 5;
  if (event.userCreated || event.userId) score += 5;

  return Math.min(score, 100);
};

/**
 * Detects duplicate events across the database based on defined protocol rules:
 * Evaluates all 6 required factors: date, location, price, title, cityName, venue.
 */
export const detectDuplicateEvents = (
  events: EventActivity[],
  dismissedClusterKeys: Set<string> = new Set()
): DuplicateCluster[] => {
  if (!events || events.length < 2) return [];

  const clusters: DuplicateCluster[] = [];
  const assignedEventIds = new Set<string>();

  // Pass 1: Exact Matches (Identical Title, Date, City, Venue, Location & Price)
  const exactGroups = new Map<string, EventActivity[]>();
  events.forEach(event => {
    const normTitle = normalizeText(event.title);
    const normDt = normalizeDate(event.date);
    if (!normTitle || !normDt) return;
    const normCt = normalizeText(event.cityName || 'tulsa');
    const normVen = normalizeText(event.venue);
    const normLoc = normalizeText(event.location);
    const normPr = normalizePrice(event.price, event.isFree);
    const key = `exact_${normTitle}_${normDt}_${normCt}_${normVen}_${normLoc}_${normPr}`;

    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key)!.push(event);
  });

  exactGroups.forEach((groupEvents, key) => {
    if (groupEvents.length > 1) {
      if (dismissedClusterKeys.has(key)) return;

      const scored = groupEvents.map(e => ({
        event: e,
        score: calculateCompletenessScore(e)
      })).sort((a, b) => b.score - a.score);

      clusters.push({
        id: key,
        clusterKey: key,
        matchType: 'exact',
        matchReason: 'Exact Match: Identical Title, Date, City, Venue, Location & Price',
        events: scored.map(s => s.event),
        recommendedKeepId: scored[0].event.id,
        totalScoreDifference: scored[0].score - scored[scored.length - 1].score
      });

      groupEvents.forEach(e => assignedEventIds.add(e.id));
    }
  });

  // Pass 2: Compatible Title & Date Matches meeting all 6 conditions
  const remainingPass2 = events.filter(e => !assignedEventIds.has(e.id));
  for (let i = 0; i < remainingPass2.length; i++) {
    const e1 = remainingPass2[i];
    if (assignedEventIds.has(e1.id)) continue;
    const normDate1 = normalizeDate(e1.date);
    if (!normDate1) continue;

    const matchedGroup = [e1];

    for (let j = i + 1; j < remainingPass2.length; j++) {
      const e2 = remainingPass2[j];
      if (assignedEventIds.has(e2.id)) continue;
      const normDate2 = normalizeDate(e2.date);

      if (normDate1 === normDate2) {
        // Enforce all 6 conditions: date, location, price, title, cityName, venue
        if (doEventsMeetDuplicateConditions(e1, e2)) {
          matchedGroup.push(e2);
        }
      }
    }

    if (matchedGroup.length > 1) {
      const key = `titledate_${normalizeText(e1.title)}_${normDate1}`;
      if (!dismissedClusterKeys.has(key)) {
        const scored = matchedGroup.map(e => ({
          event: e,
          score: calculateCompletenessScore(e)
        })).sort((a, b) => b.score - a.score);

        clusters.push({
          id: key,
          clusterKey: key,
          matchType: 'title_date',
          matchReason: 'Matching Title & Scheduled Date with Compatible Venue, Location & Price',
          events: scored.map(s => s.event),
          recommendedKeepId: scored[0].event.id,
          totalScoreDifference: scored[0].score - scored[scored.length - 1].score
        });

        matchedGroup.forEach(e => assignedEventIds.add(e.id));
      }
    }
  }

  // Pass 3: Undated Matches (Both lack date, but meet all 5 other conditions: title, cityName, venue, location, price)
  const remainingPass3 = events.filter(e => !assignedEventIds.has(e.id));
  for (let i = 0; i < remainingPass3.length; i++) {
    const e1 = remainingPass3[i];
    if (assignedEventIds.has(e1.id)) continue;
    const normDate1 = normalizeDate(e1.date);
    if (normDate1) continue; // Must be undated

    const matchedGroup = [e1];

    for (let j = i + 1; j < remainingPass3.length; j++) {
      const e2 = remainingPass3[j];
      if (assignedEventIds.has(e2.id)) continue;
      const normDate2 = normalizeDate(e2.date);
      if (normDate2) continue; // Both must be undated

      if (doEventsMeetDuplicateConditions(e1, e2)) {
        matchedGroup.push(e2);
      }
    }

    if (matchedGroup.length > 1) {
      const key = `undated_${normalizeText(e1.title)}_${normalizeText(e1.cityName || 'tulsa')}`;
      if (!dismissedClusterKeys.has(key)) {
        const scored = matchedGroup.map(e => ({
          event: e,
          score: calculateCompletenessScore(e)
        })).sort((a, b) => b.score - a.score);

        clusters.push({
          id: key,
          clusterKey: key,
          matchType: 'title_city',
          matchReason: 'Matching Title & City with Compatible Venue, Location & Price (Undated)',
          events: scored.map(s => s.event),
          recommendedKeepId: scored[0].event.id,
          totalScoreDifference: scored[0].score - scored[scored.length - 1].score
        });

        matchedGroup.forEach(e => assignedEventIds.add(e.id));
      }
    }
  }

  // Pass 4: Fuzzy Title Similarity (> 85% overlap) meeting all 6 conditions (date, location, price, title, cityName, venue)
  const remainingPass4 = events.filter(e => !assignedEventIds.has(e.id));
  for (let i = 0; i < remainingPass4.length; i++) {
    const e1 = remainingPass4[i];
    if (assignedEventIds.has(e1.id)) continue;
    const normDate1 = normalizeDate(e1.date);
    if (!normDate1) continue;

    const fuzzyGroup = [e1];

    for (let j = i + 1; j < remainingPass4.length; j++) {
      const e2 = remainingPass4[j];
      if (assignedEventIds.has(e2.id)) continue;
      const normDate2 = normalizeDate(e2.date);

      if (normDate1 === normDate2) {
        if (doEventsMeetDuplicateConditions(e1, e2)) {
          fuzzyGroup.push(e2);
        }
      }
    }

    if (fuzzyGroup.length > 1) {
      const key = `fuzzy_${normalizeText(e1.title).slice(0, 15)}_${normDate1}`;
      if (!dismissedClusterKeys.has(key)) {
        const scored = fuzzyGroup.map(e => ({
          event: e,
          score: calculateCompletenessScore(e)
        })).sort((a, b) => b.score - a.score);

        clusters.push({
          id: key,
          clusterKey: key,
          matchType: 'fuzzy',
          matchReason: 'High Title Similarity (>85%) with Matching Date, City, Venue, Location & Price',
          events: scored.map(s => s.event),
          recommendedKeepId: scored[0].event.id,
          totalScoreDifference: scored[0].score - scored[scored.length - 1].score
        });

        fuzzyGroup.forEach(e => assignedEventIds.add(e.id));
      }
    }
  }

  // Comprehensive Invariant Check:
  // Strictly enforce that EVERY event in the cluster satisfies all 6 conditions:
  // date, location, price, title, cityName, venue
  const verifiedClusters: DuplicateCluster[] = [];

  for (const cluster of clusters) {
    const primary = cluster.events[0];
    const validEvents = [primary];

    for (let i = 1; i < cluster.events.length; i++) {
      const candidate = cluster.events[i];
      if (doEventsMeetDuplicateConditions(primary, candidate)) {
        validEvents.push(candidate);
      }
    }

    if (validEvents.length > 1) {
      cluster.events = validEvents;
      verifiedClusters.push(cluster);
    }
  }

  return verifiedClusters;
};

/**
 * Intelligent Data Merge:
 * Copies richer/missing fields from duplicate sources into the target primary event
 * so that deleting duplicates does NOT discard valuable information (images, fuller descriptions, ticket URLs, etc.).
 */
export const mergeEventData = (
  primary: EventActivity,
  duplicates: EventActivity[]
): Partial<EventActivity> => {
  const merged: Partial<EventActivity> = {};

  duplicates.forEach(dup => {
    // Merge image if primary lacks one
    if ((!primary.imageUrl || primary.imageUrl.trim().length === 0) && dup.imageUrl && dup.imageUrl.trim().length > 0) {
      merged.imageUrl = dup.imageUrl;
      primary.imageUrl = dup.imageUrl;
    }

    // Merge description if dup has a substantially longer description
    const primDesc = (primary.description || '').trim();
    const dupDesc = (dup.description || '').trim();
    if (dupDesc.length > primDesc.length + 30) {
      merged.description = dupDesc;
      primary.description = dupDesc;
    }

    // Merge venue if primary lacks venue
    if ((!primary.venue || primary.venue.trim().length === 0) && dup.venue && dup.venue.trim().length > 0) {
      merged.venue = dup.venue;
      primary.venue = dup.venue;
    }

    // Merge location if primary lacks location
    if ((!primary.location || primary.location.trim().length === 0) && dup.location && dup.location.trim().length > 0) {
      merged.location = dup.location;
      primary.location = dup.location;
    }

    // Merge category if primary is Undefined but duplicate is categorized
    if ((!primary.category || primary.category === 'Undefined') && dup.category && dup.category !== 'Undefined') {
      merged.category = dup.category;
      primary.category = dup.category;
    }

    // Merge price if primary lacks price
    if ((!primary.price || primary.price.trim().length === 0) && dup.price && dup.price.trim().length > 0) {
      merged.price = dup.price;
      primary.price = dup.price;
    }

    // Merge sourceUrl if primary lacks sourceUrl
    if ((!primary.sourceUrl || primary.sourceUrl.trim().length === 0) && dup.sourceUrl && dup.sourceUrl.trim().length > 0) {
      merged.sourceUrl = dup.sourceUrl;
      primary.sourceUrl = dup.sourceUrl;
    }

    // Merge time if primary lacks time
    if ((!primary.time || primary.time.trim().length === 0) && dup.time && dup.time.trim().length > 0) {
      merged.time = dup.time;
      primary.time = dup.time;
    }
  });

  return merged;
};

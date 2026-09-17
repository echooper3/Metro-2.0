import { EventActivity } from '../types';

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
  
  // YYYY-MM-DD standard format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // MM/DD/YYYY format
  const slashParts = trimmed.split('/');
  if (slashParts.length === 3) {
    const [m, d, y] = slashParts;
    const year = y.length === 4 ? y : `20${y.padStart(2, '0')}`;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback to Date parser
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return normalizeText(trimmed);
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
 * Detects duplicate events across the database based on defined protocol rules:
 * 1. Exact Match: Normalized Title + Normalized Date + Normalized City
 * 2. Title & Date Match: Normalized Title + Normalized Date
 * 3. Title & City Match: Normalized Title + Normalized City
 * 4. Fuzzy Similarity: High title overlap (> 85%) on the same date
 */
export const detectDuplicateEvents = (
  events: EventActivity[],
  dismissedClusterKeys: Set<string> = new Set()
): DuplicateCluster[] => {
  if (!events || events.length < 2) return [];

  const clusters: DuplicateCluster[] = [];
  const assignedEventIds = new Set<string>();

  // Pass 1: Exact Matches (Same Title + Date + City)
  const exactGroups = new Map<string, EventActivity[]>();
  events.forEach(event => {
    const normTitle = normalizeText(event.title);
    if (!normTitle) return;
    const normDt = normalizeDate(event.date);
    const normCt = normalizeText(event.cityName || 'tulsa');
    const key = `exact_${normTitle}_${normDt}_${normCt}`;

    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key)!.push(event);
  });

  exactGroups.forEach((groupEvents, key) => {
    if (groupEvents.length > 1) {
      if (dismissedClusterKeys.has(key)) return;

      // Sort by completeness score descending
      const scored = groupEvents.map(e => ({
        event: e,
        score: calculateCompletenessScore(e)
      })).sort((a, b) => b.score - a.score);

      const recommendedKeepId = scored[0].event.id;
      const scoreDiff = scored[0].score - scored[scored.length - 1].score;

      clusters.push({
        id: key,
        clusterKey: key,
        matchType: 'exact',
        matchReason: 'Exact Match: Identical Title, Date & City',
        events: scored.map(s => s.event),
        recommendedKeepId,
        totalScoreDifference: scoreDiff
      });

      groupEvents.forEach(e => assignedEventIds.add(e.id));
    }
  });

  // Pass 2: Title & Date Matches (Same Title + Date, unassigned events)
  const remainingEvents = events.filter(e => !assignedEventIds.has(e.id));
  const titleDateGroups = new Map<string, EventActivity[]>();

  remainingEvents.forEach(event => {
    const normTitle = normalizeText(event.title);
    const normDt = normalizeDate(event.date);
    if (!normTitle || !normDt) return;
    const key = `titledate_${normTitle}_${normDt}`;

    if (!titleDateGroups.has(key)) titleDateGroups.set(key, []);
    titleDateGroups.get(key)!.push(event);
  });

  titleDateGroups.forEach((groupEvents, key) => {
    if (groupEvents.length > 1) {
      if (dismissedClusterKeys.has(key)) return;

      const scored = groupEvents.map(e => ({
        event: e,
        score: calculateCompletenessScore(e)
      })).sort((a, b) => b.score - a.score);

      clusters.push({
        id: key,
        clusterKey: key,
        matchType: 'title_date',
        matchReason: 'Same Event Title & Scheduled Date',
        events: scored.map(s => s.event),
        recommendedKeepId: scored[0].event.id,
        totalScoreDifference: scored[0].score - scored[scored.length - 1].score
      });

      groupEvents.forEach(e => assignedEventIds.add(e.id));
    }
  });

  // Pass 3: Title & City Matches (Same Title in Same City for events with missing or slightly different dates)
  const remainingPass3 = events.filter(e => !assignedEventIds.has(e.id));
  const titleCityGroups = new Map<string, EventActivity[]>();

  remainingPass3.forEach(event => {
    const normTitle = normalizeText(event.title);
    const normCity = normalizeText(event.cityName || 'tulsa');
    if (!normTitle || normTitle.length < 5) return; // avoid short generic titles like "Live"
    const key = `titlecity_${normTitle}_${normCity}`;

    if (!titleCityGroups.has(key)) titleCityGroups.set(key, []);
    titleCityGroups.get(key)!.push(event);
  });

  titleCityGroups.forEach((groupEvents, key) => {
    if (groupEvents.length > 1) {
      if (dismissedClusterKeys.has(key)) return;

      const scored = groupEvents.map(e => ({
        event: e,
        score: calculateCompletenessScore(e)
      })).sort((a, b) => b.score - a.score);

      clusters.push({
        id: key,
        clusterKey: key,
        matchType: 'title_city',
        matchReason: 'Same Title in the Same City',
        events: scored.map(s => s.event),
        recommendedKeepId: scored[0].event.id,
        totalScoreDifference: scored[0].score - scored[scored.length - 1].score
      });

      groupEvents.forEach(e => assignedEventIds.add(e.id));
    }
  });

  // Pass 4: Fuzzy Title Similarity (> 85% overlap) with matching date
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
        const similarity = calculateTitleSimilarity(e1.title, e2.title);
        if (similarity >= 0.85) {
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
          matchReason: 'High Title Similarity (>85%) on Same Date',
          events: scored.map(s => s.event),
          recommendedKeepId: scored[0].event.id,
          totalScoreDifference: scored[0].score - scored[scored.length - 1].score
        });

        fuzzyGroup.forEach(e => assignedEventIds.add(e.id));
      }
    }
  }

  return clusters;
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

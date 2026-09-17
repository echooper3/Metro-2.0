export interface TrackingParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/**
 * Slugifies a title into a clean, URL-safe campaign tag.
 */
export const slugifyCampaign = (title?: string): string => {
  if (!title) return 'general_campaign';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
};

/**
 * Safely appends Google Analytics 4 compliant UTM parameters to any outbound URL.
 * Preserves existing search parameters and fragments without duplicating query delimiters.
 */
export const buildTrackedUrl = (
  rawUrl: string,
  params: TrackingParams = {}
): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl || '';

  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Ensure protocol exists
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);

    // Default parameters
    const source = params.source || 'inside_the_metro';
    const medium = params.medium || 'referral';
    const campaign = params.campaign ? slugifyCampaign(params.campaign) : 'metro_network';

    parsed.searchParams.set('utm_source', source);
    parsed.searchParams.set('utm_medium', medium);
    parsed.searchParams.set('utm_campaign', campaign);

    if (params.content) {
      parsed.searchParams.set('utm_content', params.content.toLowerCase().trim());
    }

    if (params.term) {
      parsed.searchParams.set('utm_term', params.term.toLowerCase().trim());
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, fallback to simple query string append
    const delimiter = trimmed.includes('?') ? '&' : '?';
    const source = encodeURIComponent(params.source || 'inside_the_metro');
    const medium = encodeURIComponent(params.medium || 'referral');
    const campaign = encodeURIComponent(params.campaign ? slugifyCampaign(params.campaign) : 'metro_network');
    
    let fallback = `${trimmed}${delimiter}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
    if (params.content) {
      fallback += `&utm_content=${encodeURIComponent(params.content.toLowerCase().trim())}`;
    }
    return fallback;
  }
};

/**
 * Formats Click-Through Rate as a clean percentage string.
 */
export const formatCtr = (clicks: number = 0, impressions: number = 0): string => {
  if (!impressions || impressions <= 0) return '0.0';
  return ((clicks / impressions) * 100).toFixed(1);
};

/**
 * Returns performance benchmark feedback based on CTR.
 */
export const getCtrBenchmark = (ctrNumber: number): {
  label: string;
  badgeColor: string;
  textColor: string;
  description: string;
} => {
  if (ctrNumber >= 3.0) {
    return {
      label: 'Exceptional',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      textColor: 'text-emerald-600',
      description: 'Outperforming industry average (> 3.0%). High audience engagement.'
    };
  }
  if (ctrNumber >= 1.5) {
    return {
      label: 'Strong / Above Average',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      textColor: 'text-orange-600',
      description: 'Solid performance matching top regional media benchmarks (1.5% - 3.0%).'
    };
  }
  if (ctrNumber > 0) {
    return {
      label: 'Active Delivery',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      textColor: 'text-blue-600',
      description: 'Signals delivered and driving direct clicks to destination.'
    };
  }
  return {
    label: 'Gathering Signals',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-300',
    textColor: 'text-gray-500',
    description: 'New or low-impression placement. Gathering live engagement data.'
  };
};

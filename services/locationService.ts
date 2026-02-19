
export interface LocationSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'venue' | 'address' | 'city';
}

/**
 * Fetch address suggestions from OpenStreetMap Nominatim.
 * Prioritizes results in the Oklahoma/Texas region.
 */
export const fetchAddressSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
  if (query.length < 3) return [];

  // Bounding box for OK/TX region: [min_lon, min_lat, max_lon, max_lat]
  // Approximately: West -107, South 25, East -93, North 37
  const viewbox = "-107,25,-93,37";
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&addressdetails=1&limit=5`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'InsideTheMetro-EventApp' // Required by Nominatim policy
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item: any) => ({
      name: item.display_name.split(',')[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type === 'city' ? 'city' : (item.class === 'building' ? 'venue' : 'address')
    }));
  } catch (error) {
    console.error("Nominatim fetch failed:", error);
    return [];
  }
};

/**
 * Reverse geocode coordinates to get a readable address.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'InsideTheMetro-EventApp' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    return null;
  }
};

/**
 * Get current user location using Geolocation API.
 */
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  });
};

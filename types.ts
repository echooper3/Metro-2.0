
export interface City {
  id: string;
  name: string;
  state: string;
  image: string;
  description: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  cityName: string;
  unit: 'F' | 'C';
}

export interface EventActivity {
  id: string;
  title: string;
  category: string;
  description: string;
  date?: string;
  time?: string;
  endTime?: string;
  location: string;
  venue?: string;
  sourceUrl?: string;
  cityName?: string;
  isTrending?: boolean;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  distance?: number; 
  ageRestriction?: string; 
  userCreated?: boolean;
  userId?: string;
  price?: string;
  isFree?: boolean;
  priceLevel?: string;
  organizerName?: string;
  organizerUrl?: string;
  organizerContact?: string;
  isLive?: boolean; // True if sourced from Google Search
  isVerified?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export enum AppView {
  LANDING = 'LANDING',
  CITY_DETAIL = 'CITY_DETAIL',
  SEARCH_RESULTS = 'SEARCH_RESULTS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  birthday?: string;
  zipCode?: string;
  savedEvents: string[]; // Array of event IDs
  syncStats?: {
    lastSyncAt?: string;
    totalSyncs?: number;
  };
  preferences: {
    favoriteCity?: string;
    favoriteCategories: Category[];
    hasCompletedOnboarding?: boolean;
  };
}

export type Category = 
  | 'All' 
  | 'Sports' 
  | 'Family Activities' 
  | 'Entertainment' 
  | 'Visitor Attractions' 
  | 'Food & Drink' 
  | 'Night Life' 
  | 'Arts & Culture' 
  | 'Outdoors' 
  | 'Community';


export interface City {
  id: string;
  name: string;
  state: string;
  image: string;
  description: string;
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
  price?: string;
  isFree?: boolean;
  priceLevel?: string;
  organizerName?: string;
  organizerUrl?: string;
  organizerContact?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export enum AppView {
  LANDING = 'LANDING',
  CITY_DETAIL = 'CITY_DETAIL',
  SEARCH_RESULTS = 'SEARCH_RESULTS'
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

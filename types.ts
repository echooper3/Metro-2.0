
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
  location: string;
  sourceUrl?: string;
  cityName?: string;
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
  | 'Trending' 
  | 'Sports' 
  | 'Family Activities' 
  | 'Entertainment' 
  | 'Visitor Activities' 
  | 'Food & Drink' 
  | 'Night Life' 
  | 'Arts & Culture' 
  | 'Outdoors' 
  | 'Community';

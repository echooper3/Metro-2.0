
import { City, Category, EventActivity } from './types';

export const CITIES: City[] = [
  {
    id: 'tulsa',
    name: 'Tulsa',
    state: 'Oklahoma',
    image: 'https://images.unsplash.com/photo-1599427404423-69032f913693?auto=format&fit=crop&q=60&w=600',
    description: 'The Oil Capital of the World, known for its Art Deco architecture and vibrant arts scene.'
  },
  {
    id: 'okc',
    name: 'Oklahoma City',
    state: 'Oklahoma',
    image: 'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&q=60&w=600',
    description: 'A modern frontier with a rich Western heritage and booming downtown entertainment district.'
  },
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'Texas',
    image: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=60&w=600',
    description: 'A global commercial hub where culture meets legendary Texan hospitality.'
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'Texas',
    image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=60&w=600',
    description: 'Space City, a culinary and cultural melting pot with world-class museums and parks.'
  }
];

export const CATEGORIES: Category[] = [
  'All', 'Sports', 'Family Activities', 'Entertainment', 'Visitor Attractions', 'Food & Drink', 'Night Life', 'Arts & Culture', 'Outdoors', 'Community'
];

// Utility to generate dynamic dates (MM/DD/YYYY)
const getRelDate = (daysOut: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Seed Events with dynamic dates relative to 'Today'
export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [
    { id: 't1', title: 'Tulsa Hub Discovery', cityName: 'Tulsa', category: 'Arts & Culture', description: 'Explore Tulsas Blue Dome District with local artisan markets and pop-up galleries.', date: getRelDate(0), location: 'Downtown Tulsa', venue: 'Blue Dome District', ageRestriction: 'All Ages', isTrending: true, lat: 36.155, lng: -95.985 },
    { id: 't2', title: 'Metro Sports Weekend', cityName: 'Tulsa', category: 'Sports', description: 'Catch the excitement of professional local sports at ONEOK Field.', date: getRelDate(1), location: 'ONEOK Field', venue: 'ONEOK Field', ageRestriction: 'All Ages', isTrending: true, lat: 36.160, lng: -95.993 },
    { id: 't3', title: 'Riverside Evening Beats', cityName: 'Tulsa', category: 'Entertainment', description: 'Live outdoor performances by regional touring bands.', date: getRelDate(3), location: 'Riverside Dr', venue: 'Gathering Place Stage', ageRestriction: 'All Ages', lat: 36.126, lng: -95.985 },
    { id: 't4', title: 'Local Farmers Exchange', cityName: 'Tulsa', category: 'Food & Drink', description: 'Fresh seasonal produce and locally made crafts.', date: getRelDate(0), location: 'Cherry St', venue: 'Cherry Street Market', ageRestriction: 'All Ages', lat: 36.136, lng: -95.969 }
  ],
  okc: [
    { id: 'o1', title: 'Metro Pro Hoops', cityName: 'Oklahoma City', category: 'Sports', description: 'Premier basketball action in the heart of downtown.', date: getRelDate(0), location: 'Downtown OKC', venue: 'Paycom Center', ageRestriction: 'All Ages', isTrending: true, lat: 35.463, lng: -97.515 },
    { id: 'o2', title: 'Scissortail Saturday Market', cityName: 'Oklahoma City', category: 'Food & Drink', description: 'Community gathering featuring the best of Oklahoma growers.', date: getRelDate(2), location: 'Hudson Ave', venue: 'Scissortail Park', ageRestriction: 'All Ages', lat: 35.461, lng: -97.518 },
    { id: 'o3', title: 'Bricktown Live Series', cityName: 'Oklahoma City', category: 'Entertainment', description: 'Street festival with live bands and local shopping.', date: getRelDate(1), location: 'Bricktown', venue: 'Bricktown Square', ageRestriction: 'All Ages', isTrending: true, lat: 35.465, lng: -97.505 }
  ],
  dallas: [
    { id: 'd1', title: 'Big D Sports Night', cityName: 'Dallas', category: 'Sports', description: 'Experience the legendary energy of a Dallas home game.', date: getRelDate(0), location: 'Victory Park', venue: 'American Airlines Center', ageRestriction: 'All Ages', isTrending: true, lat: 32.790, lng: -96.810 },
    { id: 'd2', title: 'Texan Culinary Showcase', cityName: 'Dallas', category: 'Food & Drink', description: 'A massive showcase of the citys finest flavors.', date: getRelDate(1), location: 'Fair Park', venue: 'Main Plaza', ageRestriction: 'All Ages', isTrending: true, lat: 32.778, lng: -96.762 },
    { id: 'd3', title: 'Arts in the Park', cityName: 'Dallas', category: 'Arts & Culture', description: 'Pop-up performances and installations in downtown.', date: getRelDate(2), location: 'Klyde Warren', venue: 'Klyde Warren Park', ageRestriction: 'All Ages', lat: 32.789, lng: -96.801 }
  ],
  houston: [
    { id: 'h1', title: 'Space City Matchup', cityName: 'Houston', category: 'Sports', description: 'Local rivalries flare up in this high-energy sports showdown.', date: getRelDate(0), location: 'Downtown Houston', venue: 'Minute Maid Park', ageRestriction: 'All Ages', isTrending: true, lat: 29.757, lng: -95.355 },
    { id: 'h2', title: 'Discovery Green Yoga', cityName: 'Houston', category: 'Outdoors', description: 'Morning mindfulness in Houstons central park.', date: getRelDate(0), location: 'Downtown', venue: 'Discovery Green', ageRestriction: 'All Ages', lat: 29.753, lng: -95.359 },
    { id: 'h3', title: 'Museum District Night', cityName: 'Houston', category: 'Arts & Culture', description: 'After-hours access to world-class exhibits.', date: getRelDate(4), location: 'Museum District', venue: 'Museum of Fine Arts', ageRestriction: 'All Ages', isTrending: true, lat: 29.725, lng: -95.390 }
  ]
};

export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...SEED_EVENTS.tulsa.slice(0, 2),
  ...SEED_EVENTS.okc.slice(0, 2),
  ...SEED_EVENTS.dallas.slice(0, 2),
  ...SEED_EVENTS.houston.slice(0, 2)
];

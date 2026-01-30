
import { City, Category, EventActivity } from './types';

export const CITIES: City[] = [
  {
    id: 'tulsa',
    name: 'Tulsa',
    state: 'Oklahoma',
    image: 'https://images.unsplash.com/photo-1599427404423-69032f913693?auto=format&fit=crop&q=60&w=800',
    description: 'The Oil Capital of the World, known for its Art Deco architecture and vibrant arts scene.'
  },
  {
    id: 'okc',
    name: 'Oklahoma City',
    state: 'Oklahoma',
    image: 'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&q=60&w=800',
    description: 'A modern frontier with a rich Western heritage and booming downtown entertainment district.'
  },
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'Texas',
    image: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=60&w=800',
    description: 'A global commercial hub where culture meets legendary Texan hospitality.'
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'Texas',
    image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=60&w=800',
    description: 'Space City, a culinary and cultural melting pot with world-class museums and parks.'
  }
];

export const CATEGORIES: Category[] = [
  'All', 'Sports', 'Family Activities', 'Entertainment', 'Visitor Attractions', 'Food & Drink', 'Night Life', 'Arts & Culture', 'Outdoors', 'Community'
];

const getRelDate = (daysOut: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [
    { id: 't1', title: 'Tulsa Hub Discovery', cityName: 'Tulsa', category: 'Arts & Culture', description: 'Explore Tulsas Blue Dome District with local artisan markets and pop-up galleries.', date: getRelDate(0), location: 'Downtown Tulsa', venue: 'Blue Dome District', ageRestriction: 'All Ages', isTrending: true, lat: 36.155, lng: -95.985, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1460666819451-74129999a31a?auto=format&fit=crop&q=60&w=800' },
    { id: 't2', title: 'Metro Sports Weekend', cityName: 'Tulsa', category: 'Sports', description: 'Catch the excitement of professional local sports at ONEOK Field.', date: getRelDate(1), location: 'ONEOK Field', venue: 'ONEOK Field', ageRestriction: 'All Ages', isTrending: true, lat: 36.160, lng: -95.993, price: '$15 - $45', imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=60&w=800' },
    { id: 't3', title: 'Riverside Evening Beats', cityName: 'Tulsa', category: 'Entertainment', description: 'Live outdoor performances by regional touring bands.', date: getRelDate(3), location: 'Riverside Dr', venue: 'Gathering Place Stage', ageRestriction: 'All Ages', lat: 36.126, lng: -95.985, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=60&w=800' },
    { id: 't4', title: 'Local Farmers Exchange', cityName: 'Tulsa', category: 'Food & Drink', description: 'Fresh seasonal produce and locally made crafts.', date: getRelDate(0), location: 'Cherry St', venue: 'Cherry Street Market', ageRestriction: 'All Ages', lat: 36.136, lng: -95.969, priceLevel: '$$', imageUrl: 'https://images.unsplash.com/photo-1488459711615-de6185203376?auto=format&fit=crop&q=60&w=800' }
  ],
  okc: [
    { id: 'o1', title: 'Metro Pro Hoops', cityName: 'Oklahoma City', category: 'Sports', description: 'Premier basketball action in the heart of downtown.', date: getRelDate(0), location: 'Downtown OKC', venue: 'Paycom Center', ageRestriction: 'All Ages', isTrending: true, lat: 35.463, lng: -97.515, price: '$35+', imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=60&w=800' },
    { id: 'o2', title: 'Scissortail Saturday Market', cityName: 'Oklahoma City', category: 'Food & Drink', description: 'Community gathering featuring the best of Oklahoma growers.', date: getRelDate(2), location: 'Hudson Ave', venue: 'Scissortail Park', ageRestriction: 'All Ages', lat: 35.461, lng: -97.518, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=60&w=800' },
    { id: 'o3', title: 'Bricktown Live Series', cityName: 'Oklahoma City', category: 'Entertainment', description: 'Street festival with live bands and local shopping.', date: getRelDate(1), location: 'Bricktown', venue: 'Bricktown Square', ageRestriction: 'All Ages', isTrending: true, lat: 35.465, lng: -97.505, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=60&w=800' }
  ],
  dallas: [
    { id: 'd1', title: 'Big D Sports Night', cityName: 'Dallas', category: 'Sports', description: 'Experience the legendary energy of a Dallas home game.', date: getRelDate(0), location: 'Victory Park', venue: 'American Airlines Center', ageRestriction: 'All Ages', isTrending: true, lat: 32.790, lng: -96.810, price: '$45+', imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=60&w=800' },
    { id: 'd2', title: 'Texan Culinary Showcase', cityName: 'Dallas', category: 'Food & Drink', description: 'A massive showcase of the citys finest flavors.', date: getRelDate(1), location: 'Fair Park', venue: 'Main Plaza', ageRestriction: 'All Ages', isTrending: true, lat: 32.778, lng: -96.762, price: '$10 - $25', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=60&w=800' },
    { id: 'd3', title: 'Arts in the Park', cityName: 'Dallas', category: 'Arts & Culture', description: 'Pop-up performances and installations in downtown.', date: getRelDate(2), location: 'Klyde Warren', venue: 'Klyde Warren Park', ageRestriction: 'All Ages', lat: 32.789, lng: -96.801, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1460666819451-74129999a31a?auto=format&fit=crop&q=60&w=800' }
  ],
  houston: [
    { id: 'h1', title: 'Space City Matchup', cityName: 'Houston', category: 'Sports', description: 'Local rivalries flare up in this high-energy sports showdown.', date: getRelDate(0), location: 'Downtown Houston', venue: 'Minute Maid Park', ageRestriction: 'All Ages', isTrending: true, lat: 29.757, lng: -95.355, price: '$20+', imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=60&w=800' },
    { id: 'h2', title: 'Discovery Green Yoga', cityName: 'Houston', category: 'Outdoors', description: 'Morning mindfulness in Houstons central park.', date: getRelDate(0), location: 'Downtown', venue: 'Discovery Green', ageRestriction: 'All Ages', lat: 29.753, lng: -95.359, isFree: true, imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=60&w=800' },
    { id: 'h3', title: 'Museum District Night', cityName: 'Houston', category: 'Arts & Culture', description: 'After-hours access to world-class exhibits.', date: getRelDate(4), location: 'Museum District', venue: 'Museum of Fine Arts', ageRestriction: 'All Ages', isTrending: true, lat: 29.725, lng: -95.390, price: '$15', imageUrl: 'https://images.unsplash.com/photo-1518998053574-53f0209f510d?auto=format&fit=crop&q=60&w=800' }
  ]
};

export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...SEED_EVENTS.tulsa.slice(0, 2),
  ...SEED_EVENTS.okc.slice(0, 2),
  ...SEED_EVENTS.dallas.slice(0, 2),
  ...SEED_EVENTS.houston.slice(0, 2)
];

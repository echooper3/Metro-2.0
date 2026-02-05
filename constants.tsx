
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
    { id: 't1', title: 'Tulsa Oilers vs Wichita Thunder', cityName: 'Tulsa', category: 'Sports', description: 'Experience the roar of the BOK Center as the Tulsa Oilers face off in high-stakes ECHL hockey action.', date: getRelDate(2), time: '7:00 PM', location: 'Downtown Tulsa', venue: 'BOK Center', isTrending: true, price: '$15 - $65', imageUrl: 'https://images.unsplash.com/photo-151271901372c-5d1c5d7184f9?auto=format&fit=crop&q=80&w=800' },
    { id: 't2', title: 'First Friday Art Crawl', cityName: 'Tulsa', category: 'Arts & Culture', description: 'Join thousands of Tulsans in the Arts District for gallery openings, live music, and street performers.', date: getRelDate(5), time: '6:00 PM', location: 'Tulsa Arts District', venue: 'Guthrie Green', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1460666819451-74129999a31a?auto=format&fit=crop&q=80&w=800' },
    { id: 't3', title: 'Gathering Place Story Time', cityName: 'Tulsa', category: 'Family Activities', description: 'Outdoor storytelling and puppet shows at the world-renowned Gathering Place park.', date: getRelDate(1), time: '10:00 AM', location: 'Riverside Dr', venue: 'Gathering Place', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=800' },
    { id: 't4', title: 'Cain\'s Ballroom: Live Concert', cityName: 'Tulsa', category: 'Entertainment', description: 'Rock out at the historic Home of Bob Wills with local and touring indie bands.', date: getRelDate(4), time: '8:00 PM', location: 'N Main St', venue: 'Cain\'s Ballroom', price: '$25 - $40', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
    { id: 't5', title: 'Blue Dome District Food Tour', cityName: 'Tulsa', category: 'Food & Drink', description: 'Sample the best of Tulsa\'s culinary scene, from street tacos to gourmet desserts.', date: getRelDate(3), time: '5:30 PM', location: 'Blue Dome District', venue: 'Various Restaurants', price: '$55', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800' }
  ],
  okc: [
    { id: 'o1', title: 'OKC Thunder Home Game', cityName: 'Oklahoma City', category: 'Sports', description: 'Witness NBA superstars live at the Paycom Center in a thrilling match-up of professional basketball.', date: getRelDate(1), time: '7:30 PM', location: 'Downtown OKC', venue: 'Paycom Center', isTrending: true, price: '$35+', imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800' },
    { id: 'o2', title: 'Scissortail Park Farmer\'s Market', cityName: 'Oklahoma City', category: 'Community', description: 'Oklahoma\'s premier open-air market featuring local growers, makers, and artisans.', date: getRelDate(0), time: '9:00 AM', location: 'Hudson Ave', venue: 'Scissortail Park', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1488459711615-de6185203376?auto=format&fit=crop&q=80&w=800' },
    { id: 'o3', title: 'Bricktown Canal Walk', cityName: 'Oklahoma City', category: 'Visitor Attractions', description: 'Explore the heart of OKC\'s entertainment district via the scenic Bricktown Canal.', date: getRelDate(0), time: 'All Day', location: 'Bricktown', venue: 'Bricktown Canal', isFree: false, price: '$12', imageUrl: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=80&w=800' },
    { id: 'o4', title: 'Stockyards City Rodeo', cityName: 'Oklahoma City', category: 'Outdoors', description: 'Authentic Western rodeo events in the historic Stockyards City district.', date: getRelDate(6), time: '2:00 PM', location: 'Stockyards City', venue: 'Rodeo Arena', price: '$20', imageUrl: 'https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&q=80&w=800' }
  ],
  dallas: [
    { id: 'd1', title: 'Dallas Cowboys Game Day', cityName: 'Dallas', category: 'Sports', description: 'Cheer on America\'s Team at the massive AT&T Stadium for an unforgettable NFL experience.', date: getRelDate(1), time: '12:00 PM', location: 'Arlington', venue: 'AT&T Stadium', isTrending: true, price: '$85+', imageUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=800' },
    { id: 'd2', title: 'Deep Ellum Jazz Night', cityName: 'Dallas', category: 'Night Life', description: 'Smooth jazz and blues in the legendary Deep Ellum district, the soul of Dallas music.', date: getRelDate(3), time: '9:00 PM', location: 'Deep Ellum', venue: 'The Free Man', isFree: false, price: '$10', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800' },
    { id: 'd3', title: 'Dallas Museum of Art Free Tour', cityName: 'Dallas', category: 'Arts & Culture', description: 'Explore over 5,000 years of history at one of the largest art museums in the country.', date: getRelDate(0), time: '11:00 AM', location: 'Arts District', venue: 'Dallas Museum of Art', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1518998053574-53f0209f510d?auto=format&fit=crop&q=80&w=800' },
    { id: 'd4', title: 'Klyde Warren Park Yoga', cityName: 'Dallas', category: 'Outdoors', description: 'Find your zen with a free community yoga class on the Great Lawn above the highway.', date: getRelDate(1), time: '8:30 AM', location: 'Downtown Dallas', venue: 'Klyde Warren Park', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800' }
  ],
  houston: [
    { id: 'h1', title: 'Astros vs Rangers Rivalry', cityName: 'Houston', category: 'Sports', description: 'Grab some cracker jacks and witness the Lone Star Series at Minute Maid Park.', date: getRelDate(2), time: '6:10 PM', location: 'Downtown Houston', venue: 'Minute Maid Park', isTrending: true, price: '$25+', imageUrl: 'https://images.unsplash.com/photo-1508344922928-5321117196f7?auto=format&fit=crop&q=80&w=800' },
    { id: 'h2', title: 'Space Center Houston Experience', cityName: 'Houston', category: 'Visitor Attractions', description: 'Go behind the scenes of NASA\'s Mission Control and explore real moon rocks.', date: getRelDate(0), time: '10:00 AM', location: 'Nasa Rd', venue: 'Space Center Houston', price: '$29', imageUrl: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&q=80&w=800' },
    { id: 'h3', title: 'Museum District Food Truck Festival', cityName: 'Houston', category: 'Food & Drink', description: 'The city\'s best mobile eateries gather for a massive celebration of Houston flavors.', date: getRelDate(4), time: '12:00 PM', location: 'Montrose', venue: 'Hermann Park', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&q=80&w=800' },
    { id: 'h4', title: 'Discovery Green Movie Night', cityName: 'Houston', category: 'Entertainment', description: 'Bring a blanket and enjoy a family-friendly film under the Houston skyline.', date: getRelDate(5), time: '7:30 PM', location: 'Downtown', venue: 'Discovery Green', isFree: true, imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800' }
  ]
};

export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...SEED_EVENTS.tulsa.slice(0, 3),
  ...SEED_EVENTS.okc.slice(0, 3),
  ...SEED_EVENTS.dallas.slice(0, 3),
  ...SEED_EVENTS.houston.slice(0, 3)
];

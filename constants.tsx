
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
    image: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=80&w=800',
    description: 'A global commercial hub where culture meets legendary Texan hospitality.'
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'Texas',
    image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=80&w=800',
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

const generateCitySeeds = (city: string): EventActivity[] => {
  const events: EventActivity[] = [];
  const categories: Category[] = ['Sports', 'Family Activities', 'Entertainment', 'Visitor Attractions', 'Food & Drink', 'Night Life', 'Arts & Culture', 'Outdoors', 'Community'];
  
  categories.forEach((cat, idx) => {
    [0, 2, 7, 30].forEach((days, dIdx) => {
      const daysOffset = days + idx;
      events.push({
        id: `seed-${city.toLowerCase()}-${cat.toLowerCase()}-${dIdx}`,
        title: `${city} ${cat} Showcase: Series ${dIdx + 1}`,
        cityName: city,
        category: cat,
        description: `Experience the best of ${cat} in the heart of ${city}. This recurring series features local favorites and specialized curators. Don't miss out on the ${dIdx === 0 ? 'upcoming' : dIdx === 1 ? 'mid-season' : dIdx === 2 ? 'penultimate' : 'season finale'} highlight. Explore the rich heritage and community spirit of ${city}.`,
        date: getRelDate(daysOffset),
        time: idx % 2 === 0 ? '7:00 PM' : '2:00 PM',
        venue: `${city} Central ${cat} Hub`,
        location: `Main St, ${city}`,
        price: idx % 3 === 0 ? '$25' : undefined,
        isFree: idx % 3 !== 0,
        isTrending: daysOffset <= 7, 
        ageRestriction: cat === 'Night Life' ? '21+' : (cat === 'Entertainment' && idx % 2 === 0 ? '18+' : 'All Ages'),
        organizerName: `${city} ${cat} Association`,
        organizerUrl: `https://www.inside-the-metro.com/hosts/${city.toLowerCase()}`,
        organizerContact: `contact@${city.toLowerCase()}-${cat.toLowerCase().replace(/\s/g, '')}.org`,
        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + idx * 1000 + dIdx}?auto=format&fit=crop&q=60&w=800`
      });
    });
  });
  return events;
};

export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: generateCitySeeds('Tulsa'),
  okc: generateCitySeeds('Oklahoma City'),
  dallas: generateCitySeeds('Dallas'),
  houston: generateCitySeeds('Houston'),
};

export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...SEED_EVENTS.tulsa.slice(0, 10),
  ...SEED_EVENTS.okc.slice(0, 10),
  ...SEED_EVENTS.dallas.slice(0, 10),
  ...SEED_EVENTS.houston.slice(0, 10)
].map(e => ({...e, isTrending: true}));

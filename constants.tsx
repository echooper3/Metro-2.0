
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
    // Skip Tulsa Sports, Family Activities, Entertainment, Visitor Attractions, Food & Drink, Night Life, Arts & Culture, Outdoors, and Community Showcase series as requested
    if (city === 'Tulsa' && (cat === 'Sports' || cat === 'Family Activities' || cat === 'Entertainment' || cat === 'Visitor Attractions' || cat === 'Food & Drink' || cat === 'Night Life' || cat === 'Arts & Culture' || cat === 'Outdoors' || cat === 'Community')) return;

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

const REAL_SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [
    {
      id: 't-1',
      title: 'Tulsa Mayfest 2026',
      cityName: 'Tulsa',
      category: 'Arts & Culture',
      description: 'The premier arts and crafts festival in downtown Tulsa. Featuring over 100 artists, live music, and local food vendors.',
      date: '05/15/2026',
      time: '11:00 AM',
      venue: 'Arts District',
      location: 'Main St & Archer, Tulsa, OK',
      isFree: true,
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 't-2',
      title: 'FC Tulsa vs San Antonio',
      cityName: 'Tulsa',
      category: 'Sports',
      description: 'USL Championship soccer at ONEOK Field. Experience the electric atmosphere of the 918.',
      date: getRelDate(2),
      time: '7:30 PM',
      venue: 'ONEOK Field',
      location: '201 N Elgin Ave, Tulsa, OK',
      price: '$15 - $45',
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'
    }
  ],
  okc: [
    {
      id: 'okc-1',
      title: 'OKC Thunder vs Warriors',
      cityName: 'Oklahoma City',
      category: 'Sports',
      description: 'Catch the young Thunder core taking on the veteran Warriors in a high-stakes Western Conference matchup.',
      date: getRelDate(1),
      time: '7:00 PM',
      venue: 'Paycom Center',
      location: '100 W Reno Ave, Oklahoma City, OK',
      price: '$45+',
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'okc-2',
      title: 'Riversport Whitewater Rafting',
      cityName: 'Oklahoma City',
      category: 'Outdoors',
      description: 'Experience Olympic-class whitewater rafting in the heart of downtown OKC.',
      date: getRelDate(0),
      time: '10:00 AM',
      venue: 'Riversport OKC',
      location: '800 Riversport Dr, Oklahoma City, OK',
      price: '$49',
      isTrending: false,
      imageUrl: 'https://images.unsplash.com/photo-1530866495547-083978a21e36?auto=format&fit=crop&q=80&w=800'
    }
  ],
  dallas: [
    {
      id: 'd-1',
      title: 'Dallas Mavericks Playoff Watch Party',
      cityName: 'Dallas',
      category: 'Sports',
      description: 'Join thousands of MFFLs at Victory Park to cheer on Luka and the Mavs on the big screen.',
      date: getRelDate(0),
      time: '8:30 PM',
      venue: 'Victory Park',
      location: '2500 Victory Ave, Dallas, TX',
      isFree: true,
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'd-2',
      title: 'Deep Ellum Jazz Night',
      cityName: 'Dallas',
      category: 'Night Life',
      description: 'A night of soulful jazz and blues in the historic Deep Ellum district.',
      date: getRelDate(3),
      time: '10:00 PM',
      venue: 'The Free Man',
      location: '2626-2630 Commerce St, Dallas, TX',
      isFree: false,
      price: '$10',
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800'
    }
  ],
  houston: [
    {
      id: 'h-1',
      title: 'Houston Astros vs Rangers',
      cityName: 'Houston',
      category: 'Sports',
      description: 'The Lone Star Series continues at Minute Maid Park. Go Stros!',
      date: getRelDate(1),
      time: '6:10 PM',
      venue: 'Minute Maid Park',
      location: '501 Crawford St, Houston, TX',
      price: '$20+',
      isTrending: true,
      imageUrl: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'h-2',
      title: 'NASA Space Center Tour',
      cityName: 'Houston',
      category: 'Visitor Attractions',
      description: 'Go behind the scenes of human space exploration at the official visitor center of NASA Johnson Space Center.',
      date: getRelDate(0),
      time: '9:00 AM',
      venue: 'Space Center Houston',
      location: '1601 E NASA Pkwy, Houston, TX',
      price: '$29.95',
      isTrending: false,
      imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800'
    }
  ]
};

export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [...REAL_SEED_EVENTS.tulsa, ...generateCitySeeds('Tulsa')],
  okc: [...REAL_SEED_EVENTS.okc, ...generateCitySeeds('Oklahoma City')],
  dallas: [...REAL_SEED_EVENTS.dallas, ...generateCitySeeds('Dallas')],
  houston: [...REAL_SEED_EVENTS.houston, ...generateCitySeeds('Houston')],
};

export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...REAL_SEED_EVENTS.tulsa,
  ...REAL_SEED_EVENTS.okc,
  ...REAL_SEED_EVENTS.dallas,
  ...REAL_SEED_EVENTS.houston
];

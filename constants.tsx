
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

// Seed Events for instant rendering and Netlify fallback
export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [
    { id: 't1', title: 'Union vs. Jenks Rivalry Game', cityName: 'Tulsa', category: 'Sports', description: 'Experience the legendary "Backyard Bowl" high school football game. A Tulsa tradition.', date: '11/08/2024', location: 'Skelly Field', venue: 'H.A. Chapman Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 36.148, lng: -95.944 },
    { id: 't2', title: 'FC Tulsa Home Match', cityName: 'Tulsa', category: 'Sports', description: 'Professional USL Championship soccer in the heart of downtown.', date: '10/26/2024', location: 'ONEOK Field', venue: 'ONEOK Field', ageRestriction: 'All Ages', isTrending: true, lat: 36.160, lng: -95.993 },
    { id: 't3', title: 'Youth Soccer Saturday', cityName: 'Tulsa', category: 'Sports', description: 'Regional youth soccer tournament featuring clubs from across Green Country.', date: '10/19/2024', location: 'Mohawk Park', venue: 'Mohawk Sports Complex', ageRestriction: 'All Ages', lat: 36.216, lng: -95.903 },
    { id: 't4', title: 'Owasso Rams vs Broken Arrow Tigers', cityName: 'Tulsa', category: 'Sports', description: 'High school football clash between two of the top programs in the state.', date: '10/25/2024', location: 'Owasso, OK', venue: 'Rams Stadium', ageRestriction: 'All Ages', lat: 36.269, lng: -95.845 },
    { id: 't5', title: 'Art Deco Walking Tour', cityName: 'Tulsa', category: 'Arts & Culture', description: 'Explore Tulsas world-class architecture on this guided historical walk.', date: '10/20/2024', location: 'Downtown Tulsa', venue: 'Philcade Building', ageRestriction: 'All Ages', lat: 36.151, lng: -95.989 },
    { id: 't6', title: 'Blue Dome Live Jazz', cityName: 'Tulsa', category: 'Night Life', description: 'Late night soulful jazz performances at Tulsas premier music lounge.', date: '10/18/2024', location: 'Blue Dome District', venue: 'The Colony', ageRestriction: '21+', lat: 36.155, lng: -95.985 },
    { id: 't7', title: 'Bixby Spartans Football', cityName: 'Tulsa', category: 'Sports', description: 'Local High School dominance. Watch the Spartans take on regional challengers.', date: '10/25/2024', location: 'Bixby, OK', venue: 'Bixby Stadium', ageRestriction: 'All Ages', lat: 35.942, lng: -95.883 },
    { id: 't8', title: 'Gathering Place Family Day', cityName: 'Tulsa', category: 'Family Activities', description: 'Interactive exhibits and play areas for children of all ages at Tulsas iconic park.', date: '10/20/2024', location: 'Riverside Dr', venue: 'Gathering Place', ageRestriction: 'All Ages', lat: 36.126, lng: -95.985 },
    { id: 't9', title: 'Cain\'s Ballroom Concert', cityName: 'Tulsa', category: 'Entertainment', description: 'Live music at the historic home of Bob Wills.', date: '11/02/2024', location: 'N Main St', venue: 'Cain\'s Ballroom', ageRestriction: 'All Ages', lat: 36.161, lng: -95.994 },
    { id: 't10', title: 'Cherry Street Market', cityName: 'Tulsa', category: 'Food & Drink', description: 'Local farmers and artisans gather for Tulsas favorite morning market.', date: '10/19/2024', location: '15th Street', venue: 'Cherry Street', ageRestriction: 'All Ages', lat: 36.134, lng: -95.968 }
  ],
  okc: [
    { id: 'o1', title: 'OKC Thunder vs Warriors', cityName: 'Oklahoma City', category: 'Sports', description: 'NBA action at the Paycom Center. High-intensity professional basketball.', date: '11/10/2024', location: 'Downtown OKC', venue: 'Paycom Center', ageRestriction: 'All Ages', isTrending: true, lat: 35.463, lng: -97.515 },
    { id: 'o2', title: 'Westmoore vs Southmoore', cityName: 'Oklahoma City', category: 'Sports', description: 'Massive local high school rivalry game known as the Moore Bowl.', date: '10/25/2024', location: 'Moore, OK', venue: 'Moore Schools Stadium', ageRestriction: 'All Ages', lat: 35.339, lng: -97.486 },
    { id: 'o3', title: 'Youth Baseball Regionals', cityName: 'Oklahoma City', category: 'Sports', description: 'The next generation of stars compete in the regional qualifiers.', date: '10/20/2024', location: 'Western Ave', venue: 'Wheeler Park', ageRestriction: 'All Ages', lat: 35.454, lng: -97.531 },
    { id: 'o4', title: 'Mustang Broncos Home Game', cityName: 'Oklahoma City', category: 'Sports', description: 'Watch the Mustang High School Broncos take on regional rivals.', date: '11/01/2024', location: 'Mustang, OK', venue: 'Bronco Stadium', ageRestriction: 'All Ages', lat: 35.391, lng: -97.727 },
    { id: 'o5', title: 'Scissortail Park Night Market', cityName: 'Oklahoma City', category: 'Food & Drink', description: 'Food trucks, local vendors, and live music under the stars.', date: '10/18/2024', location: 'Hudson Ave', venue: 'Scissortail Park', ageRestriction: 'All Ages', lat: 35.461, lng: -97.518 },
    { id: 'o6', title: 'Edmond Memorial XC Invite', cityName: 'Oklahoma City', category: 'Sports', description: 'Elite high school cross country invitational tournament.', date: '10/19/2024', location: 'Edmond, OK', venue: 'Santa Fe HS Grounds', ageRestriction: 'All Ages', lat: 35.652, lng: -97.478 },
    { id: 'o7', title: 'Bricktown Brewery Tour', cityName: 'Oklahoma City', category: 'Food & Drink', description: 'Sample the best of Oklahoma brewing in the heart of Bricktown.', date: '10/19/2024', location: 'Bricktown', venue: 'Bricktown Brewery', ageRestriction: '21+', lat: 35.466, lng: -97.509 },
    { id: 'o8', title: 'Science Museum After Dark', cityName: 'Oklahoma City', category: 'Entertainment', description: 'Adults-only night at the museum with experiments and cocktails.', date: '11/01/2024', location: 'Remington Pl', venue: 'Science Museum Oklahoma', ageRestriction: '21+', lat: 35.523, lng: -97.472 },
    { id: 'o9', title: 'First Americans Festival', cityName: 'Oklahoma City', category: 'Community', description: 'Celebrating the heritage and culture of the 39 tribal nations.', date: '11/15/2024', location: 'FAM Dr', venue: 'First Americans Museum', ageRestriction: 'All Ages', lat: 35.438, lng: -97.491 },
    { id: 'o10', title: 'Paseo Arts Stroll', cityName: 'Oklahoma City', category: 'Arts & Culture', description: 'Explore the galleries and studios of the historic Paseo Arts District.', date: '11/01/2024', location: 'Paseo', venue: 'Paseo Arts District', ageRestriction: 'All Ages', lat: 35.494, lng: -97.522 }
  ],
  dallas: [
    { id: 'd1', title: 'Allen vs Highland Park', cityName: 'Dallas', category: 'Sports', description: 'Top-tier Texas High School Football. A massive stadium atmosphere.', date: '11/01/2024', location: 'Allen, TX', venue: 'Eagle Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 33.094, lng: -96.657 },
    { id: 'd2', title: 'Dallas Mavericks Home Game', cityName: 'Dallas', category: 'Sports', description: 'Watch Luka Doncic and the Mavs take on the NBAs best.', date: '11/05/2024', location: 'Victory Park', venue: 'American Airlines Center', ageRestriction: 'All Ages', isTrending: true, lat: 32.790, lng: -96.810 },
    { id: 'd3', title: 'Youth Soccer Cup - Dallas', cityName: 'Dallas', category: 'Sports', description: 'International youth soccer showcase featuring elite academy teams.', date: '10/19/2024', location: 'Plano, TX', venue: 'MoneyGram Soccer Park', ageRestriction: 'All Ages', lat: 32.887, lng: -96.907 },
    { id: 'd4', title: 'Southlake Carroll Dragons Game', cityName: 'Dallas', category: 'Sports', description: 'Experience the pride of Texas High School football in Southlake.', date: '10/25/2024', location: 'Southlake, TX', venue: 'Dragon Stadium', ageRestriction: 'All Ages', lat: 32.948, lng: -97.129 },
    { id: 'd5', title: 'Prosper HS Volley Tourney', cityName: 'Dallas', category: 'Sports', description: 'Local High School girls volleyball championships.', date: '10/24/2024', location: 'Prosper, TX', venue: 'Prosper Arena', ageRestriction: 'All Ages', lat: 33.236, lng: -96.797 },
    { id: 'd6', title: 'State Fair of Texas', cityName: 'Dallas', category: 'Visitor Attractions', description: 'Deep fried food, games, and the famous Big Tex.', date: '10/18/2024', location: 'Fair Park', venue: 'Cotton Bowl Grounds', ageRestriction: 'All Ages', lat: 32.778, lng: -96.762 },
    { id: 'd7', title: 'Dallas Museum of Art', cityName: 'Dallas', category: 'Arts & Culture', description: 'One of the largest art museums in America with free admission.', date: '10/21/2024', location: 'Harwood St', venue: 'DMA', ageRestriction: 'All Ages', lat: 32.788, lng: -96.801 },
    { id: 'd8', title: 'Klyde Warren Park Yoga', cityName: 'Dallas', category: 'Outdoors', description: 'Free outdoor morning yoga session in the park over the freeway.', date: '10/19/2024', location: 'Woodall Rodgers Fwy', venue: 'Klyde Warren Park', ageRestriction: 'All Ages', lat: 32.789, lng: -96.801 },
    { id: 'd9', title: 'Deep Ellum Rooftop Party', cityName: 'Dallas', category: 'Night Life', description: 'Vibrant nightlife with DJs and skyline views.', date: '10/19/2024', location: 'Deep Ellum', venue: 'The Nines', ageRestriction: '21+', lat: 32.784, lng: -96.784 },
    { id: 'd10', title: 'Plano Balloon Festival', cityName: 'Dallas', category: 'Family Activities', description: 'Massive hot air balloon display and family activities.', date: '10/25/2024', location: 'Plano, TX', venue: 'Oak Point Park', ageRestriction: 'All Ages', lat: 33.045, lng: -96.671 }
  ],
  houston: [
    { id: 'h1', title: 'Katy vs North Shore', cityName: 'Houston', category: 'Sports', description: 'The peak of Texas High School Football. National ranking showdown.', date: '11/15/2024', location: 'Katy, TX', venue: 'Legacy Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 29.805, lng: -95.773 },
    { id: 'h2', title: 'Houston Astros Playoffs', cityName: 'Houston', category: 'Sports', description: 'Professional MLB action at Minute Maid Park.', date: '10/18/2024', location: 'Downtown Houston', venue: 'Minute Maid Park', ageRestriction: 'All Ages', isTrending: true, lat: 29.757, lng: -95.355 },
    { id: 'h3', title: 'Youth Swim State Finals', cityName: 'Houston', category: 'Sports', description: 'Texas age-group swimming championships at the Woodlands.', date: '11/02/2024', location: 'The Woodlands', venue: 'CISD Natatorium', ageRestriction: 'All Ages', lat: 30.158, lng: -95.452 },
    { id: 'h4', title: 'Cypress Creek vs Cy-Fair', cityName: 'Houston', category: 'Sports', description: 'Massive district rivalry in Houston area High School football.', date: '10/25/2024', location: 'Cypress, TX', venue: 'Berry Center', ageRestriction: 'All Ages', lat: 29.932, lng: -95.694 },
    { id: 'h5', title: 'Pearland Little League Tourney', cityName: 'Houston', category: 'Sports', description: 'Watching the stars of the future in a competitive regional tournament.', date: '10/19/2024', location: 'Pearland, TX', venue: 'Little League Fields', ageRestriction: 'All Ages', lat: 29.563, lng: -95.286 },
    { id: 'h6', title: 'Space Center Houston Tours', cityName: 'Houston', category: 'Visitor Attractions', description: 'Go behind the scenes of NASA mission control.', date: '10/20/2024', location: 'NASA Pkwy', venue: 'Space Center Houston', ageRestriction: 'All Ages', lat: 29.551, lng: -95.097 },
    { id: 'h7', title: 'Hermann Park Kite Festival', cityName: 'Houston', category: 'Family Activities', description: 'A colorful sky and family fun in Houstons central park.', date: '11/03/2024', location: 'Fannin St', venue: 'Miller Outdoor Theatre', ageRestriction: 'All Ages', lat: 29.722, lng: -95.390 },
    { id: 'h8', title: 'EaDo Night Market', cityName: 'Houston', category: 'Food & Drink', description: 'Asian-inspired food and artisan shopping in East Downtown.', date: '10/25/2024', location: 'EaDo', venue: 'EaDo District', ageRestriction: 'All Ages', lat: 29.752, lng: -95.352 },
    { id: 'h9', title: 'Museum of Fine Arts Tours', cityName: 'Houston', category: 'Arts & Culture', description: 'World-class collections in the Houston Museum District.', date: '10/19/2024', location: 'Bissonnet St', venue: 'MFAH', ageRestriction: 'All Ages', lat: 29.725, lng: -95.390 },
    { id: 'h10', title: 'Galveston Beach Run', cityName: 'Houston', category: 'Outdoors', description: '5K and 10K run along the historic Galveston Seawall.', date: '10/19/2024', location: 'Galveston, TX', venue: 'Seawall Blvd', ageRestriction: 'All Ages', lat: 29.278, lng: -94.814 }
  ]
};

// Mix of the best events for the "All Cities" view or search landing
export const GLOBAL_SEED_EVENTS: EventActivity[] = [
  ...SEED_EVENTS.tulsa.slice(0, 3),
  ...SEED_EVENTS.okc.slice(0, 3),
  ...SEED_EVENTS.dallas.slice(0, 3),
  ...SEED_EVENTS.houston.slice(0, 3)
];

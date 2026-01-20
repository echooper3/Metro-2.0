
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

// 10 Seed Events for each city to enable instant rendering
export const SEED_EVENTS: Record<string, EventActivity[]> = {
  tulsa: [
    { id: 's1', title: 'Union vs. Jenks Rivalry Game', category: 'Sports', description: 'Experience the legendary "Backyard Bowl" high school football game. A Tulsa tradition.', date: '11/08/2024', location: 'Skelly Field', venue: 'H.A. Chapman Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 36.148, lng: -95.944 },
    { id: 's2', title: 'FC Tulsa Home Match', category: 'Sports', description: 'Professional USL Championship soccer in the heart of downtown.', date: '10/26/2024', location: 'ONEOK Field', venue: 'ONEOK Field', ageRestriction: 'All Ages', isTrending: true, lat: 36.160, lng: -95.993 },
    { id: 's3', title: 'Youth Soccer Saturday', category: 'Sports', description: 'Regional youth soccer tournament featuring clubs from across Green Country.', date: '10/19/2024', location: 'Mohawk Park', venue: 'Mohawk Sports Complex', ageRestriction: 'All Ages', lat: 36.216, lng: -95.903 },
    { id: 's4', title: 'Art Deco Walking Tour', category: 'Arts & Culture', description: 'Explore Tulsas world-class architecture on this guided historical walk.', date: '10/20/2024', location: 'Downtown Tulsa', venue: 'Philcade Building', ageRestriction: 'All Ages', lat: 36.151, lng: -95.989 },
    { id: 's5', title: 'Blue Dome Live Jazz', category: 'Night Life', description: 'Late night soulful jazz performances at Tulsas premier music lounge.', date: '10/18/2024', location: 'Blue Dome District', venue: 'The Colony', ageRestriction: '21+', lat: 36.155, lng: -95.985 },
    { id: 's6', title: 'Bixby Spartans Football', category: 'Sports', description: 'Local High School dominance. Watch the Spartans take on regional challengers.', date: '10/25/2024', location: 'Bixby, OK', venue: 'Bixby Stadium', ageRestriction: 'All Ages', lat: 35.942, lng: -95.883 },
    { id: 's7', title: 'Gathering Place Family Day', category: 'Family Activities', description: 'Interactive exhibits and play areas for children of all ages at Tulsas iconic park.', date: '10/20/2024', location: 'Riverside Dr', venue: 'Gathering Place', ageRestriction: 'All Ages', lat: 36.126, lng: -95.985 },
    { id: 's8', title: 'Cain\'s Ballroom Concert', category: 'Entertainment', description: 'Live music at the historic home of Bob Wills.', date: '11/02/2024', location: 'N Main St', venue: 'Cain\'s Ballroom', ageRestriction: 'All Ages', lat: 36.161, lng: -95.994 },
    { id: 's9', title: 'Cherry Street Market', category: 'Food & Drink', description: 'Local farmers and artisans gather for Tulsas favorite morning market.', date: '10/19/2024', location: '15th Street', venue: 'Cherry Street', ageRestriction: 'All Ages', lat: 36.134, lng: -95.968 },
    { id: 's10', title: 'Philbrook Museum Tours', category: 'Arts & Culture', description: 'Renaissance art and stunning gardens in an Italianate villa.', date: '10/22/2024', location: 'Rockford Rd', venue: 'Philbrook Museum of Art', ageRestriction: 'All Ages', lat: 36.130, lng: -95.966 }
  ],
  okc: [
    { id: 's11', title: 'OKC Thunder vs Warriors', category: 'Sports', description: 'NBA action at the Paycom Center. High-intensity professional basketball.', date: '11/10/2024', location: 'Downtown OKC', venue: 'Paycom Center', ageRestriction: 'All Ages', isTrending: true, lat: 35.463, lng: -97.515 },
    { id: 's12', title: 'Westmoore vs Southmoore', category: 'Sports', description: 'Massive local high school rivalry game. Experience OKC spirit.', date: '10/25/2024', location: 'Moore, OK', venue: 'Moore Schools Stadium', ageRestriction: 'All Ages', lat: 35.339, lng: -97.486 },
    { id: 's13', title: 'Youth Baseball Regionals', category: 'Sports', description: 'The next generation of stars compete in the regional qualifiers.', date: '10/20/2024', location: 'Western Ave', venue: 'Wheeler Park', ageRestriction: 'All Ages', lat: 35.454, lng: -97.531 },
    { id: 's14', title: 'Scissortail Park Night Market', category: 'Food & Drink', description: 'Food trucks, local vendors, and live music under the stars.', date: '10/18/2024', location: 'Hudson Ave', venue: 'Scissortail Park', ageRestriction: 'All Ages', lat: 35.461, lng: -97.518 },
    { id: 's15', title: 'Edmond Memorial XC Invite', category: 'Sports', description: 'Elite high school cross country invitational tournament.', date: '10/19/2024', location: 'Edmond, OK', venue: 'Santa Fe HS Grounds', ageRestriction: 'All Ages', lat: 35.652, lng: -97.478 },
    { id: 's16', title: 'Bricktown Brewery Tour', category: 'Food & Drink', description: 'Sample the best of Oklahoma brewing in the heart of Bricktown.', date: '10/19/2024', location: 'Bricktown', venue: 'Bricktown Brewery', ageRestriction: '21+', lat: 35.466, lng: -97.509 },
    { id: 's17', title: 'Science Museum After Dark', category: 'Entertainment', description: 'Adults-only night at the museum with experiments and cocktails.', date: '11/01/2024', location: 'Remington Pl', venue: 'Science Museum Oklahoma', ageRestriction: '21+', lat: 35.523, lng: -97.472 },
    { id: 's18', title: 'First Americans Festival', category: 'Community', description: 'Celebrating the heritage and culture of the 39 tribal nations.', date: '11/15/2024', location: 'FAM Dr', venue: 'First Americans Museum', ageRestriction: 'All Ages', lat: 35.438, lng: -97.491 },
    { id: 's19', title: 'Paseo Arts Stroll', category: 'Arts & Culture', description: 'Explore the galleries and studios of the historic Paseo Arts District.', date: '11/01/2024', location: 'Paseo', venue: 'Paseo Arts District', ageRestriction: 'All Ages', lat: 35.494, lng: -97.522 },
    { id: 's20', title: 'OKC Dodgers Baseball', category: 'Sports', description: 'AAA Professional baseball action with the Dodgers affiliate.', date: '10/24/2024', location: 'Bricktown', venue: 'Chickasaw Bricktown Ballpark', ageRestriction: 'All Ages', lat: 35.465, lng: -97.508 }
  ],
  dallas: [
    { id: 's21', title: 'Allen vs Highland Park', category: 'Sports', description: 'Top-tier Texas High School Football. A massive stadium atmosphere.', date: '11/01/2024', location: 'Allen, TX', venue: 'Eagle Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 33.094, lng: -96.657 },
    { id: 's22', title: 'Dallas Mavericks Home Game', category: 'Sports', description: 'Watch Luka Doncic and the Mavs take on the NBAs best.', date: '11/05/2024', location: 'Victory Park', venue: 'American Airlines Center', ageRestriction: 'All Ages', isTrending: true, lat: 32.790, lng: -96.810 },
    { id: 's23', title: 'Youth Soccer Cup - Dallas', category: 'Sports', description: 'International youth soccer showcase featuring elite academy teams.', date: '10/19/2024', location: 'Plano, TX', venue: 'MoneyGram Soccer Park', ageRestriction: 'All Ages', lat: 32.887, lng: -96.907 },
    { id: 's24', title: 'Bishop Arts Jazz Brunch', category: 'Food & Drink', description: 'Gourmet brunch paired with smooth live jazz in Dallas coolest neighborhood.', date: '10/20/2024', location: 'Oak Cliff', venue: 'Bishop Arts District', ageRestriction: 'All Ages', lat: 32.747, lng: -96.828 },
    { id: 's25', title: 'Prosper HS Volley Tourney', category: 'Sports', description: 'Local High School girls volleyball championships.', date: '10/24/2024', location: 'Prosper, TX', venue: 'Prosper Arena', ageRestriction: 'All Ages', lat: 33.236, lng: -96.797 },
    { id: 's26', title: 'State Fair of Texas', category: 'Visitor Attractions', description: 'Deep fried food, games, and the famous Big Tex.', date: '10/18/2024', location: 'Fair Park', venue: 'Cotton Bowl Grounds', ageRestriction: 'All Ages', lat: 32.778, lng: -96.762 },
    { id: 's27', title: 'Dallas Museum of Art', category: 'Arts & Culture', description: 'One of the largest art museums in America with free admission.', date: '10/21/2024', location: 'Harwood St', venue: 'DMA', ageRestriction: 'All Ages', lat: 32.788, lng: -96.801 },
    { id: 's28', title: 'Klyde Warren Park Yoga', category: 'Outdoors', description: 'Free outdoor morning yoga session in the park over the freeway.', date: '10/19/2024', location: 'Woodall Rodgers Fwy', venue: 'Klyde Warren Park', ageRestriction: 'All Ages', lat: 32.789, lng: -96.801 },
    { id: 's29', title: 'Deep Ellum Rooftop Party', category: 'Night Life', description: 'Vibrant nightlife with DJs and skyline views.', date: '10/19/2024', location: 'Deep Ellum', venue: 'The Nines', ageRestriction: '21+', lat: 32.784, lng: -96.784 },
    { id: 's30', title: 'Plano Balloon Festival', category: 'Family Activities', description: 'Massive hot air balloon display and family activities.', date: '10/25/2024', location: 'Plano, TX', venue: 'Oak Point Park', ageRestriction: 'All Ages', lat: 33.045, lng: -96.671 }
  ],
  houston: [
    { id: 's31', title: 'Katy vs North Shore', category: 'Sports', description: 'The peak of Texas High School Football. National ranking showdown.', date: '11/15/2024', location: 'Katy, TX', venue: 'Legacy Stadium', ageRestriction: 'All Ages', isTrending: true, lat: 29.805, lng: -95.773 },
    { id: 's32', title: 'Houston Astros Playoffs', category: 'Sports', description: 'Professional MLB action at Minute Maid Park.', date: '10/18/2024', location: 'Downtown Houston', venue: 'Minute Maid Park', ageRestriction: 'All Ages', isTrending: true, lat: 29.757, lng: -95.355 },
    { id: 's33', title: 'Youth Swim State Finals', category: 'Sports', description: 'Texas age-group swimming championships at the Woodlands.', date: '11/02/2024', location: 'The Woodlands', venue: 'CISD Natatorium', ageRestriction: 'All Ages', lat: 30.158, lng: -95.452 },
    { id: 's34', title: 'Space Center Houston Tours', category: 'Visitor Attractions', description: 'Go behind the scenes of NASA mission control.', date: '10/20/2024', location: 'NASA Pkwy', venue: 'Space Center Houston', ageRestriction: 'All Ages', lat: 29.551, lng: -95.097 },
    { id: 's35', title: 'Cy-Fair HS Band Festival', category: 'Arts & Culture', description: 'Local High School marching band showcase competition.', date: '10/26/2024', location: 'Cypress, TX', venue: 'Berry Center', ageRestriction: 'All Ages', lat: 29.932, lng: -95.694 },
    { id: 's36', title: 'Hermann Park Kite Festival', category: 'Family Activities', description: 'A colorful sky and family fun in Houstons central park.', date: '11/03/2024', location: 'Fannin St', venue: 'Miller Outdoor Theatre', ageRestriction: 'All Ages', lat: 29.722, lng: -95.390 },
    { id: 's37', title: 'EaDo Night Market', category: 'Food & Drink', description: 'Asian-inspired food and artisan shopping in East Downtown.', date: '10/25/2024', location: 'EaDo', venue: 'EaDo District', ageRestriction: 'All Ages', lat: 29.752, lng: -95.352 },
    { id: 's38', title: 'Museum of Fine Arts Tours', category: 'Arts & Culture', description: 'World-class collections in the Houston Museum District.', date: '10/19/2024', location: 'Bissonnet St', venue: 'MFAH', ageRestriction: 'All Ages', lat: 29.725, lng: -95.390 },
    { id: 's39', title: 'Galveston Beach Run', category: 'Outdoors', description: '5K and 10K run along the historic Galveston Seawall.', date: '10/19/2024', location: 'Galveston, TX', venue: 'Seawall Blvd', ageRestriction: 'All Ages', lat: 29.278, lng: -94.814 },
    { id: 's40', title: 'Cynthia Woods Pavilion Show', category: 'Entertainment', description: 'Live concert performance at Houstons premier outdoor venue.', date: '11/09/2024', location: 'The Woodlands', venue: 'Woodlands Pavilion', ageRestriction: 'All Ages', lat: 30.159, lng: -95.460 }
  ]
};

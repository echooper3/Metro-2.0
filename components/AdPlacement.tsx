import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Sparkles, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';

interface AdPlacementProps {
  type: 'banner' | 'card' | 'inline';
  cityId?: string;
  className?: string;
  onAdClick?: () => void;
}

const CITY_ADS: Record<string, any[]> = {
  tulsa: [
    {
      title: "Cain's Ballroom",
      description: "The historic home of Bob Wills. Experience the legendary sounds of the Arts District.",
      cta: "View Lineup",
      image: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&q=80&w=1200",
      tag: "Tulsa Legend"
    },
    {
      title: "Gathering Place",
      description: "A world-class park for all of Tulsa. Discover new heights of adventure today.",
      cta: "Explore Park",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200",
      tag: "Metropolitan Star"
    }
  ],
  okc: [
    {
      title: "Bricktown Canal",
      description: "Navigate the heart of Oklahoma City. Scenic water taxi tours daily through the historic district.",
      cta: "Book Taxi",
      image: "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&q=80&w=1200",
      tag: "OKC Classic"
    },
    {
      title: "Paycom Center",
      description: "Home of the OKC Thunder. Experience the loudest arena in the NBA and premier concerts.",
      cta: "Buy Tickets",
      image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=1200",
      tag: "OKC Hub"
    }
  ],
  dallas: [
    {
      title: "Reunion Tower",
      description: "The GeO-Deck offers 360-degree views of the Big D skyline. Dallas starts here.",
      cta: "See The View",
      image: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=80&w=1200",
      tag: "Dallas Icon"
    },
    {
      title: "NorthPark Center",
      description: "Premier shopping meets world-class art. Experience the finest Dallas has to offer.",
      cta: "Explore NorthPark",
      image: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&q=80&w=1200",
      tag: "Elite Partner"
    }
  ],
  houston: [
    {
      title: "Space Center Houston",
      description: "The gateway to human space exploration. Visit the official NASA visitor center.",
      cta: "Mission Log",
      image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200",
      tag: "Global Landmark"
    },
    {
      title: "The Museum District",
      description: "19 world-class institutions in the heart of Houston. Culture, science, and history united.",
      cta: "Visit District",
      image: "https://images.unsplash.com/photo-1518998053504-5368efc9bca7?auto=format&fit=crop&q=80&w=1200",
      tag: "Cultural Hub"
    }
  ]
};

const METRO_ADS = [
  {
    title: "Metropolitan Reserve",
    description: "Private wealth management for the modern intelligence network. Secure your regional legacy.",
    cta: "Request Consult",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    tag: "Certified"
  },
  {
    title: "The Velocity Collection",
    description: "Precision automotive engineering for the metropolitan driver. Experience unmatched power.",
    cta: "Schedule Drive",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200",
    tag: "Featured"
  }
];

const AdPlacement: React.FC<AdPlacementProps> = ({ type, cityId, className = '', onAdClick }) => {
  // Use city-specific ads if available, otherwise fallback to general ads
  const availableAds = (cityId && CITY_ADS[cityId.toLowerCase()]) || METRO_ADS;
  const ad = availableAds[Math.floor(Math.random() * availableAds.length)];

  if (type === 'banner') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-black text-white py-3 px-4 flex items-center justify-center gap-4 text-center relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-transparent to-orange-600/20 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 whitespace-nowrap flex items-center shrink-0">
          <Sparkles className="w-3 h-3 mr-2" /> Sponsorship
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest truncate">
          {ad.title}: {ad.description}
        </p>
        <button 
          onClick={onAdClick}
          className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full shrink-0 flex items-center hover:bg-orange-600 hover:text-white transition-colors"
        >
          {ad.cta} <ExternalLink className="w-3 h-3 ml-2" />
        </button>
      </motion.div>
    );
  }

  if (type === 'card') {
    return (
      <motion.div 
        whileHover={{ y: -8 }}
        className={`group bg-gray-900 rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl relative flex flex-col h-full min-h-[500px] ${className}`}
      >
        <div className="absolute top-6 left-6 z-20 flex gap-2">
          <span className="px-4 py-2 bg-orange-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center shadow-lg">
            <ShieldCheck className="w-3 h-3 mr-2" />
            {ad.tag}
          </span>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={ad.image} 
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
        </div>

        <div className="p-8 flex flex-col flex-grow relative z-10 -mt-20">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 mb-4 block">Metropolitan Partner</span>
          <h3 className="text-3xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-orange-500 transition-colors">
            {ad.title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
            {ad.description}
          </p>
          <div className="mt-auto">
            <motion.button 
              whileHover={{ x: 5 }}
              onClick={onAdClick}
              className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"
            >
              {ad.cta}
              <ExternalLink className="w-4 h-4 ml-3" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`py-12 border-y border-gray-100 bg-gray-50/50 flex flex-col items-center text-center gap-6 ${className}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-400">Regional Partner Broadcast</span>
      <h4 className="text-2xl font-black italic tracking-tighter uppercase text-gray-900">{ad.title}</h4>
      <p className="text-gray-500 text-sm max-w-xl font-medium px-4">{ad.description}</p>
      <button 
        onClick={onAdClick}
        className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-orange-600 transition-colors"
      >
        {ad.cta} <ArrowRight className="w-4 h-4 ml-3" />
      </button>
    </div>
  );
};

export default AdPlacement;

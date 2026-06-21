import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Sparkles, ShieldCheck, ArrowRight, TrendingUp } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta: string;
  image: string;
  url: string;
  tag: string;
  cityId: string;
  clicks: number;
  impressions: number;
}

interface AdPlacementProps {
  type: 'banner' | 'card' | 'inline';
  cityId?: string;
  className?: string;
  onAdClick?: () => void;
}

const AdPlacement: React.FC<AdPlacementProps> = ({ type, cityId, className = '', onAdClick }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to ads collection in real time
  useEffect(() => {
    const q = query(collection(db, 'ads'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Ad[];
        setAds(adsData);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to ads:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter ads to enforce ZERO crossover
  const activeAds = React.useMemo(() => {
    if (loading) return [];
    
    if (cityId) {
      // STRICT city matching (zero crossover)
      return ads.filter(
        (ad) => ad.cityId && ad.cityId.toLowerCase() === cityId.toLowerCase()
      );
    } else {
      // General ads for general landing page or fallback global context
      return ads.filter(
        (ad) => !ad.cityId || ad.cityId.toLowerCase() === 'general'
      );
    }
  }, [ads, cityId, loading]);

  // Pick a random ad from the matched list
  const ad = React.useMemo(() => {
    if (activeAds.length === 0) return null;
    // Keep selection stable for the component mount to prevent rapid switching
    const index = Math.floor(Math.random() * activeAds.length);
    return activeAds[index];
  }, [activeAds]);

  // Track impressions (delayed slightly to ensure user actually saw it)
  useEffect(() => {
    if (ad && ad.id) {
      const recordImpression = async () => {
        try {
          const adRef = doc(db, 'ads', ad.id);
          await updateDoc(adRef, { impressions: increment(1) });
        } catch (e) {
          console.warn('Failed to record ad impression:', e);
        }
      };

      const timer = setTimeout(recordImpression, 1000);
      return () => clearTimeout(timer);
    }
  }, [ad?.id]);

  const handleAdAction = async () => {
    if (onAdClick) {
      onAdClick();
    }
    
    if (ad && ad.id) {
      try {
        const adRef = doc(db, 'ads', ad.id);
        await updateDoc(adRef, { clicks: increment(1) });
      } catch (e) {
        console.warn('Failed to record ad click:', e);
      }
      window.open(ad.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getCityNameFormatted = () => {
    if (!cityId) return 'Inside The Metro';
    if (cityId.toLowerCase() === 'tulsa') return 'Tulsa';
    if (cityId.toLowerCase() === 'okc') return 'Oklahoma City';
    if (cityId.toLowerCase() === 'dallas') return 'Dallas';
    if (cityId.toLowerCase() === 'houston') return 'Houston';
    return cityId.charAt(0).toUpperCase() + cityId.slice(1);
  };

  // If loading, show elegant pulse placeholder
  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-900 rounded-3xl h-24 ${className}`} />
    );
  }

  // PRE-DESIGNED PREMIUM PARTNERSHIP FALLBACK (No ads uploaded for this hub yet)
  if (!ad) {
    const formattedCity = getCityNameFormatted();

    if (type === 'banner') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-black text-white py-3 px-4 flex items-center justify-center gap-4 text-center relative overflow-hidden ${className}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-transparent to-orange-600/10 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 whitespace-nowrap flex items-center shrink-0">
            <Sparkles className="w-3 h-3 mr-2" /> Sponsorship
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest truncate">
            Sponsor {formattedCity}'s Metro Signal Hub. Showcase your business.
          </p>
          <a
            href="mailto:partner@inside-the-metro.com?subject=Sponsorship%20Inquiry"
            className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full shrink-0 flex items-center hover:bg-orange-600 hover:text-white transition-all shadow-md"
          >
            Become a Partner <ArrowRight className="w-3 h-3 ml-2" />
          </a>
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
              <Sparkles className="w-3 h-3 mr-2" />
              Sponsorship Opportunity
            </span>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"
              alt="Become a Partner"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 group-hover:opacity-60"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          </div>

          <div className="p-8 flex flex-col flex-grow relative z-10 -mt-20">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 mb-4 block">
              Metropolitan Partner
            </span>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-orange-500 transition-colors">
              Sponsor {formattedCity}'s Metro Hub
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
              Connect directly with thousands of active local community members. Secure this exclusive premium placement to broadcast your brand signal.
            </p>
            <div className="mt-auto">
              <a
                href="mailto:partner@inside-the-metro.com?subject=Sponsorship%20Inquiry"
                className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-xl"
              >
                Become a Partner
                <ArrowRight className="w-4 h-4 ml-3" />
              </a>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className={`py-12 border-y border-gray-100 bg-gray-50/50 flex flex-col items-center text-center gap-6 ${className}`}>
        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-400">
          Regional Partner Broadcast
        </span>
        <h4 className="text-2xl font-black italic tracking-tighter uppercase text-gray-900">
          Partner with The Metro inside {formattedCity}
        </h4>
        <p className="text-gray-500 text-sm max-w-xl font-medium px-4">
          Establish unmatched regional presence. Place your local business spotlight in our highly targeted signal broadcast feeds.
        </p>
        <a
          href="mailto:partner@inside-the-metro.com?subject=Sponsorship%20Inquiry"
          className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-orange-600 transition-colors"
        >
          Become a Partner <ArrowRight className="w-4 h-4 ml-3" />
        </a>
      </div>
    );
  }

  // DYNAMIC MONETIZED AD RENDERING
  if (type === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-black text-white py-3 px-4 flex items-center justify-center gap-4 text-center relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-transparent to-orange-600/20 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 whitespace-nowrap flex items-center shrink-0">
          <Sparkles className="w-3 h-3 mr-2" /> {ad.tag || 'Sponsorship'}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest truncate">
          {ad.title}: {ad.description}
        </p>
        <button
          onClick={handleAdAction}
          className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full shrink-0 flex items-center hover:bg-orange-600 hover:text-white transition-all shadow-md"
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
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 mb-4 block">
            Metropolitan Partner
          </span>
          <h3 className="text-3xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-orange-500 transition-colors">
            {ad.title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
            {ad.description}
          </p>
          <div className="mt-auto">
            <motion.button
              whileHover={{ x: 5 }}
              onClick={handleAdAction}
              className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-xl"
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
      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-400">
        Regional Partner Broadcast
      </span>
      <h4 className="text-2xl font-black italic tracking-tighter uppercase text-gray-900">
        {ad.title}
      </h4>
      <p className="text-gray-500 text-sm max-w-xl font-medium px-4">
        {ad.description}
      </p>
      <button
        onClick={handleAdAction}
        className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-orange-600 transition-colors shadow-lg"
      >
        {ad.cta} <ArrowRight className="w-4 h-4 ml-3" />
      </button>
    </div>
  );
};

export default AdPlacement;

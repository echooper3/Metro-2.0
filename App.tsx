
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import CreateEventModal from './components/CreateEventModal';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions, getCacheKey, getCachedData } from './services/geminiService';

const SEARCH_MESSAGES = [
  "Searching Ticketmaster...",
  "Crawling BOK Center schedules...",
  "Checking AXS calendars...",
  "Verifying venue dates...",
  "Finalizing Metro feed..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [events, setEvents] = useState<EventActivity[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState<EventActivity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<'live' | 'grounded' | 'ai' | 'seed' | 'cache'>('seed');
  const [toasts, setToasts] = useState<Array<{ id: number, message: string }>>([]);
  
  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (isRefreshing) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % SEARCH_MESSAGES.length);
      }, 1800);
      return () => clearInterval(interval);
    }
  }, [isRefreshing]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}) => {
    const requestId = ++fetchIdRef.current;
    
    // 1. INSTANT PHASE: Show Cache or Seed immediately
    const cacheKey = getCacheKey(cityName, options);
    const cached = getCachedData(cacheKey);
    
    if (cached && !options.forceRefresh) {
      setEvents(cached.events);
      setSourceStatus('cache');
    } else {
      let cityId = cityName === 'All' ? 'global' : CITIES.find(c => c.name === cityName)?.id || 'global';
      let seeds = cityId === 'global' ? [...GLOBAL_SEED_EVENTS] : [...(SEED_EVENTS[cityId] || [])];
      if (options.category && options.category !== 'All') {
        seeds = seeds.filter(s => s.category === options.category);
      }
      setEvents(seeds);
      setSourceStatus('seed');
    }

    // 2. LIVE SYNC PHASE: Background update
    setIsRefreshing(true);
    try {
      const data = await fetchEvents(cityName, options);
      if (requestId !== fetchIdRef.current) return;
      if (data && data.events.length > 0) {
        startTransition(() => {
          setEvents(data.events);
          setSources(data.sources);
          setSourceStatus(data.status as any);
        });
      }
    } catch (err) {
      console.warn("Live sync failed, keeping seeds.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setView(AppView.CITY_DETAIL);
    setActiveCategory('All');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadCityEvents(city.name, { category: 'All' });
  };

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCityEvents('All', { keyword: query, category: 'All' });
  };

  const handleCategoryClick = (cat: Category) => {
    setActiveCategory(cat);
    loadCityEvents(selectedCity?.name || 'All', { category: cat, keyword: searchQuery || undefined });
  };

  const handleHome = () => {
    setView(AppView.LANDING);
    setSelectedCity(null);
    setEvents([]);
    setSourceStatus('seed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout onHome={handleHome} onAuth={() => setShowAuthModal(true)} onSearch={handleGlobalSearch} onPostEvent={() => setShowCreateModal(true)}>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (<div key={t.id} className="bg-gray-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom-4">{t.message}</div>))}
      </div>

      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="City" />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.4em] uppercase mb-8 block text-xs">Live Metropolitan Intelligence</span>
              <h2 className="text-6xl md:text-9xl font-black text-white mb-10 leading-[0.8] tracking-tighter">Inside <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">The Metro</span></h2>
              <a href="#hub-selector" className="inline-flex items-center px-12 py-6 bg-orange-600 text-white font-black rounded-3xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-900/40 uppercase tracking-widest text-xs">Select Your Hub</a>
            </div>
          </section>
          <section id="hub-selector" className="max-w-7xl mx-auto px-4 py-32"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">{CITIES.map(city => <CityCard key={city.id} city={city} onClick={handleCitySelect} />)}</div></section>
        </div>
      )}

      {(view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS) && (
        <div className="pb-32">
          <div className="bg-gray-950 pt-32 pb-24 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <button onClick={handleHome} className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-12 flex items-center gap-3 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Hub Selection
              </button>
              <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none">{view === AppView.SEARCH_RESULTS ? `Results: ${searchQuery}` : selectedCity?.name}</h2>
              
              <div className="flex flex-wrap items-center gap-6 mt-12">
                {isRefreshing ? (
                  <div className="flex items-center gap-5 bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                    <div className="flex space-x-1.5"><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div></div>
                    <span className="text-orange-400 font-black text-[11px] uppercase tracking-[0.2em]">{SEARCH_MESSAGES[loadingMsgIdx]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 border border-white/10 bg-white/5 px-8 py-4 rounded-3xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <span className="font-black text-[11px] uppercase tracking-[0.2em] text-emerald-400">Live Sync Complete</span>
                  </div>
                )}
                {!isRefreshing && (
                  <button onClick={() => loadCityEvents(selectedCity?.name || 'All', { category: activeCategory, keyword: searchQuery || undefined, forceRefresh: true })} className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh Web Data
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
            <div className="flex overflow-x-auto scrollbar-hide space-x-4 bg-white p-4 rounded-[2rem] shadow-2xl shadow-gray-200 border border-gray-100">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => handleCategoryClick(cat)} className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shrink-0 ${activeCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}>{cat}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16 min-h-[500px]">
              {events.length > 0 ? (
                events.map(event => (<EventItem key={event.id} event={event} showCity={view === AppView.SEARCH_RESULTS} onOpenDetails={ev => setDetailedEvent(ev)} />))
              ) : (
                Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} onSave={ev => { addToast("Syncing event..."); setEvents(prev => [ev, ...prev]); setShowCreateModal(false); }} />}

      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setDetailedEvent(null)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <button onClick={() => setDetailedEvent(null)} className="absolute top-8 right-8 z-30 p-3 text-white bg-black/20 hover:bg-orange-600 rounded-full transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="h-80 w-full shrink-0"><img src={detailedEvent.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200`} alt={detailedEvent.title} className="w-full h-full object-cover" /></div>
            <div className="p-16 pt-12 overflow-y-auto">
              <h2 className="text-5xl font-black text-gray-900 leading-tight mb-12 tracking-tighter">{detailedEvent.title}</h2>
              <div className="grid grid-cols-2 gap-12 border-y border-gray-100 py-12 mb-12">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">When</p><p className="text-gray-900 font-black text-lg">{detailedEvent.date} @ {detailedEvent.time || 'TBA'}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Where</p><p className="text-gray-900 font-black text-lg">{detailedEvent.venue || detailedEvent.location}</p></div>
              </div>
              
              <div className="mb-12">
                <p className="text-gray-600 text-xl leading-relaxed font-medium mb-12">{detailedEvent.description}</p>
                
                {detailedEvent.organizerName && (
                  <div className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Organized By</p>
                        <h4 className="text-xl font-black text-gray-900">{detailedEvent.organizerName}</h4>
                      </div>
                    </div>
                    {(detailedEvent.organizerUrl || detailedEvent.organizerContact) && (
                      <div className="flex flex-wrap gap-4 mt-6">
                        {detailedEvent.organizerUrl && (
                          <a href={detailedEvent.organizerUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm">
                            Host Website
                          </a>
                        )}
                        {detailedEvent.organizerContact && (
                          <span className="px-5 py-3 bg-white/50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm">
                            Contact: {detailedEvent.organizerContact}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <a href={detailedEvent.sourceUrl || "#"} target="_blank" className="block w-full py-6 bg-orange-600 text-white font-black rounded-3xl text-center hover:bg-orange-700 shadow-2xl shadow-orange-100 transition-all uppercase tracking-widest text-xs">Official Event Website</a>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

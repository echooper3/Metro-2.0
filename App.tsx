
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions, getCacheKey, getCachedData } from './services/geminiService';

const CreateEventModal = lazy(() => import('./components/CreateEventModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));

const SEARCH_MESSAGES = [
  "Synchronizing Live Metropolitan Signals...",
  "Scanning Venue Intelligence Networks...",
  "Indexing Real-Time Event Feeds...",
  "Validating Regional Activity Data..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [allEvents, setAllEvents] = useState<EventActivity[]>(GLOBAL_SEED_EVENTS);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState<EventActivity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<'live' | 'grounded' | 'ai' | 'seed' | 'cache' | 'quota-limited'>('seed');
  const [toasts, setToasts] = useState<Array<{ id: number, message: string }>>([]);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);

  // Load initial global data from cache or seeds
  useEffect(() => {
    const cacheKey = getCacheKey('All', { category: 'All', page: 1, fastSync: true });
    const cached = getCachedData(cacheKey);
    if (cached) {
      setAllEvents(cached.events);
      setSourceStatus('cache');
    }
  }, []);

  useEffect(() => {
    if (isRefreshing || isVerifying || isPageLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % SEARCH_MESSAGES.length);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [isRefreshing, isVerifying, isPageLoading]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleOpenDetails = useCallback((event: EventActivity) => {
    setDetailedEvent(event);
    const modalContent = document.getElementById('event-detail-scroll');
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      const matchesCity = !selectedCity || e.cityName === selectedCity.name;
      const matchesQuery = !searchQuery || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCity && matchesQuery;
    });
  }, [allEvents, activeCategory, selectedCity, searchQuery]);

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}) => {
    const requestId = ++fetchIdRef.current;
    const isNextPage = (options.page || 1) > 1;
    const targetCategory = options.category || activeCategory;
    const cacheKey = getCacheKey(cityName, { ...options, category: targetCategory });
    
    const cached = getCachedData(cacheKey);
    if (cached && !isNextPage) {
      setAllEvents(cached.events);
      setSourceStatus('cache');
      setSources(cached.sources || []);
    }

    if (!isNextPage) {
      setIsRefreshing(true);
      setHasMore(true);
    } else {
      setIsPageLoading(true);
    }

    try {
      const result = await fetchEvents(cityName, { ...options, category: targetCategory, fastSync: false });
      if (requestId !== fetchIdRef.current) return;

      if (result && result.events.length > 0) {
        startTransition(() => {
          if (isNextPage) {
            setAllEvents(prev => {
              const seen = new Set(prev.map(p => p.title.toLowerCase()));
              return [...prev, ...result.events.filter(n => !seen.has(n.title.toLowerCase()))];
            });
          } else {
            setAllEvents(result.events);
            setSources(result.sources || []);
            setSourceStatus(result.status as any);
          }
          if (result.events.length < 5) setHasMore(false);
        });
      }
    } catch (err) {
      console.warn("Metropolitan Sync failed.");
    } finally {
      setIsRefreshing(false);
      setIsVerifying(false);
      setIsPageLoading(false);
    }
  }, [activeCategory]);

  const handleCitySelect = useCallback((city: City) => {
    const citySeeds = SEED_EVENTS[city.id] || [];
    startTransition(() => {
      setSelectedCity(city);
      setView(AppView.CITY_DETAIL);
      setActiveCategory('All');
      setSearchQuery('');
      setPage(1);
      setAllEvents(citySeeds);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadCityEvents(city.name, { category: 'All', page: 1 });
  }, [loadCityEvents]);

  const handleCategoryClick = useCallback((cat: Category) => {
    startTransition(() => {
      setActiveCategory(cat);
      setPage(1);
    });
    loadCityEvents(selectedCity?.name || 'All', { category: cat, keyword: searchQuery || undefined, page: 1 });
  }, [selectedCity, searchQuery, loadCityEvents]);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    setPage(1);
    const searchSeeds = GLOBAL_SEED_EVENTS.filter(e => e.title.toLowerCase().includes(query.toLowerCase()));
    setAllEvents(searchSeeds.length > 0 ? searchSeeds : []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCityEvents('All', { keyword: query, category: 'All', page: 1 });
  }, [loadCityEvents]);

  const handleHome = useCallback(() => {
    setView(AppView.LANDING);
    setSelectedCity(null);
    setAllEvents(GLOBAL_SEED_EVENTS);
    setPage(1);
    setActiveCategory('All');
    setSearchQuery('');
    setSourceStatus('seed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isRefreshing && !isPageLoading && view !== AppView.LANDING) {
        setPage(prev => {
          const nextPage = prev + 1;
          loadCityEvents(selectedCity?.name || 'All', { category: activeCategory, keyword: searchQuery || undefined, page: nextPage });
          return nextPage;
        });
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
  }, [hasMore, isRefreshing, isPageLoading, view, activeCategory, searchQuery, selectedCity, loadCityEvents]);

  return (
    <Layout onHome={handleHome} onAuth={() => setShowAuthModal(true)} onSearch={handleGlobalSearch} onPostEvent={() => setShowCreateModal(true)}>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (<div key={t.id} className="bg-gray-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom-4">{t.message}</div>))}
      </div>

      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[600px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale" alt="City" loading="eager" />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.5em] uppercase mb-8 block text-[10px] animate-pulse">Live Metros Sourcing Now</span>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-10 leading-[0.9] tracking-tighter">Inside <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">The Metro</span></h2>
              <p className="text-gray-400 font-medium text-lg mb-12 max-w-xl mx-auto">Discover professional sports, underground culture, and local arts in Tulsa, OKC, Dallas, and Houston.</p>
              <a href="#hub-selector" className="inline-flex items-center px-12 py-5 bg-orange-600 text-white font-black rounded-3xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-900/40 uppercase tracking-widest text-[10px] active:scale-95">Choose Your Hub</a>
            </div>
          </section>

          <section id="hub-selector" className="max-w-7xl mx-auto px-4 py-24">
            <div className="mb-16">
              <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Metropolitan Selection</span>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Access Local Intelligence</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {CITIES.map(city => <CityCard key={city.id} city={city} onClick={handleCitySelect} />)}
            </div>
          </section>
        </div>
      )}

      {(view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS) && (
        <div className="pb-32">
          <div className="bg-gray-950 pt-28 pb-20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <button onClick={handleHome} className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-10 flex items-center gap-3 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Hub Selection
              </button>
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter line-clamp-2">
                {view === AppView.SEARCH_RESULTS ? `Search: ${searchQuery}` : selectedCity?.name}
              </h2>
              
              <div className="flex flex-wrap items-center gap-6 mt-10">
                <div className={`flex items-center gap-5 px-7 py-3.5 rounded-2xl border transition-all duration-700 ${isRefreshing ? 'bg-orange-600/10 border-orange-500/30' : 'bg-white/5 border-white/10'}`}>
                  {isRefreshing ? (
                    <>
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-orange-400 font-black text-[10px] uppercase tracking-[0.2em]">{SEARCH_MESSAGES[loadingMsgIdx]}</span>
                    </>
                  ) : (
                    <>
                      <div className={`w-2 h-2 rounded-full ${sourceStatus === 'cache' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                      <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${sourceStatus === 'cache' ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {sourceStatus === 'cache' ? 'Verified Stream (Cached)' : sourceStatus === 'seed' ? 'Static Base Ready' : 'Metropolitan Sync Active'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
            <div className="flex overflow-x-auto scrollbar-hide space-x-3 bg-white p-3 rounded-[2rem] shadow-2xl shadow-gray-200 border border-gray-100">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => handleCategoryClick(cat)} 
                  className={`px-7 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shrink-0 group ${activeCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16 min-h-[500px]">
              {/* Show Skeletons ONLY during initial refresh/load when no filtered items are ready yet */}
              {isRefreshing && filteredEvents.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                  <div key={event.id} className="animate-in fade-in zoom-in-95 duration-500">
                    <EventItem event={event} showCity={view === AppView.SEARCH_RESULTS} onOpenDetails={handleOpenDetails} />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center">
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No metropolitan data found for this selection</p>
                </div>
              )}
            </div>

            <div ref={loaderRef} className="mt-16 py-10 flex flex-col items-center justify-center">
              {isPageLoading && <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <Suspense fallback={<div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <CreateEventModal onClose={() => setShowCreateModal(false)} onSave={ev => { addToast("Event published successfully."); setAllEvents(prev => [ev, ...prev]); setShowCreateModal(false); }} />
        </Suspense>
      )}

      {showAuthModal && (
        <Suspense fallback={<div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={(data) => { addToast(`Welcome back, ${data.first_name}!`); setShowAuthModal(false); }} />
        </Suspense>
      )}

      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetailedEvent(null)} />
          <div id="event-detail-scroll" className="relative bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 scrollbar-hide p-8 md:p-12">
            <button onClick={() => setDetailedEvent(null)} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-orange-600 hover:text-white rounded-full transition-all z-20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="aspect-video w-full rounded-3xl overflow-hidden mb-10 bg-gray-100">
               <img src={detailedEvent.imageUrl} className="w-full h-full object-cover" alt={detailedEvent.title} />
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
               <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[9px] font-black uppercase tracking-widest">{detailedEvent.category}</span>
               <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-[9px] font-black uppercase tracking-widest">{detailedEvent.cityName}</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">{detailedEvent.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pb-10 border-b border-gray-100">
               <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Location</p><p className="font-black text-gray-900">{detailedEvent.venue}</p><p className="text-xs text-gray-500">{detailedEvent.location}</p></div>
               <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Schedule</p><p className="font-black text-gray-900">{detailedEvent.date}</p><p className="text-xs text-gray-500">{detailedEvent.time}</p></div>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed mb-12">{detailedEvent.description}</p>
            {detailedEvent.sourceUrl && (
              <a href={detailedEvent.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-10 py-5 bg-gray-900 text-white font-black rounded-2xl hover:bg-orange-600 transition-all shadow-xl uppercase tracking-widest text-[10px]">Official Website</a>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes loading-bar {
          0% { width: 0; left: 0; }
          50% { width: 100%; left: 0; }
          100% { width: 0; left: 100%; }
        }
      `}</style>
    </Layout>
  );
};

export default App;

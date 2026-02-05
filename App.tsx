
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions, getCacheKey, getCachedData } from './services/geminiService';

const CreateEventModal = lazy(() => import('./components/CreateEventModal'));

const SEARCH_MESSAGES = [
  "Fetching Metro data...",
  "Syncing categories...",
  "Verifying venue dates...",
  "Updating local feed..."
];

const RECENTLY_VIEWED_KEY = 'itm_recently_viewed_v1';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [allEvents, setAllEvents] = useState<EventActivity[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<EventActivity[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState<EventActivity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<'live' | 'grounded' | 'ai' | 'seed' | 'cache' | 'quota-limited'>('seed');
  const [toasts, setToasts] = useState<Array<{ id: number, message: string }>>([]);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);
  const prefetchTimeoutRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (saved) {
      try {
        setRecentlyViewed(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem(RECENTLY_VIEWED_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (isRefreshing || isPageLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % SEARCH_MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isRefreshing, isPageLoading]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addToRecentlyViewed = (event: EventActivity) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item => item.id !== event.id);
      const updated = [event, ...filtered].slice(0, 10);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenDetails = useCallback((event: EventActivity) => {
    setDetailedEvent(event);
    setIsDescExpanded(false);
    addToRecentlyViewed(event);
    const modalContent = document.getElementById('event-detail-scroll');
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Strict local filtering for UI robustness
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      const matchesCity = !selectedCity || e.cityName === selectedCity.name;
      const matchesQuery = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCity && matchesQuery;
    });
  }, [allEvents, activeCategory, selectedCity, searchQuery]);

  const relatedEvents = useMemo(() => {
    if (!detailedEvent) return [];
    return allEvents
      .filter(e => e.id !== detailedEvent.id && (e.category === detailedEvent.category || e.cityName === detailedEvent.cityName))
      .slice(0, 4);
  }, [allEvents, detailedEvent]);

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}) => {
    const requestId = ++fetchIdRef.current;
    const isNextPage = (options.page || 1) > 1;
    const targetCategory = options.category || activeCategory;

    // Determine Seed Baseline
    let cityId = cityName === 'All' ? 'global' : CITIES.find(c => c.name === cityName)?.id || 'global';
    let seeds = cityId === 'global' ? [...GLOBAL_SEED_EVENTS] : [...(SEED_EVENTS[cityId] || [])];
    
    // Preliminary filtering for seeds to show immediate relevant data
    if (targetCategory !== 'All') {
      seeds = seeds.filter(s => s.category === targetCategory);
    }
    if (searchQuery) {
      seeds = seeds.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const currentTitles = allEvents.map(e => e.title);
    const fetchOptions = { ...options, category: targetCategory, excludeTitles: currentTitles };

    if (!isNextPage) {
      const cacheKey = getCacheKey(cityName, fetchOptions);
      const cached = getCachedData(cacheKey);
      
      startTransition(() => {
        if (cached && !options.forceRefresh) {
          setAllEvents(cached.events);
          setSourceStatus('cache');
        } else {
          setAllEvents(seeds);
          setSourceStatus('seed');
        }
      });

      setIsRefreshing(true);
      setHasMore(true);
    } else {
      setIsPageLoading(true);
    }

    try {
      const data = await fetchEvents(cityName, fetchOptions);
      if (requestId !== fetchIdRef.current) return;
      
      if (data?.status === 'quota-limited') {
        setSourceStatus('quota-limited');
        addToast("Sync limit reached. Viewing local metropolitan feed.");
        setHasMore(false);
        return;
      }

      if (data && data.events.length > 0) {
        startTransition(() => {
          if (isNextPage) {
            setAllEvents(prev => {
              const existingTitles = new Set(prev.map(p => p.title.toLowerCase()));
              const newItems = data.events.filter(n => !existingTitles.has(n.title.toLowerCase()));
              return [...prev, ...newItems];
            });
          } else {
            const liveEvents = data.events;
            const liveTitles = new Set(liveEvents.map(l => l.title.toLowerCase()));
            const uniqueSeeds = seeds.filter(s => !liveTitles.has(s.title.toLowerCase()));
            
            // Merge and ensure strict filtering matches current view
            const merged = [...liveEvents, ...uniqueSeeds];
            setAllEvents(merged);
            setSources(data.sources);
            setSourceStatus(data.status as any);
          }
          if (data.events.length < 5) setHasMore(false);
        });
      } else if (isNextPage) {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Live sync failed, using static data baseline.");
    } finally {
      setIsRefreshing(false);
      setIsPageLoading(false);
    }
  }, [allEvents, activeCategory, searchQuery]);

  const handleCitySelect = useCallback((city: City) => {
    startTransition(() => {
      setSelectedCity(city);
      setView(AppView.CITY_DETAIL);
      setActiveCategory('All');
      setSearchQuery('');
      setPage(1);
      setAllEvents(SEED_EVENTS[city.id] || []);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadCityEvents(city.name, { category: 'All', page: 1 });
  }, [loadCityEvents]);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    setPage(1);
    setAllEvents(GLOBAL_SEED_EVENTS.filter(e => e.title.toLowerCase().includes(query.toLowerCase())));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCityEvents('All', { keyword: query, category: 'All', page: 1 });
  }, [loadCityEvents]);

  const handleCategoryClick = useCallback((cat: Category) => {
    startTransition(() => {
      setActiveCategory(cat);
      setPage(1);
    });
    loadCityEvents(selectedCity?.name || 'All', { category: cat, keyword: searchQuery || undefined, page: 1 });
  }, [selectedCity, searchQuery, loadCityEvents]);

  const handleHome = useCallback(() => {
    setView(AppView.LANDING);
    setSelectedCity(null);
    setAllEvents([]);
    setPage(1);
    setActiveCategory('All');
    setSearchQuery('');
    setSourceStatus('seed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isRefreshing && !isPageLoading && (view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS)) {
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

  const shouldTruncateDesc = detailedEvent && detailedEvent.description.length > 250;
  const displayedDescription = detailedEvent ? (isDescExpanded || !shouldTruncateDesc ? detailedEvent.description : `${detailedEvent.description.slice(0, 250)}...`) : '';

  return (
    <Layout onHome={handleHome} onAuth={() => {}} onSearch={handleGlobalSearch} onPostEvent={() => setShowCreateModal(true)}>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (<div key={t.id} className="bg-gray-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom-4">{t.message}</div>))}
      </div>

      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="City" loading="eager" />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.4em] uppercase mb-8 block text-xs">Live Metropolitan Intelligence</span>
              <h2 className="text-6xl md:text-9xl font-black text-white mb-10 leading-[0.8] tracking-tighter">Inside <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">The Metro</span></h2>
              <a href="#hub-selector" className="inline-flex items-center px-12 py-6 bg-orange-600 text-white font-black rounded-3xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-900/40 uppercase tracking-widest text-xs">Select Your Hub</a>
            </div>
          </section>

          {recentlyViewed.length > 0 && (
            <section className="bg-white py-24 border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-end justify-between mb-12">
                  <div>
                    <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Your History</span>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Recently Viewed</h2>
                  </div>
                  <button onClick={() => { setRecentlyViewed([]); localStorage.removeItem(RECENTLY_VIEWED_KEY); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors mb-2">Clear History</button>
                </div>
                <div className="flex overflow-x-auto pb-8 space-x-6 scrollbar-hide -mx-4 px-4">
                  {recentlyViewed.map(event => (
                    <div key={event.id} className="min-w-[320px] max-w-[320px]">
                      <EventItem event={event} onOpenDetails={handleOpenDetails} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section id="hub-selector" className="max-w-7xl mx-auto px-4 py-32">
            <div className="mb-16">
              <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Available Regions</span>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Choose Your City</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {CITIES.map(city => <CityCard key={city.id} city={city} onClick={handleCitySelect} />)}
            </div>
          </section>
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
              <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none line-clamp-2">
                {view === AppView.SEARCH_RESULTS ? `Results: ${searchQuery}` : selectedCity?.name}
              </h2>
              <div className="flex flex-wrap items-center gap-6 mt-12">
                {isRefreshing ? (
                  <div className="flex items-center gap-5 bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                    <div className="flex space-x-1.5"><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div></div>
                    <span className="text-orange-400 font-black text-[11px] uppercase tracking-[0.2em]">{SEARCH_MESSAGES[loadingMsgIdx]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 border border-white/10 bg-white/5 px-8 py-4 rounded-3xl">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] ${sourceStatus === 'quota-limited' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className={`font-black text-[11px] uppercase tracking-[0.2em] ${sourceStatus === 'quota-limited' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {sourceStatus === 'cache' ? 'Displaying Cached Feed' : sourceStatus === 'seed' ? 'Static Feed Ready' : sourceStatus === 'quota-limited' ? 'Limited Mode: Using Local Feed' : 'Live Sync Complete'}
                    </span>
                  </div>
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
              {filteredEvents.length > 0 ? (
                filteredEvents.map(event => (<EventItem key={event.id} event={event} showCity={view === AppView.SEARCH_RESULTS} onOpenDetails={handleOpenDetails} />))
              ) : isRefreshing ? (
                Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)
              ) : (
                <div className="col-span-full py-32 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No matches in the current feed</p>
                </div>
              )}
            </div>
            <div ref={loaderRef} className="mt-16 py-10 flex flex-col items-center justify-center">
              {isPageLoading && (
                <div className="flex flex-col items-center gap-6">
                   <div className="flex space-x-2"><div className="w-3 h-3 bg-orange-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-3 h-3 bg-orange-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-3 h-3 bg-orange-600 rounded-full animate-bounce"></div></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Loading More Batch Items</p>
                </div>
              )}
              {!hasMore && filteredEvents.length > 0 && (
                <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">You've reached the end of the Metro feed</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* ... rest of the component remains same ... */}
      {showCreateModal && (
        <Suspense fallback={<div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <CreateEventModal onClose={() => setShowCreateModal(false)} onSave={ev => { addToast("Syncing event..."); setAllEvents(prev => [ev, ...prev]); setShowCreateModal(false); }} />
        </Suspense>
      )}

      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setDetailedEvent(null)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <button onClick={() => setDetailedEvent(null)} className="absolute top-8 right-8 z-30 p-3 text-white bg-black/20 hover:bg-orange-600 rounded-full transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="h-80 w-full shrink-0"><img src={detailedEvent.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200`} alt={detailedEvent.title} className="w-full h-full object-cover" /></div>
            <div id="event-detail-scroll" className="p-16 pt-12 overflow-y-auto">
              <h2 className="text-5xl font-black text-gray-900 leading-tight mb-12 tracking-tighter">{detailedEvent.title}</h2>
              <div className="grid grid-cols-2 gap-12 border-y border-gray-100 py-12 mb-12">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">When</p><p className="text-gray-900 font-black text-lg">{detailedEvent.date} @ {detailedEvent.time || 'TBA'}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Where</p><p className="text-gray-900 font-black text-lg">{detailedEvent.venue || detailedEvent.location}</p></div>
              </div>
              <div className="mb-12">
                <p className="text-gray-600 text-xl leading-relaxed font-medium mb-4 whitespace-pre-wrap">{displayedDescription}</p>
                {shouldTruncateDesc && (<button onClick={() => setIsDescExpanded(!isDescExpanded)} className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline mb-12 flex items-center gap-2">{isDescExpanded ? 'Read Less' : 'Read More'}<svg className={`w-3 h-3 transition-transform ${isDescExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>)}
                {detailedEvent.organizerName && (
                  <div className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100">
                    <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div><div><p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Organized By</p><h4 className="text-xl font-black text-gray-900">{detailedEvent.organizerName}</h4></div></div>
                    {(detailedEvent.organizerUrl || detailedEvent.organizerContact) && (<div className="flex flex-wrap gap-4 mt-6">{detailedEvent.organizerUrl && (<a href={detailedEvent.organizerUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm">Host Website</a>)}{detailedEvent.organizerContact && (<span className="px-5 py-3 bg-white/50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm">Contact: {detailedEvent.organizerContact}</span>)}</div>)}
                  </div>
                )}
              </div>
              <div className="mb-16">
                <a href={detailedEvent.sourceUrl || "#"} target="_blank" className="block w-full py-6 bg-orange-600 text-white font-black rounded-3xl text-center hover:bg-orange-700 shadow-2xl shadow-orange-100 transition-all uppercase tracking-widest text-xs mb-16">Official Event Website</a>
                {relatedEvents.length > 0 && (
                  <div className="pt-12 border-t border-gray-100">
                    <div className="mb-8"><span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Recommendations</span><h3 className="text-3xl font-black text-gray-900 tracking-tighter">Related Experiences</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{relatedEvents.map(e => (<div key={e.id} className="cursor-pointer" onClick={() => handleOpenDetails(e)}><div className="bg-gray-50 hover:bg-white border border-transparent hover:border-orange-200 rounded-2xl p-4 transition-all flex gap-4 group"><div className="w-20 h-20 rounded-xl overflow-hidden shrink-0"><img src={e.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=200`} alt={e.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div><div className="flex flex-col justify-center min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">{e.category}</p><h4 className="text-sm font-black text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{e.title}</h4><p className="text-[10px] font-bold text-gray-400 mt-1">{e.cityName} • {e.date}</p></div></div></div>))}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

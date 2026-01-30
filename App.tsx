
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import CreateEventModal from './components/CreateEventModal';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions, getCacheKey, getCachedData } from './services/geminiService';

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
  const [isModalDescExpanded, setIsModalDescExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [userCreatedEvents, setUserCreatedEvents] = useState<EventActivity[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSortingByDistance, setIsSortingByDistance] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<'live' | 'grounded' | 'ai' | 'seed' | 'cache'>('seed');
  const [toasts, setToasts] = useState<Array<{ id: number, message: string }>>([]);
  
  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedFavs = localStorage.getItem('metro_favorites');
    if (storedFavs) { try { setSavedEventIds(JSON.parse(storedFavs)); } catch (e) {} }
    const storedUserEvents = sessionStorage.getItem('metro_user_events');
    if (storedUserEvents) { try { setUserCreatedEvents(JSON.parse(storedUserEvents)); } catch (e) {} }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location access denied')
      );
    }
  }, []);

  useEffect(() => { localStorage.setItem('metro_favorites', JSON.stringify(savedEventIds)); }, [savedEventIds]);
  useEffect(() => { sessionStorage.setItem('metro_user_events', JSON.stringify(userCreatedEvents)); }, [userCreatedEvents]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const isUpcoming = useCallback((eventDateStr?: string) => {
    if (!eventDateStr) return true;
    try {
      const [m, d, y] = eventDateStr.split('/').map(Number);
      const eventTime = new Date(y, m - 1, d).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventTime >= today.getTime();
    } catch (e) { return true; }
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}, append = false) => {
    const requestId = ++fetchIdRef.current;
    
    if (!append) {
      const cacheKey = getCacheKey(cityName, options);
      const cached = getCachedData(cacheKey);
      
      if (cached) {
        startTransition(() => {
          setEvents(cached.events);
          setSourceStatus('cache');
          setIsRefreshing(true);
        });
      } else {
        let cityId = cityName === 'All' ? 'global' : CITIES.find(c => c.name === cityName)?.id || 'global';
        let seeds = cityId === 'global' ? [...GLOBAL_SEED_EVENTS] : [...(SEED_EVENTS[cityId] || [])];
        if (options.category && options.category !== 'All') seeds = seeds.filter(s => s.category === options.category);
        startTransition(() => {
          setEvents(seeds);
          setIsRefreshing(true);
          setSourceStatus('seed');
        });
      }
      setCurrentPage(1);
      setHasMore(true);
    }

    try {
      const targetPage = append ? currentPage + 1 : 1;
      const data = await fetchEvents(cityName, { ...options, page: targetPage });
      if (requestId !== fetchIdRef.current) return;
      if (data) {
        let liveEvents = data.events.filter(e => isUpcoming(e.date));
        const matchedUserEvents = userCreatedEvents.filter(u => (cityName === 'All' || u.cityName === cityName) && (!options.category || options.category === 'All' || u.category === options.category));
        startTransition(() => {
          if (append) {
            setEvents(prev => [...prev, ...liveEvents]);
            setCurrentPage(targetPage);
          } else {
            setEvents([...matchedUserEvents, ...liveEvents]);
            setSources(data.sources);
            setIsRefreshing(false);
            setSourceStatus(data.status as any);
          }
        });
        setHasMore(liveEvents.length >= 8);
      } else { startTransition(() => setIsRefreshing(false)); }
    } catch (err) { startTransition(() => setIsRefreshing(false)); }
  }, [currentPage, isUpcoming, userCreatedEvents]);

  // OPTIMISTIC UPDATE: Instant injection
  const handleSaveNewEvent = (newEvent: EventActivity) => {
    startTransition(() => {
        setUserCreatedEvents(prev => [newEvent, ...prev]);
        // Add to active display instantly if it matches filters
        const matchesCity = !selectedCity || newEvent.cityName === selectedCity.name;
        const matchesCat = activeCategory === 'All' || newEvent.category === activeCategory;
        if (matchesCity && matchesCat) {
            setEvents(prev => [newEvent, ...prev]);
        }
    });
    addToast("Event uploaded to metro hub!");
  };

  const toggleSaveEvent = useCallback((event: EventActivity) => {
    setSavedEventIds(prev => prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]);
  }, []);

  const sortedAndFilteredEvents = useMemo(() => {
    let result = [...events];
    if (userLocation) {
      result = result.map(e => ({ ...e, distance: (e.lat && e.lng) ? getDistance(userLocation.lat, userLocation.lng, e.lat, e.lng) : undefined }));
    }
    if (isSortingByDistance && userLocation) {
      result.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    }
    return result;
  }, [events, isSortingByDistance, userLocation]);

  const handleCitySelect = (city: City) => {
    startTransition(() => {
      setSelectedCity(city);
      setView(AppView.CITY_DETAIL);
      setActiveCategory('All');
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'instant' });
      loadCityEvents(city.name, { category: 'All' });
    });
  };

  const handleGlobalSearch = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
      setView(AppView.SEARCH_RESULTS);
      setSelectedCity(null);
      setActiveCategory('All');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      loadCityEvents('All', { keyword: query, category: 'All' });
    });
  };

  const handleCategoryClick = (cat: Category) => {
    startTransition(() => {
      setActiveCategory(cat);
      loadCityEvents(selectedCity?.name || 'All', { category: cat, keyword: searchQuery || undefined });
    });
  };

  const handleHome = () => {
    startTransition(() => {
      setView(AppView.LANDING);
      setSelectedCity(null);
      setEvents([]);
      setSourceStatus('seed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const addToCalendar = (event: EventActivity) => {
    const title = encodeURIComponent(event.title);
    const dateStr = event.date?.split('/').reverse().join('') || '';
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent(event.description)}`;
    window.open(googleUrl, '_blank');
  };

  const getRefinedLocation = (event: EventActivity) => {
    let venue = event.venue || event.title + " Venue";
    let address = event.location || event.cityName || "";
    return { venue, address };
  };

  const openDetails = (event: EventActivity) => { setDetailedEvent(event); setIsModalDescExpanded(false); };
  const closeDetails = () => { setDetailedEvent(null); };

  const refinedLoc = detailedEvent ? getRefinedLocation(detailedEvent) : { venue: "", address: "" };

  return (
    <Layout onHome={handleHome} onAuth={() => setShowAuthModal(true)} onSearch={handleGlobalSearch} onPostEvent={() => setShowCreateModal(true)}>
      
      {/* Toast System */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-gray-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {t.message}
          </div>
        ))}
      </div>

      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="City Skyline" />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.3em] uppercase mb-6 block text-sm">Metropolitan Sourcing & Discovery</span>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">Live Your Best <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Inside The Metro</span></h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button onClick={() => setShowAuthModal(true)} className="px-12 py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-900/40">Join the Community</button>
                <a href="#city-selection" className="text-white font-black flex items-center hover:text-orange-400 transition-colors py-4 group uppercase text-xs tracking-widest">Select a City <svg className="w-5 h-5 ml-3 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></a>
              </div>
            </div>
          </section>
          <section id="city-selection" className="max-w-7xl mx-auto px-4 py-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {CITIES.map(city => <CityCard key={city.id} city={city} onClick={handleCitySelect} />)}
            </div>
          </section>
        </div>
      )}

      {(view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS) && (
        <div className="pb-24">
          <div className="bg-gray-950 pt-32 pb-24 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <button onClick={handleHome} className="text-xs font-black uppercase tracking-widest text-orange-500 mb-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full transition-colors flex items-center gap-2"><span>←</span> Back to Hub</button>
              <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none">{view === AppView.SEARCH_RESULTS ? `Search: "${searchQuery}"` : selectedCity?.name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                {isRefreshing ? (
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl animate-pulse">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-orange-400 font-bold text-xs uppercase tracking-widest">Checking Live Data...</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 border px-6 py-3 rounded-2xl transition-colors ${sourceStatus === 'grounded' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : sourceStatus === 'ai' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${sourceStatus === 'grounded' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="font-bold text-[10px] uppercase tracking-widest">{sourceStatus === 'grounded' ? 'Live Grounded' : sourceStatus === 'ai' ? 'AI Generated' : 'Stable Cache'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 mt-16">
            <div className="flex overflow-x-auto scrollbar-hide space-x-3 w-full pb-10 border-b border-gray-100">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => handleCategoryClick(cat)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-200 hover:text-orange-600'}`}>{cat}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {(isRefreshing && sortedAndFilteredEvents.length === 0) ? Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />) : sortedAndFilteredEvents.length > 0 ? sortedAndFilteredEvents.map(event => <EventItem key={event.id} event={event} showCity={view === AppView.SEARCH_RESULTS} isSaved={savedEventIds.includes(event.id)} onToggleSave={toggleSaveEvent} onOpenDetails={openDetails} />) : <div className="col-span-full py-24 text-center text-gray-500 font-bold">No upcoming events found.</div>}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} onSave={handleSaveNewEvent} />}

      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={closeDetails} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <button onClick={closeDetails} className="absolute top-6 right-6 z-30 p-2 text-white bg-black/20 hover:bg-white hover:text-gray-900 rounded-full transition-all backdrop-blur-md"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="relative h-64 w-full shrink-0"><img src={detailedEvent.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200`} alt={detailedEvent.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" /></div>
            <div className="p-12 pt-0 overflow-y-auto">
              <header className="mb-10"><h2 className="text-4xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tighter">{detailedEvent.title}</h2><div className="grid grid-cols-2 gap-y-6 border-y border-gray-100 py-8"><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date</p><p className="text-gray-900 font-black text-sm">{detailedEvent.date || 'TBA'}</p></div><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Schedule</p><p className="text-gray-900 font-black text-sm">{detailedEvent.time || 'Check official site'}</p></div><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</p><p className="text-gray-900 font-black text-sm truncate">{refinedLoc.venue}</p><p className="text-gray-400 text-xs font-medium truncate">{refinedLoc.address}</p></div><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Admission</p><p className="text-gray-900 font-black text-sm">{detailedEvent.isFree ? 'Free' : detailedEvent.price || 'Ticketed'}</p></div></div></header>
              <div className="mb-12"><p className="text-gray-600 text-lg leading-relaxed font-medium">{detailedEvent.description}</p></div>
              <footer className="flex gap-4 pt-10 border-t border-gray-100"><a href={detailedEvent.sourceUrl || `https://google.com/search?q=${detailedEvent.title}`} target="_blank" rel="noopener noreferrer" className="flex-1 px-8 py-5 bg-orange-600 text-white font-black rounded-2xl text-center hover:bg-orange-700 transition-all shadow-xl shadow-orange-200">Visit Site</a><button onClick={() => addToCalendar(detailedEvent)} className="px-8 py-5 bg-white text-gray-900 border-2 border-gray-100 font-black rounded-2xl hover:border-orange-500 hover:text-orange-600 transition-all">Calendar</button></footer>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

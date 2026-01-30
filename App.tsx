
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import CreateEventModal from './components/CreateEventModal';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions, resetQuotaStandby, getCacheKey, getCachedData } from './services/geminiService';

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
  const [sourceStatus, setSourceStatus] = useState<'live' | 'grounded' | 'ai' | 'seed'>('seed');
  
  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    const storedFavs = localStorage.getItem('metro_favorites');
    if (storedFavs) {
      try { setSavedEventIds(JSON.parse(storedFavs)); } catch (e) {}
    }
    const storedUserEvents = sessionStorage.getItem('metro_user_events');
    if (storedUserEvents) {
      try { setUserCreatedEvents(JSON.parse(storedUserEvents)); } catch (e) {}
    }

    // Attempt to get user location for proximity features
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location access denied')
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('metro_favorites', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  useEffect(() => {
    sessionStorage.setItem('metro_user_events', JSON.stringify(userCreatedEvents));
  }, [userCreatedEvents]);

  const isUpcoming = useCallback((eventDateStr?: string) => {
    if (!eventDateStr) return true;
    try {
      const [m, d, y] = eventDateStr.split('/').map(Number);
      const eventTime = new Date(y, m - 1, d).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventTime >= today.getTime();
    } catch (e) {
      return true;
    }
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Enhanced fetch logic with Stale-While-Revalidate
   */
  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}, append = false) => {
    const requestId = ++fetchIdRef.current;
    
    if (!append) {
      const cacheKey = getCacheKey(cityName, options);
      const cached = getCachedData(cacheKey);
      
      if (cached) {
        startTransition(() => {
          setEvents(cached.events);
          setSources(cached.sources || []);
          setSourceStatus(cached.sources?.length > 0 ? 'grounded' : 'ai');
          setIsRefreshing(true);
        });
      } else {
        let cityId = 'global';
        if (cityName !== 'All') {
          const cityObj = CITIES.find(c => c.name === cityName);
          cityId = cityObj ? cityObj.id : cityName.toLowerCase().replace(/\s+/g, '');
        }
        let seeds = (cityId === 'global') ? [...GLOBAL_SEED_EVENTS] : [...(SEED_EVENTS[cityId] || [])];
        if (options.category && options.category !== 'All') {
          seeds = seeds.filter(s => s.category === options.category);
        }
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
        
        const matchedUserEvents = userCreatedEvents.filter(u => {
          const cityMatch = cityName === 'All' || u.cityName === cityName;
          const catMatch = !options.category || options.category === 'All' || u.category === options.category;
          return cityMatch && catMatch;
        });

        startTransition(() => {
          if (append) {
            setEvents(prev => [...prev, ...liveEvents]);
            setCurrentPage(targetPage);
          } else {
            setEvents([...matchedUserEvents, ...liveEvents]);
            setSources(data.sources);
            setIsRefreshing(false);
            setSourceStatus(data.status);
          }
        });
        setHasMore(liveEvents.length >= 8);
      } else {
        startTransition(() => setIsRefreshing(false));
      }
    } catch (err) {
      console.error('Failed to load events', err);
      startTransition(() => setIsRefreshing(false));
    }
  }, [currentPage, isUpcoming, userCreatedEvents]);

  const handleSaveNewEvent = (newEvent: EventActivity) => {
    setUserCreatedEvents(prev => [newEvent, ...prev]);
    if (view === AppView.CITY_DETAIL && selectedCity?.name === newEvent.cityName) {
       setEvents(prev => [newEvent, ...prev]);
    }
  };

  const handleRetrySearch = () => {
    resetQuotaStandby();
    loadCityEvents(selectedCity?.name || 'All', { 
      category: activeCategory,
      keyword: searchQuery || undefined,
      forceRefresh: true
    });
  };

  const prefetchCategory = useCallback((cat: Category) => {
    const cityName = selectedCity?.name || 'All';
    fetchEvents(cityName, { 
      category: cat,
      keyword: searchQuery || undefined
    }).catch(() => {});
  }, [selectedCity, searchQuery]);

  useEffect(() => {
    if (selectedCity) {
      const warmCategories: Category[] = ['Sports', 'Entertainment', 'Arts & Culture'];
      warmCategories.forEach(cat => prefetchCategory(cat));
    }
  }, [selectedCity, prefetchCategory]);

  const toggleSaveEvent = useCallback((event: EventActivity) => {
    setSavedEventIds(prev => {
      if (prev.includes(event.id)) return prev.filter(id => id !== event.id);
      return [...prev, event.id];
    });
  }, []);

  const sortedAndFilteredEvents = useMemo(() => {
    let result = [...events];
    if (userLocation) {
      result = result.map(e => ({
        ...e,
        distance: (e.lat && e.lng) ? getDistance(userLocation.lat, userLocation.lng, e.lat, e.lng) : undefined
      }));
    }
    if (isSortingByDistance && userLocation) {
      result.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
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
      loadCityEvents(selectedCity?.name || 'All', { 
        category: cat,
        keyword: searchQuery || undefined
      });
    });
  };

  const handleHome = () => {
    startTransition(() => {
      setView(AppView.LANDING);
      setSelectedCity(null);
      setEvents([]);
      setSources([]);
      setIsSortingByDistance(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const addToCalendar = (event: EventActivity) => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description);
    const location = encodeURIComponent(event.venue || event.location || '');
    const dateParts = event.date?.split('/') || [];
    let dateStr = '';
    if (dateParts.length === 3) {
      const [m, d, y] = dateParts;
      dateStr = `${y}${m.toString().padStart(2, '0')}${d.toString().padStart(2, '0')}`;
    }
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&location=${location}`;
    window.open(googleUrl, '_blank');
  };

  const getPriceDisplay = (event: EventActivity) => {
    if (event.isFree) return { text: 'Free Entry', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (event.price) return { text: event.price, className: 'bg-orange-50 text-orange-700 border-orange-100' };
    if (event.priceLevel) return { text: event.priceLevel, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return null;
  };

  /**
   * Intelligently parses and refines event location data
   */
  const getRefinedLocation = (event: EventActivity) => {
    let venue = event.venue || "";
    let address = event.location || "";

    // If venue and address are identical, or address contains venue name
    if (address && venue && address.toLowerCase().includes(venue.toLowerCase())) {
        // Leave as is, but maybe strip the venue name from start of address if it repeats
        if (address.toLowerCase().startsWith(venue.toLowerCase())) {
            const trimmed = address.slice(venue.length).trim();
            if (trimmed.startsWith(',') || trimmed.startsWith('-')) {
                address = trimmed.slice(1).trim();
            } else if (trimmed.length > 5) {
                address = trimmed;
            }
        }
    }

    // If venue is missing, try to find it in the location string
    if (!venue && address) {
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 1) {
            // Heuristic: common venue indicators
            const venueKeywords = ['Center', 'Park', 'Arena', 'Hall', 'Theater', 'Stadium', 'Club', 'Bar', 'Gallery', 'Museum', 'Square', 'Mall'];
            const firstPartIsVenue = venueKeywords.some(k => parts[0].includes(k));
            if (firstPartIsVenue) {
                venue = parts[0];
                address = parts.slice(1).join(', ');
            }
        }
    }

    // If venue is still missing, scan the description for city-area names
    if (!venue && event.description) {
        // Regex for capitalized phrases that look like venues (e.g. "BOK Center", "Klyde Warren Park")
        const venueRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Center|Park|Arena|Hall|Theater|Stadium|Club|Gallery|Museum|District|Field|Plaza))/g;
        const matches = event.description.match(venueRegex);
        if (matches && matches.length > 0) {
            venue = matches[0];
        }
    }

    // Ensure we don't just show the city name as the venue
    const cityNames = CITIES.map(c => c.name.toLowerCase());
    if (venue && cityNames.includes(venue.toLowerCase())) {
        venue = "";
    }

    return { 
        venue: venue || event.title + " Venue", 
        address: (address && !cityNames.includes(address.toLowerCase())) ? address : (event.cityName || "") 
    };
  };

  const openDetails = (event: EventActivity) => {
    setDetailedEvent(event);
    setIsModalDescExpanded(false);
  };

  const closeDetails = () => {
    setDetailedEvent(null);
  };

  const modalDescription = detailedEvent ? (
    detailedEvent.description.length > 250 && !isModalDescExpanded
      ? detailedEvent.description.slice(0, 250) + '...'
      : detailedEvent.description
  ) : '';

  const refinedLoc = detailedEvent ? getRefinedLocation(detailedEvent) : { venue: "", address: "" };

  return (
    <Layout 
      onHome={handleHome} 
      onAuth={() => setShowAuthModal(true)} 
      onSearch={handleGlobalSearch}
      onPostEvent={() => setShowCreateModal(true)}
    >
      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img 
              src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" 
              alt="City Skyline" 
            />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.3em] uppercase mb-6 block text-sm">Metropolitan Sourcing & Discovery</span>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
                Live Your Best <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Inside The Metro</span>
              </h2>
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
              <button 
                onClick={handleHome} 
                className="text-xs font-black uppercase tracking-widest text-orange-500 mb-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full transition-colors flex items-center gap-2"
              >
                <span>←</span> Back to Hub
              </button>
              <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none">{view === AppView.SEARCH_RESULTS ? `Search: "${searchQuery}"` : selectedCity?.name}</h2>
              {selectedCity && <p className="text-xl text-gray-400 max-w-3xl font-medium leading-relaxed">{selectedCity.description}</p>}
              
              <div className="flex flex-wrap items-center gap-4 mt-8">
                {isRefreshing ? (
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl animate-pulse">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-orange-400 font-bold text-xs uppercase tracking-widest">Updating...</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 border px-6 py-3 rounded-2xl transition-colors ${
                    sourceStatus === 'grounded' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    sourceStatus === 'ai' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                    'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      sourceStatus === 'grounded' ? 'bg-emerald-500 animate-pulse' :
                      sourceStatus === 'ai' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <span className="font-bold text-[10px] uppercase tracking-widest">
                      {sourceStatus === 'grounded' ? 'Live Grounded' : 
                       sourceStatus === 'ai' ? 'AI Knowledge' : 'Cached Hub'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 mt-16">
            <div className="flex flex-col space-y-8 mb-12 border-b border-gray-100 pb-10">
              <div className="flex overflow-x-auto scrollbar-hide space-x-3 w-full pb-2">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => handleCategoryClick(cat)}
                    onMouseEnter={() => prefetchCategory(cat)}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-200 hover:text-orange-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
              {(isRefreshing && sortedAndFilteredEvents.length === 0) ? (
                Array.from({ length: 6 }).map((_, i) => <EventSkeleton key={i} />)
              ) : sortedAndFilteredEvents.length > 0 ? (
                sortedAndFilteredEvents.map(event => (
                  <EventItem key={event.id} event={event} showCity={view === AppView.SEARCH_RESULTS} isSaved={savedEventIds.includes(event.id)} onToggleSave={toggleSaveEvent} onOpenDetails={openDetails} />
                ))
              ) : (
                <div className="col-span-full py-24 text-center">
                  <h3 className="text-xl font-black text-gray-900 mb-2">No upcoming events found</h3>
                  <p className="text-gray-500">Try checking another category or city.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} onSave={handleSaveNewEvent} />}

      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={closeDetails} />
          <div ref={modalRef} className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <button onClick={closeDetails} className="absolute top-6 right-6 z-30 p-2 text-white bg-black/20 hover:bg-white hover:text-gray-900 rounded-full transition-all backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {/* Hero Image in Modal */}
            <div className="relative h-64 md:h-80 w-full shrink-0">
              <img 
                src={detailedEvent.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200`} 
                alt={detailedEvent.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              <div className="absolute bottom-6 left-8 flex flex-wrap gap-2">
                <span className="px-4 py-1.5 bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                  {detailedEvent.category}
                </span>
                {detailedEvent.userCreated && (
                  <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    Community Post
                  </span>
                )}
              </div>
            </div>

            <div className="p-8 md:p-12 pt-0 overflow-y-auto">
              <header className="mb-10">
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tighter">
                  {detailedEvent.title}
                </h2>
                
                {/* Enhanced Logistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 border-y border-gray-100 py-8">
                  {/* Date Item */}
                  <div className="flex items-start group">
                    <div className="p-3 bg-orange-50 rounded-2xl mr-4 group-hover:bg-orange-100 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date</p>
                      <p className="text-gray-900 font-black text-sm">{detailedEvent.date || 'To be announced'}</p>
                    </div>
                  </div>

                  {/* Time Item */}
                  <div className="flex items-start group">
                    <div className="p-3 bg-orange-50 rounded-2xl mr-4 group-hover:bg-orange-100 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Schedule</p>
                      <p className="text-gray-900 font-black text-sm">
                        {detailedEvent.time ? (
                          <>
                            {detailedEvent.time}
                            {detailedEvent.endTime ? ` — ${detailedEvent.endTime}` : ''}
                          </>
                        ) : 'Check official site for times'}
                      </p>
                    </div>
                  </div>

                  {/* Location Item */}
                  <div className="flex items-start group">
                    <div className="p-3 bg-orange-50 rounded-2xl mr-4 group-hover:bg-orange-100 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</p>
                      <p className="text-gray-900 font-black text-sm truncate" title={refinedLoc.venue}>
                        {refinedLoc.venue}
                      </p>
                      <p className="text-gray-400 text-xs font-medium truncate" title={refinedLoc.address}>
                        {refinedLoc.address}
                      </p>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(refinedLoc.venue + ' ' + refinedLoc.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center mt-2"
                      >
                        Get Directions
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Admission Item */}
                  <div className="flex items-start group">
                    <div className="p-3 bg-orange-50 rounded-2xl mr-4 group-hover:bg-orange-100 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Admission</p>
                      <div className="flex items-center">
                        <p className="text-gray-900 font-black text-sm mr-2">{detailedEvent.isFree ? 'Free' : (detailedEvent.price || detailedEvent.priceLevel || 'Ticketed')}</p>
                        {getPriceDisplay(detailedEvent) && !detailedEvent.isFree && (
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getPriceDisplay(detailedEvent)!.className}`}>
                            {getPriceDisplay(detailedEvent)!.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <div className="mb-12">
                <p className="text-gray-600 text-lg leading-relaxed font-medium">
                  {modalDescription}
                </p>
                {detailedEvent.description.length > 250 && (
                  <button 
                    onClick={() => setIsModalDescExpanded(!isModalDescExpanded)}
                    className="text-orange-600 text-xs font-black uppercase tracking-widest hover:underline transition-all mt-4 flex items-center gap-2 group"
                  >
                    {isModalDescExpanded ? 'View Less Details' : 'View Full Description'}
                    <svg className={`w-3.5 h-3.5 transform transition-transform ${isModalDescExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              <footer className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-100 mt-auto">
                <a 
                  href={detailedEvent.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(detailedEvent.title + ' ' + (detailedEvent.cityName || ''))}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 px-8 py-5 bg-orange-600 text-white font-black rounded-2xl text-center hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 active:scale-95"
                >
                  Visit Official Event Site
                </a>
                <button 
                  onClick={() => addToCalendar(detailedEvent)} 
                  className="px-8 py-5 bg-white text-gray-900 border-2 border-gray-100 font-black rounded-2xl flex items-center justify-center hover:border-orange-500 hover:text-orange-600 transition-all active:scale-95"
                >
                  Add to My Calendar
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

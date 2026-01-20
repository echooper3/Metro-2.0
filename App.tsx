
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import { CITIES, CATEGORIES } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource } from './types';
import { fetchEvents, FetchOptions } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [events, setEvents] = useState<EventActivity[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState<EventActivity | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSortingByDistance, setIsSortingByDistance] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('metro_favorites');
    if (stored) {
      try { setSavedEventIds(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('metro_favorites', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailedEvent(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleToggleDistanceSort = () => {
    if (!userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsSortingByDistance(true);
          },
          (err) => {
            console.error("Geolocation error:", err);
            alert("Could not access your location. Please check your browser permissions.");
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    } else {
      setIsSortingByDistance(!isSortingByDistance);
    }
  };

  const toggleSaveEvent = useCallback((event: EventActivity) => {
    setSavedEventIds(prev => {
      if (prev.includes(event.id)) {
        return prev.filter(id => id !== event.id);
      }
      return [...prev, event.id];
    });
  }, []);

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setCurrentPage(1);
      setSelectedLocation('All Locations');
      setHasMore(true);
    }

    const targetPage = append ? currentPage + 1 : 1;
    const data = await fetchEvents(cityName, { ...options, page: targetPage });
    
    let processedEvents = data.events;
    if (activeCategory === 'All') {
      processedEvents = [...data.events].sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
    }

    // Assume if we got less than 10, there are no more
    if (processedEvents.length < 10) setHasMore(false);

    if (append) {
      setEvents(prev => [...prev, ...processedEvents]);
      setCurrentPage(targetPage);
      setIsLoadingMore(false);
    } else {
      setEvents(processedEvents);
      setSources(data.sources);
      setIsLoading(false);
    }
  }, [activeCategory, currentPage]);

  const venuesList = useMemo(() => {
    const venues = new Set<string>();
    events.forEach(e => {
      const v = e.venue || e.location;
      if (v && v.length < 40) venues.add(v);
    });
    return ['All Locations', ...Array.from(venues)].sort();
  }, [events]);

  const sortedAndFilteredEvents = useMemo(() => {
    let result = [...events];
    
    if (userLocation) {
      result = result.map(e => ({
        ...e,
        distance: (e.lat && e.lng) ? getDistance(userLocation.lat, userLocation.lng, e.lat, e.lng) : undefined
      }));
    }

    if (selectedLocation !== 'All Locations') {
      result = result.filter(e => (e.venue === selectedLocation || e.location === selectedLocation));
    }

    if (isSortingByDistance && userLocation) {
      result.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [events, selectedLocation, isSortingByDistance, userLocation]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setView(AppView.CITY_DETAIL);
    setActiveCategory('All');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    loadCityEvents(city.name, { category: 'All' });
  };

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    setDateRange({ start: '', end: '' });
    loadCityEvents('All', { keyword: query, category: 'All' });
  };

  const handleCategoryClick = (cat: Category) => {
    setActiveCategory(cat);
    loadCityEvents(selectedCity?.name || 'All', { 
      category: cat,
      startDate: dateRange.start || undefined, 
      endDate: dateRange.end || undefined,
      keyword: searchQuery || undefined
    });
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    const newRange = { ...dateRange, [type]: val };
    setDateRange(newRange);
    loadCityEvents(selectedCity?.name || 'All', { 
      category: activeCategory,
      startDate: newRange.start || undefined, 
      endDate: newRange.end || undefined,
      keyword: searchQuery || undefined
    });
  };

  const clearDates = () => {
    setDateRange({ start: '', end: '' });
    loadCityEvents(selectedCity?.name || 'All', { 
      category: activeCategory,
      keyword: searchQuery || undefined
    });
  };

  const handleLoadMore = () => {
    loadCityEvents(selectedCity?.name || 'All', {
      category: activeCategory,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      keyword: searchQuery || undefined
    }, true);
  };

  const handleHome = () => {
    setView(AppView.LANDING);
    setSelectedCity(null);
    setEvents([]);
    setDateRange({ start: '', end: '' });
    setIsSortingByDistance(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCalendar = (event: EventActivity) => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description);
    const location = encodeURIComponent(event.location);
    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`, '_blank');
  };

  return (
    <Layout onHome={handleHome} onAuth={() => setShowAuthModal(true)} onSearch={handleGlobalSearch}>
      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="" />
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
                className="text-xs font-black uppercase tracking-widest text-orange-500 mb-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full transition-colors"
                aria-label="Back to home"
              >
                ← Back to Metro Hubs
              </button>
              <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none">{view === AppView.SEARCH_RESULTS ? `Search: "${searchQuery}"` : selectedCity?.name}</h2>
              {selectedCity && <p className="text-xl text-gray-400 max-w-3xl font-medium leading-relaxed">{selectedCity.description}</p>}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 mt-16">
            <div className="flex flex-col space-y-8 mb-12 border-b border-gray-100 pb-10">
              <div className="flex overflow-x-auto scrollbar-hide space-x-3 w-full" aria-label="Category filter">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => handleCategoryClick(cat)} 
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl focus-within:border-orange-300 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">From</span>
                    <input 
                      type="date" 
                      value={dateRange.start} 
                      onChange={(e) => handleDateChange('start', e.target.value)} 
                      className="bg-transparent text-xs font-bold text-gray-700 outline-none" 
                      aria-label="From date" 
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl focus-within:border-orange-300 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">To</span>
                    <input 
                      type="date" 
                      value={dateRange.end} 
                      onChange={(e) => handleDateChange('end', e.target.value)} 
                      className="bg-transparent text-xs font-bold text-gray-700 outline-none" 
                      aria-label="To date" 
                    />
                  </div>
                  
                  {(dateRange.start || dateRange.end) && (
                    <button 
                      onClick={clearDates} 
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                      title="Clear date range" 
                      aria-label="Clear date range filters"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      Clear Dates
                    </button>
                  )}

                  <button 
                    onClick={handleToggleDistanceSort}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                      isSortingByDistance ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {isSortingByDistance ? 'Sorting by Distance' : 'Sort by Distance'}
                  </button>
                </div>

                <div className="w-full md:w-auto flex items-center gap-3">
                  <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-gray-400">At</span>
                  <select 
                    value={selectedLocation} 
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-gray-50 border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-600 px-6 py-3 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all w-full md:w-64"
                    aria-label="Filter by venue or location within the city"
                  >
                    {venuesList.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{[...Array(6)].map((_, i) => <EventSkeleton key={i} />)}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedAndFilteredEvents.length > 0 ? (
                    sortedAndFilteredEvents.map(event => (
                      <EventItem 
                        key={event.id} 
                        event={event} 
                        showCity={view === AppView.SEARCH_RESULTS}
                        isSaved={savedEventIds.includes(event.id)}
                        onToggleSave={toggleSaveEvent}
                        onOpenDetails={setDetailedEvent}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-24 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
                        <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">No experiences found</h3>
                      <p className="text-gray-500">Try adjusting your filters or expanding your search.</p>
                    </div>
                  )}
                </div>
                
                {hasMore && sortedAndFilteredEvents.length >= 10 && (
                  <div className="mt-16 flex justify-center">
                    <button 
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-12 py-5 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm flex items-center gap-3 disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          Loading More...
                        </>
                      ) : (
                        <>
                          Explore More
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Rich Details Modal */}
      {detailedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDetailedEvent(null)} />
          <div 
            ref={modalRef}
            className="relative bg-white rounded-[2.5rem] w-full max-w-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col"
          >
            <button 
              onClick={() => setDetailedEvent(null)} 
              className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all" 
              aria-label="Close details"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <header className="mb-8 pr-12">
              <div className="flex gap-2 mb-4">
                <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-block">{detailedEvent.category}</span>
                {detailedEvent.ageRestriction && (
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-block border border-gray-200">
                    {detailedEvent.ageRestriction}
                  </span>
                )}
              </div>
              <h2 id="modal-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tighter">{detailedEvent.title}</h2>
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-bold text-gray-500">
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2.5}/></svg>
                  {detailedEvent.date}
                </span>
                {detailedEvent.time && (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2.5}/></svg>
                    {detailedEvent.time}
                  </span>
                )}
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth={2.5}/></svg>
                  {detailedEvent.venue || detailedEvent.location}
                </span>
                {detailedEvent.distance !== undefined && (
                  <span className="flex items-center text-orange-600">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.512a2 2 0 011.053-1.789L9 1l6 3 5.447-2.724A2 2 0 0121 3.064v9.976a2 2 0 01-1.053 1.789L15 17.5l-6 2.5z" strokeWidth={2.5}/></svg>
                    {detailedEvent.distance.toFixed(1)} km away
                  </span>
                )}
              </div>
            </header>

            <div className="flex-grow prose prose-orange max-w-none mb-10 overflow-y-auto text-pretty">
              <div className="mb-8">
                <h4 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">Age Requirement</h4>
                <p className="text-gray-900 font-black">{detailedEvent.ageRestriction || 'All Ages'}</p>
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">Description</h4>
              <p className="text-gray-600 text-lg leading-relaxed font-medium">{detailedEvent.description}</p>
            </div>

            <footer className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-gray-100 mt-auto">
              {detailedEvent.sourceUrl ? (
                <a 
                  href={detailedEvent.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 px-8 py-5 bg-orange-600 text-white font-black rounded-2xl text-center hover:bg-orange-700 transition-all shadow-xl shadow-orange-200"
                  aria-label="Visit official event website"
                >
                  Visit Official Site
                </a>
              ) : (
                <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent(detailedEvent.title + ' ' + (detailedEvent.cityName || ''))}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 px-8 py-5 bg-gray-900 text-white font-black rounded-2xl text-center hover:bg-black transition-all shadow-xl shadow-gray-200"
                  aria-label="Search for more information about this event"
                >
                  Search for More Info
                </a>
              )}
              <button 
                onClick={() => addToCalendar(detailedEvent)} 
                className="px-8 py-5 bg-gray-50 text-gray-900 border-2 border-gray-200 font-black rounded-2xl flex items-center justify-center hover:border-orange-500 hover:text-orange-600 transition-all group"
                aria-label="Add event to Google Calendar"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Add to Calendar
              </button>
            </footer>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

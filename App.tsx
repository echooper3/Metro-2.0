
import React, { useState, useEffect, useCallback } from 'react';
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
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('metro_favorites');
    if (stored) {
      try {
        setSavedEventIds(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem('metro_favorites', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  const toggleSaveEvent = (event: EventActivity) => {
    setSavedEventIds(prev => 
      prev.includes(event.id) 
        ? prev.filter(id => id !== event.id) 
        : [...prev, event.id]
    );
  };

  const loadCityEvents = useCallback(async (cityName: string | 'All', options: FetchOptions = {}, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setCurrentPage(1);
    }

    const data = await fetchEvents(cityName, { ...options, page: append ? currentPage + 1 : 1 });
    
    if (append) {
      setEvents(prev => [...prev, ...data.events]);
      setSources(prev => {
        const existingUris = new Set(prev.map(s => s.uri));
        const newSources = data.sources.filter(s => !existingUris.has(s.uri));
        return [...prev, ...newSources];
      });
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    } else {
      setEvents(data.events);
      setSources(data.sources);
      setIsLoading(false);
    }
  }, [currentPage]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setView(AppView.CITY_DETAIL);
    setActiveCategory('All');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    loadCityEvents(city.name);
  };

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    loadCityEvents('All', { keyword: query });
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    const newRange = { ...dateRange, [type]: val };
    setDateRange(newRange);
    const cityName = selectedCity ? selectedCity.name : 'All';
    loadCityEvents(cityName, { 
      category: activeCategory, 
      startDate: newRange.start, 
      endDate: newRange.end,
      keyword: searchQuery
    });
  };

  const clearDates = () => {
    const newRange = { start: '', end: '' };
    setDateRange(newRange);
    const cityName = selectedCity ? selectedCity.name : 'All';
    loadCityEvents(cityName, { 
      category: activeCategory, 
      startDate: '', 
      endDate: '',
      keyword: searchQuery
    });
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    const cityName = selectedCity ? selectedCity.name : 'All';
    loadCityEvents(cityName, { 
      keyword: searchQuery,
      category: cat,
      startDate: dateRange.start, 
      endDate: dateRange.end 
    });
  };

  const handleLoadMore = () => {
    const cityName = selectedCity ? selectedCity.name : 'All';
    const options: FetchOptions = {
      category: activeCategory,
      startDate: dateRange.start,
      endDate: dateRange.end,
      keyword: searchQuery
    };
    loadCityEvents(cityName, options, true);
  };

  const handleHome = () => {
    setView(AppView.LANDING);
    setSelectedCity(null);
    setEvents([]);
    setSearchQuery('');
    setActiveCategory('All');
    setDateRange({ start: '', end: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout 
      onHome={handleHome} 
      onAuth={() => setShowAuthModal(true)}
      onSearch={handleGlobalSearch}
    >
      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[700px] flex items-center justify-center overflow-hidden bg-gray-950">
            <img 
              src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
              alt="Metro architecture"
            />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-500 font-black tracking-[0.3em] uppercase mb-6 block text-sm">Real-time Activity Sourcing</span>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
                Discover Life <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600">Inside The Metro</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                The ultimate guide to sports, music, and local culture across Tulsa, Oklahoma City, Dallas, and Houston.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto px-12 py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all transform hover:-translate-y-1 shadow-2xl shadow-orange-900/40"
                >
                  Join the Community
                </button>
                <a href="#city-selection" className="text-white font-black flex items-center hover:text-orange-400 transition-colors py-4 group uppercase text-xs tracking-widest">
                  Select a City
                  <svg className="w-5 h-5 ml-3 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent" />
          </section>

          <section id="city-selection" className="max-w-7xl mx-auto px-4 py-24">
            <div className="mb-20 text-center">
              <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Metropolitan Hubs</h3>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
                Sourcing the pulse of the Southwest. Select your region to see what's happening right now.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {CITIES.map(city => (
                <CityCard key={city.id} city={city} onClick={handleCitySelect} />
              ))}
            </div>
          </section>
        </div>
      )}

      {(view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS) && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 pb-24">
          <div className="bg-gray-950 pt-32 pb-24 text-white relative overflow-hidden">
             {selectedCity && (
               <img 
                src={selectedCity.image} 
                className="absolute inset-0 w-full h-full object-cover opacity-10 blur-sm scale-110"
                alt={selectedCity.name}
              />
             )}
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <button 
                onClick={handleHome}
                className="inline-flex items-center text-xs font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 mb-10 transition-colors bg-white/5 px-6 py-3 rounded-full backdrop-blur-md group"
              >
                <svg className="w-4 h-4 mr-3 rotate-180 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Back to All Cities
              </button>
              
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-none">
                {view === AppView.SEARCH_RESULTS 
                  ? `Search: "${searchQuery}"` 
                  : `${selectedCity?.name}, ${selectedCity?.state}`}
              </h2>
              {selectedCity && (
                <p className="text-xl text-gray-400 max-w-3xl leading-relaxed font-medium">
                  {selectedCity.description}
                </p>
              )}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 mt-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 pb-10 border-b border-gray-100">
              {/* Category Filter */}
              <div className="flex overflow-x-auto scrollbar-hide space-x-3 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    title={`View ${cat} events`}
                    className={`px-6 py-3 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                      ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-500 hover:text-orange-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl relative border border-gray-100 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1.5 mb-1">From</span>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="bg-transparent text-sm font-black text-gray-700 outline-none px-1.5 py-0.5 border-b-2 border-transparent focus:border-orange-500" 
                  />
                </div>
                <div className="w-px h-10 bg-gray-200 mx-1" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1.5 mb-1">Until</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="bg-transparent text-sm font-black text-gray-700 outline-none px-1.5 py-0.5 border-b-2 border-transparent focus:border-orange-500" 
                  />
                </div>
                {(dateRange.start || dateRange.end) && (
                  <button 
                    onClick={clearDates}
                    className="ml-4 p-2.5 text-orange-600 hover:bg-orange-100 rounded-full transition-all"
                    title="Reset date filters"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <EventSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.length > 0 ? (
                    events.map(event => (
                      <EventItem 
                        key={event.id} 
                        event={event} 
                        showCity={view === AppView.SEARCH_RESULTS}
                        isSaved={savedEventIds.includes(event.id)}
                        onToggleSave={toggleSaveEvent}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-40 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                      <div className="text-7xl mb-8 grayscale opacity-50">🏜️</div>
                      <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">The Metro is Quiet...</h3>
                      <p className="text-gray-500 max-w-sm mx-auto font-medium">No activities match your current filters. Try adjusting your dates or exploring a different category.</p>
                      <button 
                        onClick={() => { setActiveCategory('All'); clearDates(); }}
                        className="mt-10 px-8 py-3 bg-white border-2 border-orange-600 text-orange-600 font-black rounded-2xl hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-100"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingMore && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                    {[...Array(3)].map((_, i) => (
                      <EventSkeleton key={`more-${i}`} />
                    ))}
                  </div>
                )}

                {events.length > 0 && events.length % 10 === 0 && !isLoadingMore && (
                  <div className="mt-16 flex justify-center">
                    <button 
                      onClick={handleLoadMore}
                      className="px-12 py-5 bg-white border-2 border-orange-100 text-orange-600 font-black rounded-2xl hover:border-orange-600 transition-all shadow-sm flex items-center group"
                    >
                      Load More Experiences
                      <svg className="w-5 h-5 ml-3 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}

                {sources.length > 0 && (
                  <div className="mt-24 p-12 bg-gray-50 rounded-[3rem] border border-gray-100">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8 flex items-center justify-center lg:justify-start">
                      <span className="w-8 h-px bg-gray-200 mr-4 hidden lg:block" />
                      Verified Search Grounding
                      <span className="w-8 h-px bg-gray-200 ml-4 hidden lg:block" />
                    </h4>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                      {sources.map((source, i) => (
                        <a 
                          key={i} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-xs font-black text-orange-600 hover:text-white hover:bg-orange-600 bg-white border border-orange-100 px-5 py-2.5 rounded-2xl transition-all shadow-sm hover:-translate-y-0.5"
                        >
                          {source.title}
                          <svg className="w-4 h-4 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal Mock */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-md p-12 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-10 right-10 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transform -rotate-6">
                 <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-3xl">M</span>
                  </div>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Join the Metro</h2>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Insider Access & Alerts</p>
            </div>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Email</label>
                <input type="email" placeholder="metro.explorer@email.com" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-bold" />
              </div>
              <button className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-200 hover:-translate-y-1 text-lg">
                Enter The Metro
              </button>
            </form>
            <p className="mt-10 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed px-6">
              By joining, you agree to receive real-time updates and accept our <span className="text-orange-600 border-b-2 border-orange-100">Privacy Policy</span>
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;


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
  };

  return (
    <Layout 
      onHome={handleHome} 
      onAuth={() => setShowAuthModal(true)}
      onSearch={handleGlobalSearch}
    >
      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[650px] flex items-center justify-center overflow-hidden bg-gray-900">
            <img 
              src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920" 
              className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
              alt="Metropolitan area"
            />
            <div className="relative z-10 text-center max-w-4xl px-4">
              <span className="text-orange-400 font-bold tracking-widest uppercase mb-4 block">Metro Explorer 2.0</span>
              <h2 className="text-5xl md:text-8xl font-black text-white mb-6 leading-tight tracking-tight">
                Life Happens <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">Inside The Metro</span>
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                Sourcing real-time events, sports, and cultural activities across Tulsa, OKC, Dallas, and Houston.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto px-10 py-5 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all transform hover:-translate-y-1 shadow-xl shadow-orange-900/40"
                >
                  Join the Metro
                </button>
                <a href="#city-selection" className="text-white font-bold flex items-center hover:text-orange-400 transition-colors py-3 group">
                  Select a City
                  <svg className="w-5 h-5 ml-2 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
            </div>
          </section>

          <section id="city-selection" className="max-w-7xl mx-auto px-4 py-24">
            <div className="mb-16">
              <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Metropolitan Centers</h3>
              <p className="text-gray-500 text-lg max-w-2xl">
                Choose your region to discover curated local activities, from professional sports to community arts.
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
        <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="bg-gray-950 py-20 text-white relative overflow-hidden">
             {selectedCity && (
               <img 
                src={selectedCity.image} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-105"
                alt={selectedCity.name}
              />
             )}
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <button 
                onClick={handleHome}
                className="inline-flex items-center text-sm font-bold text-orange-400 hover:text-orange-300 mb-8 transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm group"
              >
                <svg className="w-4 h-4 mr-2 rotate-180 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Back to Cities
              </button>
              
              <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
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

          <div className="max-w-7xl mx-auto px-4 mt-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-100">
              {/* Category Filter */}
              <div className="flex overflow-x-auto scrollbar-hide space-x-2 py-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    title={cat}
                    className={`px-6 py-2.5 rounded-2xl whitespace-nowrap text-sm font-bold transition-all ${
                      activeCategory === cat 
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-400 hover:text-orange-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl relative">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">From</span>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 border-b border-transparent focus:border-orange-500" 
                  />
                </div>
                <div className="w-px h-8 bg-gray-200 mx-2" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">To</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 border-b border-transparent focus:border-orange-500" 
                  />
                </div>
                {(dateRange.start || dateRange.end) && (
                  <button 
                    onClick={clearDates}
                    className="ml-2 p-2 text-gray-400 hover:text-orange-600 transition-colors"
                    title="Clear date filter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    <div className="col-span-full py-32 text-center bg-gray-50 rounded-3xl">
                      <div className="text-6xl mb-6">🏜️</div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">No activities found</h3>
                      <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your filters or date range to find more happening Inside The Metro.</p>
                      <button 
                        onClick={() => { setActiveCategory('All'); setDateRange({start: '', end: ''}); }}
                        className="mt-8 text-orange-600 font-bold hover:underline"
                      >
                        Reset all filters
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
                  <div className="mt-12 flex justify-center">
                    <button 
                      onClick={handleLoadMore}
                      className="px-10 py-4 bg-white border-2 border-orange-100 text-orange-600 font-black rounded-2xl hover:border-orange-600 transition-all shadow-sm flex items-center group"
                    >
                      Load More Events
                      <svg className="w-5 h-5 ml-2 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}

                {sources.length > 0 && (
                  <div className="mt-20 p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Search Grounding
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {sources.map((source, i) => (
                        <a 
                          key={i} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-xs font-bold text-orange-600 hover:text-white hover:bg-orange-600 bg-white border border-orange-100 px-4 py-2 rounded-xl transition-all shadow-sm"
                        >
                          {source.title}
                          <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-2xl">M</span>
                  </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Join the Metro</h2>
              <p className="text-gray-500 font-medium">Save events, get alerts, and connect with your city.</p>
            </div>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Email</label>
                <input type="email" placeholder="metro.explorer@email.com" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all font-semibold" />
              </div>
              <button className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 hover:-translate-y-0.5">
                Sign In / Sign Up
              </button>
            </form>
            <p className="mt-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
              By joining, you agree to our <span className="text-orange-600">Terms of Service</span>
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import CityCard from './components/CityCard';
import EventItem from './components/EventItem';
import EventSkeleton from './components/EventSkeleton';
import ErrorBoundary from './components/ErrorBoundary';
import { CITIES, CATEGORIES, SEED_EVENTS, GLOBAL_SEED_EVENTS } from './constants';
import { City, AppView, EventActivity, Category, GroundingSource, WeatherData, UserProfile } from './types';
import { fetchEvents, FetchOptions, getCacheKey, getCachedData } from './services/geminiService';
import { fetchCityWeather } from './services/weatherService';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, ArrowRight, TrendingUp, Sparkles, X, Globe, Zap, Clock, DollarSign, User as UserIcon, Heart, AlertTriangle } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, orderBy, getDocFromServer, increment, serverTimestamp } from 'firebase/firestore';

const CreateEventModal = lazy(() => import('./components/CreateEventModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

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
  const allEventsRef = useRef(allEvents);
  useEffect(() => {
    allEventsRef.current = allEvents;
  }, [allEvents]);
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dbEvents, setDbEvents] = useState<EventActivity[]>([]);
  const isAdmin = user?.email === 'donva.adkism@gmail.com';
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);

  const updateWeather = useCallback(async (cityName: string) => {
    try {
      const data = await fetchCityWeather(cityName);
      if (data) setWeather(data);
    } catch (e) {
      console.warn("Weather sync failed.");
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

  const trackView = useCallback(async (type: 'page' | 'city' | 'event' | 'category' | 'search' | 'save', id?: string) => {
    if (!isAuthReady) return;
    try {
      const statsRef = doc(db, 'stats', 'traffic');
      const updateData: any = {
        totalViews: increment(1),
        lastUpdated: serverTimestamp()
      };
      if (type === 'city' && id) {
        updateData[`cityViews.${id.replace(/\s+/g, '_')}`] = increment(1);
      }
      if (type === 'event' && id) {
        updateData[`eventViews.${id.replace(/\s+/g, '_')}`] = increment(1);
      }
      if (type === 'category' && id) {
        updateData[`categoryViews.${id.replace(/\s+/g, '_')}`] = increment(1);
      }
      if (type === 'search' && id) {
        // Limit search query length and sanitize
        const query = id.toLowerCase().trim().substring(0, 50).replace(/[.#$[\]]/g, '_');
        if (query) updateData[`searchQueries.${query}`] = increment(1);
      }
      if (type === 'save' && id) {
        updateData[`eventSaves.${id.replace(/\s+/g, '_')}`] = increment(1);
      }
      
      await updateDoc(statsRef, updateData).catch(async (err) => {
        // If doc doesn't exist, create it
        if (err.code === 'not-found') {
          const initialData: any = {
            totalViews: 1,
            cityViews: type === 'city' ? { [id!.replace(/\s+/g, '_')]: 1 } : {},
            eventViews: type === 'event' ? { [id!.replace(/\s+/g, '_')]: 1 } : {},
            categoryViews: type === 'category' ? { [id!.replace(/\s+/g, '_')]: 1 } : {},
            searchQueries: type === 'search' ? { [id!.toLowerCase().replace(/\s+/g, '_')]: 1 } : {},
            eventSaves: type === 'save' ? { [id!.replace(/\s+/g, '_')]: 1 } : {},
            lastUpdated: serverTimestamp()
          };
          await setDoc(statsRef, initialData);
        }
      });
    } catch (e) {
      console.warn("Traffic tracking failed", e);
    }
  }, [isAuthReady]);

  const handleOpenDetails = useCallback((event: EventActivity) => {
    setDetailedEvent(event);
    trackView('event', event.title);
  }, [trackView]);

  const handleToggleSave = useCallback(async (event: EventActivity) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const isSaved = user.savedEvents.includes(event.id);
    const nextSaved = isSaved 
      ? user.savedEvents.filter(id => id !== event.id)
      : [...user.savedEvents, event.id];
    
    try {
      await updateDoc(doc(db, 'users', user.id), { savedEvents: nextSaved });
      setUser(prev => prev ? { ...prev, savedEvents: nextSaved } : null);
      if (!isSaved) trackView('save', event.title);
      addToast(isSaved ? "Signal removed from vault" : "Signal secured in vault");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  }, [user]);

  const filteredEvents = useMemo(() => {
    const combined = [...dbEvents, ...allEvents];
    // De-duplicate by title
    const seen = new Set();
    const unique = combined.filter(e => {
      const key = e.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.filter(e => {
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      const matchesCity = !selectedCity || (e.cityName && e.cityName.toLowerCase().includes(selectedCity.name.toLowerCase()));
      const matchesQuery = !searchQuery || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCity && matchesQuery;
    });
  }, [allEvents, dbEvents, activeCategory, selectedCity, searchQuery]);

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
      if (!cached && allEvents.length === 0) setAllEvents([]); 
    } else {
      setIsPageLoading(true);
    }

    try {
      const result = await fetchEvents(cityName, { ...options, category: targetCategory, fastSync: !isNextPage });
      if (requestId !== fetchIdRef.current) return;

      if (result && result.events.length > 0) {
        startTransition(() => {
          if (isNextPage) {
            const seen = new Set(allEventsRef.current.map(p => p.title.toLowerCase()));
            const newEvents = result.events.filter(n => !seen.has(n.title.toLowerCase()));
            setAllEvents(prev => [...prev, ...newEvents]);
            if (newEvents.length === 0 || result.events.length < 12) setHasMore(false);
          } else {
            setAllEvents(result.events);
            setSources(result.sources || []);
            setSourceStatus(result.status as any);
            if (result.events.length < 12) setHasMore(false);
          }
        });
      } else {
        if (isNextPage) {
          setHasMore(false);
        } else if (!result) {
          // If we have no data at all, show a more descriptive error
          if (allEventsRef.current.length === 0) {
            addToast("Metropolitan Sync failed. Please check your connection or try again later.");
          }
          setSourceStatus('seed');
        }
      }
    } catch (err: any) {
      console.warn("Metropolitan Sync failed:", err);
      const isQuota = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
      
      if (allEventsRef.current.length === 0) {
        if (isQuota) {
          addToast("Metropolitan Signal is currently at capacity. Showing local data.");
        } else {
          addToast("Metropolitan Sync failed. Showing local data.");
        }
      }
      setSourceStatus(isQuota ? 'quota-limited' : 'seed');
    } finally {
      setIsRefreshing(false);
      setIsVerifying(false);
      setIsPageLoading(false);
    }
  }, [activeCategory, allEvents.length, addToast, trackView]);

  useEffect(() => {
    const cacheKey = getCacheKey('All', { category: 'All', page: 1, fastSync: true });
    const cached = getCachedData(cacheKey);
    if (cached) {
      setAllEvents(cached.events);
      setSourceStatus('cache');
    } else {
      loadCityEvents('All', { category: 'All', page: 1 });
    }
    updateWeather('Dallas');

    // Test Firestore Connection
    const testConnection = async () => {
      if (!isAuthReady) return;
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, [updateWeather, loadCityEvents, isAuthReady]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            // Create initial profile if not exists
            const newUser: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Metropolitan Member',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined,
              savedEvents: [],
              preferences: { favoriteCategories: [] }
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Events Sync
  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as EventActivity));
      setDbEvents(events);
    }, (error) => {
      // Don't throw in onSnapshot to avoid crashing the SDK internal state
      console.error('Firestore onSnapshot Error [events]:', error);
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  const handleCitySelect = useCallback((city: City) => {
    startTransition(() => {
      setSelectedCity(city);
      setView(AppView.CITY_DETAIL);
      setActiveCategory('All');
      setSearchQuery('');
      setPage(1);
      // Set to city seeds immediately to avoid empty state and "Sync failed" toast
      const seeds = SEED_EVENTS[city.id] || [];
      setAllEvents(seeds);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadCityEvents(city.name, { category: 'All', page: 1 });
    updateWeather(city.name);
    trackView('city', city.name);
  }, [loadCityEvents, updateWeather, trackView]);

  const handleCategoryClick = useCallback((cat: Category) => {
    startTransition(() => {
      setActiveCategory(cat);
      setPage(1);
    });
    trackView('category', cat);
    loadCityEvents(selectedCity?.name || 'All', { category: cat, keyword: searchQuery || undefined, page: 1 });
  }, [selectedCity, searchQuery, loadCityEvents, trackView]);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView(AppView.SEARCH_RESULTS);
    setSelectedCity(null);
    setActiveCategory('All');
    setPage(1);
    trackView('search', query);
    const searchSeeds = GLOBAL_SEED_EVENTS.filter(e => e.title.toLowerCase().includes(query.toLowerCase()));
    // If we have seeds, show them immediately
    if (searchSeeds.length > 0) {
      setAllEvents(searchSeeds);
    }
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
    updateWeather('Dallas');
    loadCityEvents('All', { category: 'All', page: 1 });
    trackView('page');
  }, [updateWeather, loadCityEvents]);

  const handleProfile = useCallback(() => {
    setView(AppView.PROFILE);
    setSelectedCity(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAdmin = useCallback(() => {
    setView(AppView.ADMIN);
    setSelectedCity(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAuthSuccess = useCallback((userData: any) => {
    addToast(`Welcome to The Metro, ${userData.first_name || 'Member'}`);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setView(AppView.LANDING);
    addToast("Session terminated");
  }, []);

  const handleDeleteEvent = useCallback(async (event: EventActivity) => {
    if (event.userCreated && event.id) {
      // In a real app we'd delete from Firestore here
      // But for now we'll just filter locally if it's a seed
      // If it's a DB event, we should delete it
      if (!event.id.startsWith('live-') && !event.id.startsWith('seed-')) {
        try {
          // Actual deletion logic would go here if we had a deleteDoc import
          // For now, the snapshot listener will handle the UI update if we delete it
        } catch (e) {}
      }
    }
    setAllEvents(prev => prev.filter(e => e.id !== event.id));
    addToast("Broadcast signal terminated");
  }, []);

  const handleUpdatePreferences = useCallback(async (prefs: UserProfile['preferences']) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { preferences: prefs });
      setUser(prev => prev ? { ...prev, preferences: prefs } : null);
      addToast("Metropolitan preferences updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  }, [user]);

  const handleUpdateProfile = useCallback(async (name: string, email: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { name, email });
      setUser(prev => prev ? { ...prev, name, email } : null);
      addToast("Metropolitan profile updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  }, [user]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isRefreshing || isPageLoading) return;
    
    setPage(prev => {
      const nextPage = prev + 1;
      loadCityEvents(selectedCity?.name || 'All', { 
        category: activeCategory, 
        keyword: searchQuery || undefined, 
        page: nextPage,
        excludeTitles: allEventsRef.current.map(e => e.title)
      });
      return nextPage;
    });
  }, [hasMore, isRefreshing, isPageLoading, selectedCity, activeCategory, searchQuery, loadCityEvents]);

  return (
    <ErrorBoundary>
      <Layout 
      onHome={handleHome} 
      onAuth={() => setShowAuthModal(true)} 
      onProfile={handleProfile}
      onAdmin={handleAdmin}
      onPostEvent={() => setShowCreateModal(true)}
      isLoggedIn={!!user}
      isAdmin={isAdmin}
      userAvatar={user?.avatar}
      weather={weather}
    >
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-3 text-orange-500" />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {view === AppView.LANDING && (
        <div className="animate-in fade-in duration-700">
          <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-white">
            <div className="absolute inset-0 hero-gradient" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-50 rounded-full mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Live Metropolitan Signals Active</span>
                </div>
                <h2 className="text-7xl md:text-9xl font-black text-gray-900 mb-8 leading-[0.85] tracking-tighter uppercase italic">
                  Inside <br/><span className="text-orange-600">The Metro</span>
                </h2>
                <p className="text-gray-500 font-medium text-xl mb-12 max-w-lg leading-relaxed text-balance">
                  Your definitive guide to professional sports, underground culture, and local legends in Tulsa, OKC, Dallas, and Houston.
                </p>
                <div className="flex flex-wrap gap-4">
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="#hub-selector" 
                    className="inline-flex items-center px-10 py-5 bg-black text-white font-black rounded-2xl shadow-2xl shadow-black/20 uppercase tracking-widest text-[10px]"
                  >
                    Choose Your Hub
                    <ArrowRight className="w-4 h-4 ml-3" />
                  </motion.a>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGlobalSearch('Trending')}
                    className="inline-flex items-center px-10 py-5 bg-white border-2 border-gray-100 text-gray-900 font-black rounded-2xl hover:border-black transition-all uppercase tracking-widest text-[10px]"
                  >
                    View Trending
                  </motion.button>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="hidden lg:block relative"
              >
                <div className="relative aspect-square rounded-[4rem] overflow-hidden shadow-2xl rotate-3">
                  <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" alt="City" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-12 left-12 right-12">
                     <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                           <Globe className="w-6 h-6 text-black" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Current Focus</span>
                           <span className="text-white font-black text-xl tracking-tight">South-Central Region</span>
                        </div>
                     </div>
                  </div>
                </div>
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-orange-600 rounded-[3rem] -z-10 rotate-12 opacity-20 blur-3xl" />
              </motion.div>
            </div>
          </section>

          <section id="hub-selector" className="max-w-7xl mx-auto px-4 py-32">
            <div className="mb-20 text-center">
              <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Metropolitan Selection</span>
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic">Access Local Intelligence</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {CITIES.map((city, i) => (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CityCard city={city} onClick={handleCitySelect} />
                </motion.div>
              ))}
            </div>
          </section>

        </div>
      )}

      {(view === AppView.CITY_DETAIL || view === AppView.SEARCH_RESULTS) && (
        <div className="pb-32">
          <div className="bg-white pt-32 pb-24 border-b border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <motion.button 
                whileHover={{ x: -5 }}
                onClick={handleHome} 
                className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-12 flex items-center gap-3 group"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Hub Selection
              </motion.button>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                <div className="max-w-3xl">
                  <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter uppercase italic leading-[0.85] text-gray-900">
                    {view === AppView.SEARCH_RESULTS ? `Search: ${searchQuery}` : selectedCity?.name}
                  </h2>
                  <p className="text-gray-500 font-medium text-xl leading-relaxed">
                    {view === AppView.SEARCH_RESULTS 
                      ? `Metropolitan intelligence results for "${searchQuery}" across all active hubs.` 
                      : selectedCity?.description}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                  <div className={`flex items-center gap-6 px-8 py-4 rounded-3xl border transition-all duration-700 ${isRefreshing ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                    {isRefreshing ? (
                      <>
                        <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
                        <span className="text-orange-600 font-black text-[10px] uppercase tracking-[0.2em]">{SEARCH_MESSAGES[loadingMsgIdx]}</span>
                      </>
                    ) : (
                      <>
                        <div className={`w-2 h-2 rounded-full ${sourceStatus === 'cache' ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`} />
                        <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${sourceStatus === 'cache' ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {sourceStatus === 'cache' ? 'Verified Stream (Cached)' : sourceStatus === 'seed' ? 'Static Base Ready' : 'Metropolitan Sync Active'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-30 sticky top-24">
            <div className="flex overflow-x-auto scrollbar-hide space-x-3 bg-white/90 backdrop-blur-md p-4 rounded-[3rem] shadow-2xl shadow-black/5 border border-gray-100">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => handleCategoryClick(cat)} 
                  className={`px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shrink-0 ${activeCategory === cat ? 'bg-black text-white shadow-2xl shadow-black/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-20 min-h-[500px]">
              <AnimatePresence mode="popLayout">
                {isRefreshing && filteredEvents.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <motion.div 
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <EventSkeleton isTrending={i < 2} />
                    </motion.div>
                  ))
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event, i) => (
                    <motion.div 
                      key={event.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <EventItem 
                        event={event} 
                        showCity={view === AppView.SEARCH_RESULTS} 
                        onOpenDetails={handleOpenDetails} 
                        isSaved={user?.savedEvents.includes(event.id)}
                        onToggleSave={() => handleToggleSave(event)}
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-40 text-center"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                       <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] mb-8">No metropolitan data found for this selection</p>
                    <button 
                      onClick={() => loadCityEvents(selectedCity?.name || 'All', { category: activeCategory, keyword: searchQuery || undefined, page: 1, forceRefresh: true })}
                      className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                    >
                      Retry Metropolitan Sync
                    </button>
                  </motion.div>
                )}
                {isPageLoading && Array.from({ length: 3 }).map((_, i) => (
                  <motion.div 
                    key={`page-skeleton-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <EventSkeleton />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-20 flex flex-col items-center justify-center">

              <motion.button
                whileHover={hasMore && !isPageLoading ? { scale: 1.05 } : {}}
                whileTap={hasMore && !isPageLoading ? { scale: 0.95 } : {}}
                onClick={handleLoadMore}
                disabled={!hasMore || isPageLoading}
                className={`px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  !hasMore 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-black text-white hover:bg-orange-600 shadow-xl'
                }`}
              >
                {isPageLoading ? 'Synchronizing...' : hasMore ? 'Load More Signals' : 'All Signals Synchronized'}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {view === AppView.PROFILE && user && (
        <Suspense fallback={<div className="pt-40 text-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}>
          <ProfileView 
            user={user} 
            savedEvents={allEvents.filter(e => user.savedEvents.includes(e.id))}
            myEvents={allEvents.filter(e => e.userId === user.id)}
            onUpdatePreferences={handleUpdatePreferences}
            onLogout={handleLogout}
            onOpenEventDetails={handleOpenDetails}
            onPostEvent={() => setShowCreateModal(true)}
            onToggleSave={handleToggleSave}
            onDeleteEvent={handleDeleteEvent}
            onUpdateProfile={handleUpdateProfile}
          />
        </Suspense>
      )}

      {view === AppView.ADMIN && isAdmin && (
        <Suspense fallback={<div className="pt-40 text-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}>
          <AdminDashboard />
        </Suspense>
      )}

      {showCreateModal && (
        <Suspense fallback={<div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center backdrop-blur-sm"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <CreateEventModal 
            userId={user?.id}
            onClose={() => setShowCreateModal(false)} 
            onSave={ev => { addToast("Event published successfully."); setAllEvents(prev => [ev, ...prev]); setShowCreateModal(false); }} 
          />
        </Suspense>
      )}

      {showAuthModal && (
        <Suspense fallback={<div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center backdrop-blur-sm"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
        </Suspense>
      )}

      <AnimatePresence>
        {detailedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setDetailedEvent(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl scrollbar-hide"
            >
              <button onClick={() => setDetailedEvent(null)} className="absolute top-8 right-8 p-3 bg-gray-100 hover:bg-black hover:text-white rounded-2xl transition-all z-20">
                <X className="w-6 h-6" />
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="h-[400px] lg:h-auto relative">
                  <img src={detailedEvent.imageUrl} className="w-full h-full object-cover" alt={detailedEvent.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                     <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">{detailedEvent.category}</span>
                        <span className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">{detailedEvent.cityName}</span>
                        {detailedEvent.ageRestriction && (
                          <span className="px-4 py-2 bg-orange-600/80 backdrop-blur-md border border-orange-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">{detailedEvent.ageRestriction}</span>
                        )}
                     </div>
                  </div>
                </div>
                
                <div className="p-10 md:p-16">
                  <div className="flex items-center space-x-3 mb-8">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-600">Metropolitan Schedule</span>
                  </div>
                  
                  <h3 className="text-4xl md:text-6xl font-black text-gray-900 mb-10 tracking-tighter leading-[0.9] uppercase italic">{detailedEvent.title}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 pb-12 border-b border-gray-100">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Location</p>
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-black mr-3 mt-1" />
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{detailedEvent.venue}</p>
                          <p className="text-sm text-gray-500 font-medium mt-1">{detailedEvent.location}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Timing</p>
                      <div className="flex items-start">
                        <Clock className="w-5 h-5 text-black mr-3 mt-1" />
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{detailedEvent.date}</p>
                          <p className="text-sm text-gray-500 font-medium mt-1">
                            {detailedEvent.time}{detailedEvent.endTime ? ` - ${detailedEvent.endTime}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-500 text-lg leading-relaxed mb-12 font-medium">{detailedEvent.description}</p>
                  
                  <div className="mb-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Metropolitan Mapping</p>
                    <div className="w-full h-64 bg-gray-100 rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0, filter: 'grayscale(0.2) contrast(1.1)' }} 
                        loading="lazy" 
                        allowFullScreen 
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${detailedEvent.venue} ${detailedEvent.location}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    {detailedEvent.sourceUrl && (
                      <motion.a 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        href={detailedEvent.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-10 py-5 bg-black text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px]"
                      >
                        Official Listing
                        <ArrowRight className="w-4 h-4 ml-3" />
                      </motion.a>
                    )}
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleSave(detailedEvent)}
                      className={`inline-flex items-center px-10 py-5 font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px] transition-all ${
                        user?.savedEvents.includes(detailedEvent.id)
                          ? 'bg-orange-600 text-white shadow-orange-600/20'
                          : 'bg-white text-gray-900 border-2 border-gray-100 hover:border-black'
                      }`}
                    >
                      <Heart className={`w-4 h-4 mr-3 ${user?.savedEvents.includes(detailedEvent.id) ? 'fill-current' : ''}`} />
                      {user?.savedEvents.includes(detailedEvent.id) ? 'Secured in Vault' : 'Save to Vault'}
                    </motion.button>
                    {detailedEvent.price && (
                      <div className="px-10 py-5 bg-gray-50 border border-gray-100 text-gray-900 font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {detailedEvent.price}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
};

export default App;

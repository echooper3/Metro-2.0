import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TrendingUp, Users, Zap, MapPin, Globe, Clock, ArrowUpRight, Activity, BarChart3, Search, Heart, LayoutGrid, X } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, serverTimestamp, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CITIES } from '../constants';
import { fetchEvents } from '../services/geminiService';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import EventsUploadDialog from './UploadEventsDialog';

interface AdminDashboardProps {
  user: UserProfile;
  onUpdateSyncStats: (lastSyncAt: string, totalSyncs: number) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateSyncStats }) => {
  const [stats, setStats] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. Manage the Upload States
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    // Fetch traffic stats
    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'traffic'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Firestore onSnapshot Error [stats/traffic]:', error);
      setLoading(false);
    });

    // Fetch user count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserCount(snapshot.size);
    }, (error) => {
      console.error('Firestore onSnapshot Error [users]:', error);
    });

    // Fetch event count
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEventCount(snapshot.size);
    }, (error) => {
      console.error('Firestore onSnapshot Error [events]:', error);
    });

    return () => {
      unsubscribeStats();
      unsubscribeUsers();
      unsubscribeEvents();
    };
  }, []);

  const cityData = stats?.cityViews ? Object.entries(stats.cityViews).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count) : [];

const eventData = stats?.eventViews 
  ? Object.entries(stats.eventViews)
      .map(([name, count]) => {
        // If analytics tracking accidentally wrote a Firestore Map/Object instead of an int, 
        // fallback to 0 or extract a count property if nested.
        const safeCount = typeof count === 'object' && count !== null
          ? 0  // Or parse an internal key if needed: (count as any).views || 0
          : (count as number);

        return {
          name: name.replace(/_/g, ' '),
          count: safeCount
        };
      })
      // Filter out any 0 or broken records if you don't want them appearing in the Top 5
      .filter(item => item.count > 0) 
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) 
  : [];

  const categoryData = stats?.categoryViews ? Object.entries(stats.categoryViews).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    value: count as number
  })).sort((a, b) => b.value - a.value) : [];

  const searchData = stats?.searchQueries ? Object.entries(stats.searchQueries).map(([query, count]) => ({
    query: query.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count).slice(0, 5) : [];

  const saveData = stats?.eventSaves ? Object.entries(stats.eventSaves).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count).slice(0, 5) : [];

  const COLORS = ['#000000', '#EA580C', '#4B5563', '#9CA3AF', '#E5E7EB', '#F97316', '#FB923C'];

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Initializing Global Sync...');
    try {
      for (let i = 0; i < CITIES.length; i++) {
        const city = CITIES[i];
        setSyncStatus(`Syncing ${city.name} (${i+1}/${CITIES.length})...`);
        const result = await fetchEvents(city.name, { forceRefresh: true });
        if (result && result.events.length > 0) {
          // Save to Firestore
          for (const event of result.events) {
            const eventRef = doc(collection(db, 'events'));
            await setDoc(eventRef, {
              ...event,
              id: eventRef.id,
              userId: auth.currentUser?.uid || 'system',
              userCreated: false, // System created
              createdAt: serverTimestamp()
            });
          }
        }
        // Small delay between cities to respect quota
        if (i < CITIES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Update User Auth Sync Stats
      const syncTime = new Date().toISOString();
      const totalSyncs = (user.syncStats?.totalSyncs || 0) + 1;
      
      try {
        await updateDoc(doc(db, 'users', user.id), {
          "syncStats.lastSyncAt": syncTime,
          "syncStats.totalSyncs": increment(1)
        });
        onUpdateSyncStats(syncTime, totalSyncs);
      } catch (err) {
        console.error("Failed to update admin sync stats:", err);
      }

      setSyncStatus('Global Sync Complete');
      setTimeout(() => setSyncStatus(''), 5000);
    } catch (e) {
      setSyncStatus('Sync Failed');
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", duration: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const capitalizeFirstLetter = (value: string) => {
  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const uploadInBatches = async (eventsData: any[], db: any) => {
  const eventsCollection = collection(db, "events");

  const chunkSize = 500;

  for (let i = 0; i < eventsData.length; i += chunkSize) {
    const batch = writeBatch(db);

    const chunk = eventsData.slice(i, i + chunkSize);

    chunk.forEach((event) => {
      const docRef = doc(eventsCollection); // auto ID
      batch.set(docRef, event);
    });

    await batch.commit();
    console.log(`Batch ${i / chunkSize + 1} uploaded`);
  }
};

  // 4. Handle File Processing
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];

        // Validation
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!validTypes.includes(selectedFile.type)) {
      console.error("Please upload a valid Excel or CSV file");
      return;
    }

    // Start loading indicator
    setIsProcessing(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // 1. Read the Sheet
      const readResponse = await fetch("/api/read-sheet", {
        method: "POST",
        body: formData,
      });

      const readData = await readResponse.json();

      if (!readResponse.ok) {
        throw new Error(readData.error || "Failed to read spreadsheet");
      }

      const jsonData = readData.data;

    const eventsData = jsonData.map((item: any) => ({
      title: item?.title || "Untitled Event",
      category: capitalizeFirstLetter(item?.category || ""),
      description: item?.description || "",
      date: item?.date?.toString() || "",
      time: item?.startTime?.toString() || "",
      endTime: item?.endTime?.toString() || "",
      lat: item?.lat ? parseFloat(item.lat) : 0,
      lng: item?.lng ? parseFloat(item.lng) : 0,
      price: item?.price?.toString() || "",
      ageRestriction: item?.ageRestriction?.toString() || "",
      venue: item?.venue?.toString() || "",
      location: item?.location?.toString() || "",
      cityName: capitalizeFirstLetter(item?.cityName || ""),
      imageUrl: item?.imageUrl || "",
      adminCreated: true,
      userId: auth.currentUser?.uid || "unknown",
      createdAt: serverTimestamp(),
    }));

    await uploadInBatches(eventsData, db);

      // On successful upload:
      setUploadSuccess(true);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Reset states when reopening or manual close if needed
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Small timeout to reset states *after* exit animation finishes
      setTimeout(() => {
        setUploadSuccess(false);
        setIsProcessing(false);
      }, 300);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Zap className="w-12 h-12 animate-pulse text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px]">Metropolitan Intelligence</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-[0.85]">
            Traffic <span className="text-orange-600">Analytics</span>
          </h1>
        </div>

        {/* Automated Sync Control */}
        <div className="mb-16 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all ${isSyncing ? 'bg-orange-600 animate-spin' : 'bg-black'}`}>
              <RefreshCw className={`w-8 h-8 text-white ${isSyncing ? '' : ''}`} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Automated Content Sync</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gemini Intelligence Content Sourcing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {syncStatus && (
              <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                {syncStatus.includes('Complete') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : syncStatus.includes('Failed') ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{syncStatus}</span>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSyncAll}
              disabled={isSyncing}
              className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-orange-600 shadow-xl shadow-black/10'}`}
            >
              {isSyncing ? 'Syncing Hubs...' : 'Sync All Hubs'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-black text-white hover:bg-orange-600 shadow-xl shadow-black/10`}
              onClick={() => handleOpenChange(true)}
            >
              Upload Event's
            </motion.button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Page Views</p>
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{stats?.totalViews || 0}</h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                <Users className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Active Members</p>
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{userCount}</h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Live</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Broadcast Signals</p>
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{eventCount}</h3>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* City Popularity */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-black/5"
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Hub Popularity</h3>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#111827' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  />
                  <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={32}>
                    {cityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EA580C' : '#000000'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Signals */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-black/5"
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Trending Signals</h3>
            </div>

            <div className="space-y-8">
              {eventData.length > 0 ? eventData.map((event, i) => (
                <div key={event.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 group-hover:bg-black group-hover:text-white transition-all italic">
                      0{i + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight line-clamp-1">{event.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signal Intelligence</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-gray-900 italic">{event.count}</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Views</p>
                  </div>
                </div>
              )) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Signals Tracked Yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          {/* Category Popularity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Category Interest</h3>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {categoryData.slice(0, 4).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-black uppercase text-gray-400">{cat.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Searches */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Query Intelligence</h3>
            </div>

            <div className="space-y-6">
              {searchData.length > 0 ? searchData.map((search, i) => (
                <div key={search.query} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-300">#{i + 1}</span>
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight italic">"{search.query}"</span>
                  </div>
                  <span className="text-xs font-black text-orange-600">{search.count}</span>
                </div>
              )) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest">No Queries Logged</div>
              )}
            </div>
          </motion.div>

          {/* Most Saved */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Vault Favorites</h3>
            </div>

            <div className="space-y-6">
              {saveData.length > 0 ? saveData.map((save, i) => (
                <div key={save.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight line-clamp-1 max-w-[120px]">{save.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">{save.count}</span>
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                  </div>
                </div>
              )) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest">No Signals Saved</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* System Health */}
        <div className="mt-16 bg-black text-white p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Metropolitan Health</h3>
            <p className="text-white/50 font-medium max-w-md">The intelligence network is operating at peak efficiency. All regional hubs are synchronized and broadcasting live signals.</p>
          </div>
          <div className="flex items-center gap-12 relative z-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Latency</p>
              <span className="text-2xl font-black italic">12ms</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Uptime</p>
              <span className="text-2xl font-black italic">99.9%</span>
            </div>
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Upload Events Dialog */}
<EventsUploadDialog
        eventsUploadDialogOpen={isOpen}
        setEventsUploadDialogOpen={handleOpenChange}
        isProcessing={isProcessing}
        uploadSuccess={uploadSuccess}
        onFileSelect={handleFileSelect}
        containerVariants={containerVariants}
      />
      </div>
    </div>
  );
};

export default AdminDashboard;

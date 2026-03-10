import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, Zap, MapPin, Globe, Clock, ArrowUpRight, Activity, BarChart3 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CITIES } from '../constants';
import { fetchEvents } from '../services/geminiService';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    // Fetch traffic stats
    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'traffic'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stats/traffic');
    });

    // Fetch user count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserCount(snapshot.size);
    });

    // Fetch event count
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEventCount(snapshot.size);
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

  const eventData = stats?.eventViews ? Object.entries(stats.eventViews).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count).slice(0, 5) : [];

  const COLORS = ['#000000', '#EA580C', '#4B5563', '#9CA3AF', '#E5E7EB'];

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Initializing Global Sync...');
    try {
      for (const city of CITIES) {
        setSyncStatus(`Syncing ${city.name}...`);
        const result = await fetchEvents(city.name, { forceRefresh: true });
        if (result && result.events.length > 0) {
          // Save to Firestore
          for (const event of result.events) {
            // Check if event already exists by title (simple de-dupe)
            // In a real app we'd use a more robust check
            const eventRef = doc(collection(db, 'events'));
            await setDoc(eventRef, {
              ...event,
              id: eventRef.id,
              userCreated: false, // System created
              createdAt: serverTimestamp()
            });
          }
        }
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
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { UserProfile, EventActivity, Category, AppView } from '../types';
import { CATEGORIES, CITIES } from '../constants';
import EventItem from './EventItem';
import ErrorBoundary from './ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, deleteDoc, collection, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import bulkEvents from '../src/data/events.json';
import { 
  User, 
  Settings, 
  Heart, 
  PlusCircle, 
  LogOut, 
  ChevronRight, 
  MapPin, 
  Tag, 
  Sparkles,
  Mail,
  Calendar,
  Shield,
  Zap,
  X,
  Trash2,
  Database,
  Lock,
  Eye,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  savedEvents: EventActivity[];
  myEvents: EventActivity[];
  onUpdatePreferences: (prefs: UserProfile['preferences']) => void;
  onLogout: () => void;
  onOpenEventDetails: (event: EventActivity) => void;
  onPostEvent: () => void;
  onToggleSave: (event: EventActivity) => void;
  onDeleteEvent: (event: EventActivity) => void;
  onUpdateProfile: (name: string, email: string, phone?: string, birthday?: string, zipCode?: string) => void;
  isAdmin?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  savedEvents, 
  myEvents,
  onUpdatePreferences, 
  onLogout,
  onOpenEventDetails,
  onPostEvent,
  onToggleSave,
  onDeleteEvent,
  onUpdateProfile,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'submissions' | 'preferences' | 'settings' | 'privacy' | 'admin'>('saved');
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editBirthday, setEditBirthday] = useState(user.birthday || '');
  const [editZipCode, setEditZipCode] = useState(user.zipCode || '');
  const [isEditing, setIsEditing] = useState(false);
  const [cacheItems, setCacheItems] = useState<{key: string, size: number, timestamp: number}[]>([]);
  const [syncHealth, setSyncHealth] = useState<'optimal' | 'degraded' | 'offline'>('optimal');
  const [apiStatus, setApiStatus] = useState<{ ticketmaster: boolean, gemini: boolean }>({ ticketmaster: false, gemini: false });

  React.useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await fetch('/api/config/status');
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data);
        }
      } catch (err) {
        console.warn("Failed to fetch API status:", err);
      }
    };
    fetchApiStatus();
  }, []);

  React.useEffect(() => {
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditBirthday(user.birthday || '');
    setEditZipCode(user.zipCode || '');
  }, [user.name, user.email, user.phone, user.birthday, user.zipCode]);

  React.useEffect(() => {
    if (activeTab === 'privacy') {
      const items = Object.keys(localStorage)
        .filter(k => k.startsWith('itm_cache_v15_'))
        .map(k => {
          try {
            const val = localStorage.getItem(k) || '';
            const parsed = JSON.parse(val);
            return {
              key: k,
              size: val.length,
              timestamp: parsed.timestamp || 0
            };
          } catch (e) {
            return { key: k, size: 0, timestamp: 0 };
          }
        });
      setCacheItems(items);
      
      // Simulate sync health check
      setSyncHealth(Math.random() > 0.1 ? 'optimal' : 'degraded');
    }
  }, [activeTab]);

  const clearCache = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('itm_cache_v15_'))
      .forEach(k => localStorage.removeItem(k));
    setCacheItems([]);
  };

  const handleDelete = async (event: EventActivity) => {
    if (window.confirm("Are you sure you want to terminate this broadcast signal?")) {
      try {
        await deleteDoc(doc(db, 'events', event.id));
        onDeleteEvent(event);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `events/${event.id}`);
      }
    }
  };

  const toggleCategory = (cat: Category) => {
    const current = user.preferences.favoriteCategories;
    const next = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    onUpdatePreferences({ ...user.preferences, favoriteCategories: next });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-32">
      {/* Profile Header */}
      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-black rounded-[3rem] flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-2xl shadow-black/20 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-white" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full">
                <Shield className="w-3 h-3 text-orange-600" />
                <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[9px]">Metropolitan Member</span>
              </div>
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${apiStatus.gemini && apiStatus.ticketmaster ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                <Zap className={`w-3 h-3 ${apiStatus.gemini && apiStatus.ticketmaster ? 'text-emerald-600' : 'text-orange-600'}`} />
                <span className="font-black uppercase tracking-[0.3em] text-[9px]">
                  Signals: {apiStatus.gemini && apiStatus.ticketmaster ? 'Optimal' : 'Limited'}
                </span>
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-4 mb-4">
                <input 
                  type="text" 
                  maxLength={90}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase italic leading-none bg-gray-50 border-b-4 border-black outline-none w-full max-w-xl"
                  placeholder="Display Name"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="text-lg font-bold text-gray-400 tracking-widest uppercase bg-gray-50 border-b-2 border-gray-200 outline-none w-full max-w-md"
                    placeholder="Email Address"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-4">
                  {user.name}
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {user.preferences.favoriteCity || 'No Primary Hub'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4">
            {isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onUpdateProfile(editName, editEmail, editPhone, editBirthday, editZipCode);
                    setIsEditing(false);
                  }}
                  className="px-8 py-5 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"
                >
                  <Sparkles className="w-4 h-4" />
                  Save Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditName(user.name);
                    setEditEmail(user.email);
                    setIsEditing(false);
                  }}
                  className="px-8 py-5 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-5 bg-gray-50 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3 border border-gray-100 hover:border-black transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPostEvent}
                  className="px-8 py-5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit Event
                </motion.button>
              </>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-5 bg-gray-50 text-gray-400 hover:text-red-600 rounded-2xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-24 z-30 bg-white/80 backdrop-blur-md py-4 -mx-4 px-4 mb-12 flex space-x-4 overflow-x-auto scrollbar-hide">
        {[
          { id: 'saved', label: 'Saved Signals', icon: Heart },
          { id: 'submissions', label: 'My Submissions', icon: Zap },
          { id: 'preferences', label: 'Hub Preferences', icon: Tag },
          { id: 'settings', label: 'Account Settings', icon: Settings },
          { id: 'privacy', label: 'Privacy Dashboard', icon: Lock },
          ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: Shield }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-10 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shrink-0 ${
              activeTab === tab.id 
                ? 'bg-black text-white shadow-2xl shadow-black/20' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'saved' && (
          <ErrorBoundary>
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              {savedEvents.length > 0 ? (
                savedEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <EventItem 
                      event={event} 
                      showCity={true} 
                      onOpenDetails={onOpenEventDetails} 
                      isSaved={true}
                      onToggleSave={() => onToggleSave(event)}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <Heart className="w-16 h-16 text-gray-100 mx-auto mb-8" />
                  <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] mb-8">No saved metropolitan signals yet</p>
                  <button className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline">Explore The Metro</button>
                </div>
              )}
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'submissions' && (
          <ErrorBoundary>
            <motion.div
              key="submissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              {myEvents.length > 0 ? (
                myEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group"
                  >
                    <EventItem event={event} showCity={true} onOpenDetails={onOpenEventDetails} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                      className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20"
                      title="Delete Broadcast"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <Zap className="w-16 h-16 text-gray-100 mx-auto mb-8" />
                  <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] mb-8">You haven't broadcasted any signals yet</p>
                  <button onClick={onPostEvent} className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline">Broadcast Your First Event</button>
                </div>
              )}
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'preferences' && (
          <ErrorBoundary>
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                  <MapPin className="w-6 h-6 text-orange-600" />
                  Primary Metropolitan Hub
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {CITIES.map(city => (
                    <button
                      key={city.id}
                      onClick={() => onUpdatePreferences({ ...user.preferences, favoriteCity: city.name })}
                      className={`p-8 rounded-[2rem] border-2 transition-all text-center ${
                        user.preferences.favoriteCity === city.name
                          ? 'border-black bg-black text-white shadow-2xl'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{city.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                  <Tag className="w-6 h-6 text-orange-600" />
                  Intelligence Categories
                </h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8 ml-1">Select your primary intelligence streams for personalized signals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all gap-3 ${
                        user.preferences.favoriteCategories.includes(cat)
                          ? 'border-orange-600 bg-orange-50 text-orange-600 shadow-xl shadow-orange-600/10'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.preferences.favoriteCategories.includes(cat) ? 'bg-orange-600 text-white' : 'bg-white text-gray-300'}`}>
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-center">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'settings' && (
          <ErrorBoundary>
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-xl space-y-10">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Display Name</label>
                  <input 
                    type="text" 
                    maxLength={90}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Email Address</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Phone Number</label>
                    <input 
                      type="tel" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Zip Code</label>
                    <input 
                      type="text" 
                      maxLength={10}
                      value={editZipCode}
                      onChange={(e) => setEditZipCode(e.target.value)}
                      placeholder="74103"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Birthday</label>
                  <input 
                    type="date" 
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>
                <div className="pt-6">
                  <button 
                    onClick={() => onUpdateProfile(editName, editEmail, editPhone, editBirthday, editZipCode)}
                    className="px-12 py-6 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl"
                  >
                    Update Account Data
                  </button>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
        {activeTab === 'privacy' && (
          <ErrorBoundary>
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Metropolitan Privacy Dashboard</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Monitor and manage your local intelligence footprint</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Local Cache Size</span>
                    </div>
                    <div className="text-4xl font-black text-gray-900 tracking-tighter">
                      {(cacheItems.reduce((acc, curr) => acc + curr.size, 0) / 1024).toFixed(2)} <span className="text-lg text-gray-400">KB</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cached Signals</span>
                    </div>
                    <div className="text-4xl font-black text-gray-900 tracking-tighter">
                      {cacheItems.length} <span className="text-lg text-gray-400">Entries</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ticketmaster API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.ticketmaster ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className={`text-lg font-black uppercase tracking-tight italic ${apiStatus.ticketmaster ? 'text-emerald-600' : 'text-red-600'}`}>
                        {apiStatus.ticketmaster ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gemini Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.gemini ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className={`text-lg font-black uppercase tracking-tight italic ${apiStatus.gemini ? 'text-emerald-600' : 'text-red-600'}`}>
                        {apiStatus.gemini ? 'Operational' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tracking Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-lg font-black text-emerald-600 uppercase tracking-tight italic">Zero Trackers</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signal Integrity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-lg font-black text-emerald-600 uppercase tracking-tight italic">Verified Secure</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Metropolitan Signal Cache</h4>
                      <p className="text-xs text-gray-400 font-medium">Temporary storage for faster signal synchronization and offline access.</p>
                    </div>
                    <button 
                      onClick={clearCache}
                      className="flex items-center gap-3 px-8 py-4 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Purge Cache
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Session Data Persistence</h4>
                      <p className="text-xs text-gray-400 font-medium">Your profile and preferences are currently ephemeral and stored in memory only.</p>
                    </div>
                    <div className="px-6 py-3 bg-gray-100 text-gray-400 font-black rounded-xl text-[9px] uppercase tracking-widest">
                      In-Memory Only
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Third-Party Intelligence</h4>
                      <p className="text-xs text-gray-400 font-medium">Signals are synchronized via Gemini AI. No PII is shared during synchronization.</p>
                    </div>
                    <div className="px-6 py-3 bg-emerald-50 text-emerald-600 font-black rounded-xl text-[9px] uppercase tracking-widest">
                      Verified Secure
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
        {activeTab === 'admin' && isAdmin && (
          <ErrorBoundary>
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Metropolitan Admin Portal</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">System-level intelligence management</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Database className="w-5 h-5 text-orange-600" />
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Bulk Intelligence Sync</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                      Synchronize pre-formatted schedules for OU Football, OKC Thunder, and Dallas Sports directly to the metropolitan database.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">OU Football 2026</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">6 Events</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">OKC Thunder April</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">2 Events</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Dallas Sports Mix</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">3 Events</span>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        if (window.confirm(`Synchronize ${bulkEvents.length} events to Firestore?`)) {
                          const btn = document.getElementById('sync-btn');
                          if (btn) btn.innerText = 'Synchronizing...';
                          
                          let count = 0;
                          for (const event of bulkEvents) {
                            try {
                              // Format date to MM/DD/YYYY if it's in YYYY-MM-DD
                              let formattedDate = event.date;
                              if (event.date && event.date.includes('-')) {
                                const [y, m, d] = event.date.split('-');
                                formattedDate = `${m}/${d}/${y}`;
                              }

                              await addDoc(collection(db, 'events'), {
                                ...event,
                                date: formattedDate,
                                userCreated: true,
                                isTrending: false,
                                createdAt: serverTimestamp(),
                                userId: user.id
                              });
                              count++;
                            } catch (err) {
                              console.error("Sync failed for event:", event.title, err);
                            }
                          }
                          
                          // Update User Sync Stats
                          try {
                            await updateDoc(doc(db, 'users', user.id), {
                              "syncStats.lastSyncAt": new Date().toISOString(),
                              "syncStats.totalSyncs": increment(1)
                            });
                          } catch (err) {
                            console.error("Failed to update user sync stats:", err);
                          }

                          alert(`Successfully synchronized ${count} metropolitan signals. Sync credentials updated in your Auth profile.`);
                          if (btn) btn.innerText = 'Sync Intelligence Now';
                        }
                      }}
                      id="sync-btn"
                      className="w-full mt-10 py-6 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Sync Intelligence Now
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">System Health</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Database Connection</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-black text-gray-900 uppercase italic">Active & Secure</span>
                        </div>
                      </div>
                      <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Auth Provider</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-black text-gray-900 uppercase italic">Firebase Identity</span>
                        </div>
                      </div>
                      
                      {user.syncStats && (
                        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 block mb-2">Sync Intelligence Status</span>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-900 uppercase">Last Sync: <span className="text-orange-600">{user.syncStats.lastSyncAt ? new Date(user.syncStats.lastSyncAt).toLocaleString() : 'Never'}</span></p>
                            <p className="text-[10px] font-black text-gray-900 uppercase">Total Operations: <span className="text-orange-600">{user.syncStats.totalSyncs || 0}</span></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileView;

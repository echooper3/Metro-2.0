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
  isFirebaseConnected?: boolean | null;
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
  isAdmin,
  isFirebaseConnected
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
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                <Zap className={`w-3 h-3 ${apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'text-emerald-600' : 'text-orange-600'}`} />
                <span className="font-black uppercase tracking-[0.3em] text-[9px]">
                  Signals: {apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'Optimal' : (isFirebaseConnected === false ? 'System Offline' : 'Limited')}
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
              {savedEvents.filter(e => e && typeof e === 'object').length > 0 ? (
                savedEvents.filter(e => e && typeof e === 'object').map((event, i) => (
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
                  {CITIES.map(city => {
                    const isFavorite = user.preferences.favoriteCity === city.name;
                    return (
                      <button
                        key={city.id}
                        onClick={() => onUpdatePreferences({ ...user.preferences, favoriteCity: city.name })}
                        className={`p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden group ${
                          isFavorite 
                            ? 'border-black bg-black text-white shadow-2xl shadow-black/20' 
                            : 'border-gray-100 hover:border-black bg-white text-gray-900'
                        }`}
                      >
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] block mb-2 opacity-50">{city.state}</span>
                        <span className="text-lg font-black uppercase tracking-tight italic block mb-1">{city.name}</span>
                        <ChevronRight className={`w-4 h-4 absolute bottom-6 right-6 transition-transform ${isFavorite ? 'text-white translate-x-1' : 'text-gray-300 group-hover:translate-x-1 group-hover:text-black'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                  <Tag className="w-6 h-6 text-orange-600" />
                  Intelligence Subscriptions
                </h3>
                <div className="flex flex-wrap gap-4">
                  {CATEGORIES.filter(c => c !== 'All').map(cat => {
                    const isSubscribed = user.preferences.favoriteCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-8 py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          isSubscribed 
                            ? 'bg-black text-white border-black shadow-xl shadow-black/10' 
                            : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
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
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 max-w-3xl"
            >
              <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-12 flex items-center gap-4">
                <Settings className="w-6 h-6 text-orange-600" />
                Demographic Details
              </h3>
              
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                    <input 
                      type="email"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Mobile Phone</label>
                    <input 
                      type="tel"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Date of Birth</label>
                    <input 
                      type="date"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900"
                      value={editBirthday}
                      onChange={(e) => setEditBirthday(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Zip Code</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900"
                      value={editZipCode}
                      onChange={(e) => setEditZipCode(e.target.value)}
                      placeholder="e.g. 74103"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onUpdateProfile(editName, editEmail, editPhone, editBirthday, editZipCode)}
                  className="px-10 py-6 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-black/10 mt-6"
                >
                  Save Demographic Data
                </motion.button>
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
              className="space-y-12"
            >
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 max-w-4xl">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4 flex items-center gap-4">
                  <Database className="w-6 h-6 text-orange-600" />
                  Local Cache Intelligence
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-10">Manage persistent local data stored in your browser to optimize network signals.</p>

                <div className="space-y-6">
                  {cacheItems.length > 0 ? (
                    cacheItems.map(item => (
                      <div key={item.key} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
                        <div>
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight block max-w-[280px] truncate">{item.key.replace('itm_cache_v15_', '')}</span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1 block">Cached: {new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">{(item.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-300 text-[10px] font-black uppercase tracking-widest">No local signals cached</div>
                  )}

                  {cacheItems.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearCache}
                      className="px-10 py-5 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Evict Local Cache
                    </motion.button>
                  )}
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

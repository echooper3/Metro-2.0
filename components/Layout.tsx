import React, { useState } from 'react';
import { WeatherData } from '../types';
import { Plus, User, MapPin, Sun, Cloud, CloudRain, CloudLightning, Snowflake, Menu, X, ArrowRight, Globe, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  onHome: () => void;
  onAuth: () => void;
  onProfile: () => void;
  onPostEvent: () => void;
  isLoggedIn?: boolean;
  userAvatar?: string;
  weather?: WeatherData | null;
}

const WeatherWidget: React.FC<{ weather: WeatherData }> = ({ weather }) => {
  const getIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return <Sun className="w-4 h-4 text-orange-500" />;
    if (c.includes('cloud')) return <Cloud className="w-4 h-4 text-gray-400" />;
    if (c.includes('rain')) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (c.includes('storm')) return <CloudLightning className="w-4 h-4 text-yellow-500" />;
    if (c.includes('snow')) return <Snowflake className="w-4 h-4 text-blue-200" />;
    return <Cloud className="w-4 h-4 text-gray-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden lg:flex items-center space-x-4 px-6 py-2 bg-gray-50 border border-gray-100 rounded-2xl"
    >
      <div className="flex items-center justify-center bg-white p-2 rounded-xl shadow-sm">{getIcon(weather.condition)}</div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">
          {weather.cityName}
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-black text-gray-900">{Math.round(weather.temp)}°{weather.unit}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{weather.condition}</span>
        </div>
      </div>
    </motion.div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, onHome, onAuth, onProfile, onPostEvent, isLoggedIn, userAvatar, weather }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between gap-8">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onHome(); }}
            className="flex items-center space-x-4 cursor-pointer group shrink-0"
          >
            <div className="w-12 h-12 bg-black rounded-[1.25rem] flex items-center justify-center transform group-hover:rotate-6 transition-transform shadow-xl shadow-black/10">
              <span className="text-white font-black text-2xl italic">M</span>
            </div>
            <div className="flex flex-col leading-none">
              <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase italic">
                Inside <span className="text-orange-600">The Metro</span>
              </h1>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">Regional Intelligence</span>
            </div>
          </motion.div>

            <div className="flex-grow" />

          <div className="flex items-center space-x-4 shrink-0">
            {weather && <WeatherWidget weather={weather} />}
            
            <div className="hidden md:flex items-center space-x-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPostEvent}
                className="flex items-center px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-900 bg-white border-2 border-gray-100 rounded-2xl hover:border-black transition-all"
              >
                <Plus className="w-4 h-4 mr-2 stroke-[3px]" />
                Post Signal
              </motion.button>
              
              {isLoggedIn ? (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onProfile}
                  className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center overflow-hidden shadow-xl shadow-black/10 hover:bg-orange-600 transition-all"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </motion.button>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAuth}
                  className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white bg-black rounded-2xl hover:bg-orange-600 shadow-2xl shadow-black/10 transition-all"
                >
                  Join Metro
                </motion.button>
              )}
            </div>

            <button 
              className="md:hidden p-3 bg-gray-50 rounded-2xl text-gray-900"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={onPostEvent} className="py-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest">Post Signal</button>
                  {isLoggedIn ? (
                    <button onClick={onProfile} className="py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">My Profile</button>
                  ) : (
                    <button onClick={onAuth} className="py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Join Metro</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-black text-white py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
            <div className="md:col-span-6">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-12 h-12 bg-white rounded-[1.25rem] flex items-center justify-center rotate-6">
                  <span className="text-black font-black text-2xl italic">M</span>
                </div>
                <h2 className="text-white font-black text-4xl tracking-tighter uppercase italic">Inside <span className="text-orange-600">The Metro</span></h2>
              </div>
              <p className="max-w-md leading-relaxed text-white/50 font-medium text-lg mb-12">
                The definitive guide to the metropolitan heartbeat. Sourcing professional sports, underground culture, and local legends across the South-Central region.
              </p>
              <div className="flex items-center space-x-6">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Network Status</span>
                    <div className="flex items-center space-x-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-xs font-black uppercase tracking-widest">All Hubs Online</span>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="text-white font-black mb-10 uppercase tracking-[0.4em] text-[10px]">Active Hubs</h3>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                  <MapPin className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Tulsa, OK
                </li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                  <MapPin className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Oklahoma City, OK
                </li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                  <MapPin className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Dallas, TX
                </li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                  <MapPin className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Houston, TX
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h3 className="text-white font-black mb-10 uppercase tracking-[0.4em] text-[10px]">Intelligence</h3>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                   <Zap className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Live Signals
                </li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                   <Globe className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Regional Map
                </li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors flex items-center group">
                   <User className="w-4 h-4 mr-3 group-hover:text-orange-500" /> Member Portal
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-32 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
              © {new Date().getFullYear()} The Metro Intelligence Network.
            </div>
            <div className="flex space-x-12 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Protocol</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">API Access</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

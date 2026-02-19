
import React, { useState } from 'react';
import { WeatherData } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onHome: () => void;
  onAuth: () => void;
  onSearch: (query: string) => void;
  onPostEvent: () => void;
  isLoggedIn?: boolean;
  weather?: WeatherData | null;
}

const WeatherWidget: React.FC<{ weather: WeatherData }> = ({ weather }) => {
  const getIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return '☀️';
    if (c.includes('cloud')) return '☁️';
    if (c.includes('rain')) return '🌧️';
    if (c.includes('storm')) return '⛈️';
    if (c.includes('snow')) return '❄️';
    return '⛅';
  };

  return (
    <div className="hidden md:flex items-center space-x-3 px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-2xl animate-in fade-in zoom-in duration-500">
      <div className="text-xl leading-none">{getIcon(weather.condition)}</div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 leading-none mb-0.5">
          {weather.cityName}
        </span>
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-black text-gray-900">{Math.round(weather.temp)}°{weather.unit}</span>
          <span className="text-[10px] font-bold text-gray-400 truncate max-w-[60px]">{weather.condition}</span>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, onHome, onAuth, onSearch, onPostEvent, isLoggedIn, weather }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div 
            onClick={() => { setSearchQuery(''); onHome(); }}
            className="flex items-center space-x-2 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="hidden lg:block text-xl font-black tracking-tight text-gray-900">
              Inside <span className="text-orange-600">The Metro</span>
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-grow max-w-md relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find events..."
              className="w-full bg-gray-100 border-2 border-transparent rounded-full py-2 px-10 text-sm focus:ring-0 focus:border-orange-500 focus:bg-white transition-all outline-none"
            />
            <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {weather && <WeatherWidget weather={weather} />}
            
            <button 
              onClick={onPostEvent}
              className="hidden sm:flex items-center px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50 rounded-full transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
              Post
            </button>
            <button 
              onClick={onAuth}
              className="px-5 py-2 text-sm font-bold text-white bg-orange-600 rounded-full hover:bg-orange-700 shadow-md shadow-orange-200 transition-all"
            >
              Join
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-gray-950 text-gray-400 py-16 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">M</span>
                </div>
                <h2 className="text-white font-black text-xl tracking-tight">Inside <span className="text-orange-600">The Metro</span></h2>
              </div>
              <p className="max-w-md leading-relaxed text-sm">
                Discover the heartbeat of your city. Sourcing professional sports, underground music, local arts, and family festivals across Oklahoma and Texas.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-[10px]">Metro Hubs</h3>
              <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Tulsa, OK</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Oklahoma City, OK</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Dallas, TX</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Houston, TX</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-900 mt-16 pt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
            © {new Date().getFullYear()} Inside The Metro. Powered by GenAI.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

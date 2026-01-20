
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onHome: () => void;
  onAuth: () => void;
  onSearch: (query: string) => void;
  isLoggedIn?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onHome, onAuth, onSearch, isLoggedIn }) => {
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
            <h1 className="hidden sm:block text-xl font-black tracking-tight text-gray-900">
              Inside <span className="text-orange-600">The Metro</span>
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-grow max-w-xl relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, cities, categories..."
              className="w-full bg-gray-100 border-2 border-transparent rounded-full py-2 px-10 text-sm focus:ring-0 focus:border-orange-500 focus:bg-white transition-all outline-none"
            />
            <svg className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-gray-400 hover:text-orange-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
          
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <button 
              onClick={onAuth}
              className="hidden sm:block px-4 py-2 text-sm font-bold text-gray-600 hover:text-orange-600 transition-colors"
            >
              Log in
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
              <p className="max-w-md leading-relaxed">
                Discover the heartbeat of your city. Sourcing professional sports, underground music, local arts, and family festivals across Oklahoma and Texas.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Metro Hubs</h3>
              <ul className="space-y-3 font-medium">
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Tulsa, OK</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Oklahoma City, OK</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Dallas, TX</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Houston, TX</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Company</h3>
              <ul className="space-y-3 font-medium">
                <li className="hover:text-orange-500 cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Privacy</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Terms</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Support</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-900 mt-16 pt-8 text-center text-xs font-bold uppercase tracking-widest text-gray-600">
            © {new Date().getFullYear()} Inside The Metro. Powered by GenAI Intelligence.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

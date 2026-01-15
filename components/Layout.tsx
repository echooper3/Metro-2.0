
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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div 
            onClick={() => { setSearchQuery(''); onHome(); }}
            className="flex items-center space-x-2 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="hidden sm:block text-xl font-bold tracking-tight text-gray-900">
              Inside <span className="text-orange-600">The Metro</span>
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-grow max-w-xl relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events across all metros..."
              className="w-full bg-gray-100 border-none rounded-full py-2 px-10 text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
          
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <button 
              onClick={onAuth}
              className="hidden sm:block px-4 py-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={onAuth}
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-full hover:bg-orange-700 shadow-sm transition-all"
            >
              Sign up
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h2 className="text-white font-bold text-lg mb-4">Inside The Metro</h2>
              <p className="max-w-md">
                Your premier source for cultural, social, and entertainment activities across the major metropolitan areas of Oklahoma and Texas.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Cities</h3>
              <ul className="space-y-2">
                <li>Tulsa</li>
                <li>Oklahoma City</li>
                <li>Dallas</li>
                <li>Houston</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>About Us</li>
                <li>Privacy Policy</li>
                <li>Help Center</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            © {new Date().getFullYear()} Inside The Metro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

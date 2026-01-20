
import React from 'react';
import { EventActivity } from '../types';

interface EventItemProps {
  event: EventActivity;
  showCity?: boolean;
  isSaved?: boolean;
  onToggleSave?: (event: EventActivity) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, showCity, isSaved, onToggleSave }) => {
  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('sport')) return 'bg-blue-100 text-blue-700';
    if (c.includes('entertainment') || c.includes('concert')) return 'bg-purple-100 text-purple-700';
    if (c.includes('art') || c.includes('culture')) return 'bg-pink-100 text-pink-700';
    if (c.includes('family') || c.includes('child')) return 'bg-green-100 text-green-700';
    if (c.includes('food') || c.includes('drink')) return 'bg-orange-100 text-orange-700';
    if (c.includes('night') || c.includes('life')) return 'bg-indigo-100 text-indigo-700';
    if (c.includes('outdoor')) return 'bg-emerald-100 text-emerald-700';
    if (c.includes('trending')) return 'bg-rose-100 text-rose-700';
    if (c.includes('visitor')) return 'bg-cyan-100 text-cyan-700';
    return 'bg-gray-100 text-gray-700';
  };

  const shareEvent = (platform: 'twitter' | 'facebook' | 'email') => {
    const url = event.sourceUrl || window.location.href;
    const text = `Check out this event: ${event.title} in ${event.cityName || 'the metro'}!`;
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(text + '\n\nSource: ' + url)}`;
    }
  };

  return (
    <div className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {/* Save Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleSave?.(event); }}
        className={`absolute top-4 right-4 p-2.5 rounded-full transition-all z-10 ${
          isSaved ? 'text-orange-600 bg-orange-50' : 'text-gray-300 hover:text-orange-500 hover:bg-gray-50'
        }`}
        title={isSaved ? "Remove from favorites" : "Save to favorites"}
      >
        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4 pr-10">
        <div className="flex flex-wrap gap-2">
          <span 
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryColor(event.category)}`}
            title={`Category: ${event.category}`}
          >
            {event.category}
          </span>
          {showCity && event.cityName && (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white">
              {event.cityName}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-2">
          {event.date && (
            <span className="text-xs font-bold text-gray-400">{event.date}</span>
          )}
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight group-hover:text-orange-600 transition-colors">
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
          {event.description}
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex items-center text-xs font-bold text-gray-500 mb-5 pt-4 border-t border-gray-50">
          <svg className="w-4 h-4 mr-2 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{event.location}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => shareEvent('twitter')}
              className="p-1.5 text-gray-400 hover:text-[#1DA1F2] transition-colors"
              title="Share on X"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareEvent('facebook')}
              className="p-1.5 text-gray-400 hover:text-[#1877F2] transition-colors"
              title="Share on Facebook"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareEvent('email')}
              className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors"
              title="Share via Email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <a 
            href={event.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.cityName || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black hover:bg-orange-600 hover:text-white transition-all flex items-center shrink-0"
          >
            Details
            <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default EventItem;

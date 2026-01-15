
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
    <div className="group bg-white p-6 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {/* Save Button */}
      <button 
        onClick={() => onToggleSave?.(event)}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all ${
          isSaved ? 'text-orange-600 bg-orange-50' : 'text-gray-300 hover:text-orange-400 hover:bg-gray-50'
        }`}
        title={isSaved ? "Unsave event" : "Save event"}
      >
        <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4 pr-10">
        <div className="flex flex-wrap gap-2">
          <span 
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(event.category)}`}
            title={event.category}
          >
            {event.category}
          </span>
          {showCity && event.cityName && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-white">
              {event.cityName}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-2">
          {event.date && (
            <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">{event.date}</span>
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-orange-600 transition-colors">
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-6 line-clamp-3">
          {event.description}
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex items-center text-xs font-medium text-gray-500 mb-4 pt-4 border-t border-gray-50">
          <svg className="w-4 h-4 mr-1.5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{event.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => shareEvent('twitter')}
              className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
              title="Share on Twitter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareEvent('facebook')}
              className="p-1.5 text-gray-400 hover:text-blue-700 transition-colors"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <a 
            href={event.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.cityName || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline flex items-center"
          >
            View Details
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default EventItem;

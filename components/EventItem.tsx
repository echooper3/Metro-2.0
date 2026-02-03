
import React, { memo, useState } from 'react';
import { EventActivity } from '../types';

interface EventItemProps {
  event: EventActivity;
  showCity?: boolean;
  isSaved?: boolean;
  onToggleSave?: (event: EventActivity) => void;
  onOpenDetails: (event: EventActivity) => void;
}

const EventItem: React.FC<EventItemProps> = memo(({ event, showCity, isSaved, onToggleSave, onOpenDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('sport')) return 'bg-blue-100 text-blue-700';
    if (c.includes('entertainment')) return 'bg-purple-100 text-purple-700';
    if (c.includes('art')) return 'bg-pink-100 text-pink-700';
    if (c.includes('family')) return 'bg-green-100 text-green-700';
    if (c.includes('food')) return 'bg-orange-100 text-orange-700';
    if (c.includes('night')) return 'bg-indigo-100 text-indigo-700';
    if (c.includes('outdoor')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatFriendlyDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
      let m, d, y;
      if (parts[0].length === 4) { [y, m, d] = parts.map(Number); }
      else { [m, d, y] = parts.map(Number); }
      const eventDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = eventDate.getTime() === today.getTime();
      const datePrefix = isToday ? 'Today' : eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return timeStr ? `${datePrefix} @ ${timeStr}` : datePrefix;
    } catch (e) { return dateStr; }
  };

  const shouldTruncate = event.description.length > 130;
  const descriptionText = !isExpanded && shouldTruncate ? event.description.slice(0, 130) + '...' : event.description;

  return (
    <article className="group bg-white rounded-3xl border border-gray-100 hover:border-orange-300 hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-hidden relative">
      <div className="relative h-52 w-full overflow-hidden bg-gray-100">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        <img 
          src={event.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800`} 
          alt={event.title} 
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
          loading="lazy" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSave?.(event); }} 
          className={`absolute top-4 right-4 p-2.5 rounded-full transition-all backdrop-blur-md ${isSaved ? 'text-orange-600 bg-white shadow-xl' : 'text-white bg-black/20 hover:bg-white hover:text-orange-600'}`}
        >
          <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="p-7 flex flex-col flex-grow">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-3 min-h-[3rem] line-clamp-2">
          {event.title}
        </h3>
        
        <div className="mb-6">
          <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">
            {descriptionText}
          </p>
          {shouldTruncate && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`mt-4 w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
                isExpanded 
                ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200' 
                : 'bg-orange-50 text-orange-700 border-transparent hover:border-orange-400 hover:bg-orange-100'
              }`}
            >
              {isExpanded ? 'Hide Details' : 'Read Full Info'}
              <svg className={`w-3.5 h-3.5 ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3">
          <div className="flex items-start text-xs font-bold text-gray-700">
            <svg className="w-4 h-4 mr-3 text-orange-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-gray-900 font-black leading-tight" title={event.venue || event.location}>
                {event.venue || 'Event Venue'}
              </span>
              {(event.location && event.location !== event.venue) && (
                <span className="truncate text-gray-400 font-medium mt-0.5" title={event.location}>
                  {event.location} {showCity && <span className="ml-1">({event.cityName})</span>}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-gray-700">
            <svg className="w-4 h-4 mr-3 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatFriendlyDate(event.date, event.time)}
          </div>
        </div>

        <button 
          onClick={() => onOpenDetails(event)}
          className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-gray-100 active:scale-95"
        >
          View Event Page
        </button>
      </div>
    </article>
  );
});

export default EventItem;

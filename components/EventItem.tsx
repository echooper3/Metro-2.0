
import React, { memo } from 'react';
import { EventActivity } from '../types';

interface EventItemProps {
  event: EventActivity;
  showCity?: boolean;
  isSaved?: boolean;
  onToggleSave?: (event: EventActivity) => void;
  onOpenDetails: (event: EventActivity) => void;
}

const EventItem: React.FC<EventItemProps> = memo(({ event, showCity, isSaved, onToggleSave, onOpenDetails }) => {
  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('sport')) return 'bg-blue-100 text-blue-700';
    if (c.includes('entertainment') || c.includes('concert')) return 'bg-purple-100 text-purple-700';
    if (c.includes('art') || c.includes('culture')) return 'bg-pink-100 text-pink-700';
    if (c.includes('family') || c.includes('child')) return 'bg-green-100 text-green-700';
    if (c.includes('food') || c.includes('drink')) return 'bg-orange-100 text-orange-700';
    if (c.includes('night') || c.includes('life')) return 'bg-indigo-100 text-indigo-700';
    if (c.includes('outdoor')) return 'bg-emerald-100 text-emerald-700';
    if (c.includes('visitor') || c.includes('attraction')) return 'bg-cyan-100 text-cyan-700';
    if (c.includes('community')) return 'bg-teal-100 text-teal-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatFriendlyDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return null;

    try {
      const [m, d, y] = dateStr.split('/').map(Number);
      const eventDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let datePrefix = '';
      if (eventDate.getTime() === today.getTime()) {
        datePrefix = 'Today';
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        datePrefix = 'Tomorrow';
      } else {
        datePrefix = eventDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }

      if (timeStr) {
        const separator = (datePrefix === 'Today' || datePrefix === 'Tomorrow') ? ' at ' : ', ';
        return `${datePrefix}${separator}${timeStr}`;
      } else {
        return `${datePrefix} • All day`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const handleDetailsClick = () => {
    onOpenDetails(event);
  };

  return (
    <article 
      className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative"
      aria-labelledby={`event-title-${event.id}`}
    >
      {/* Trending Badge */}
      {event.isTrending && (
        <div className="absolute -top-3 left-6 z-20">
          <span className="bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg shadow-orange-200/50 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1014 0c0-1.187-.266-2.315-.74-3.32a1.109 1.109 0 00-1.51-.494 3.507 3.507 0 01-4.355 5.018 1 1 0 00-.515-1.936 5.507 5.507 0 004.25-6.196c-.034-.15-.067-.298-.1-.444-.148-.638-.337-1.263-.564-1.848a9.964 9.964 0 00-.57-1.23z" clipRule="evenodd" />
            </svg>
            Popular
          </span>
        </div>
      )}

      {/* Favorite Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleSave?.(event); }}
        className={`absolute top-4 right-4 p-2.5 rounded-full transition-all z-10 ${
          isSaved ? 'text-orange-600 bg-orange-50 shadow-sm' : 'text-gray-300 hover:text-orange-500 hover:bg-gray-50'
        }`}
        aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
        title={isSaved ? "Remove from favorites" : "Save to favorites"}
      >
        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4 pr-10">
        <div className="flex flex-wrap gap-2">
          <span 
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-help transition-colors ${getCategoryColor(event.category)}`}
            title={`Category: ${event.category}`}
            aria-label={`Event Category: ${event.category}`}
          >
            {event.category}
          </span>
          {showCity && event.cityName && (
            <span 
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white cursor-help"
              title={`Location: ${event.cityName}`}
              aria-label={`City: ${event.cityName}`}
            >
              {event.cityName}
            </span>
          )}
          {event.ageRestriction && (
             <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
               {event.ageRestriction}
             </span>
          )}
          {event.distance !== undefined && (
            <span 
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white"
            >
              {event.distance.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-grow">
        <div className="flex items-center gap-2 mb-2">
          {event.date && (
            <time className="text-xs font-black text-gray-400 flex items-center uppercase tracking-wider">
              <svg className="w-3.5 h-3.5 mr-1.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatFriendlyDate(event.date, event.time)}
            </time>
          )}
        </div>
        <h3 
          id={`event-title-${event.id}`}
          className="text-xl font-black text-gray-900 mb-3 leading-tight group-hover:text-orange-600 transition-colors"
        >
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
          {event.description}
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex items-center text-xs font-bold text-gray-500 mb-5 pt-4 border-t border-gray-50">
          <svg className="w-4 h-4 mr-2 text-orange-500 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate" title={`Venue: ${event.venue || event.location}`}>
            {event.venue || event.location}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-label="Quick Actions">
            <a 
              href={event.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.cityName || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
              aria-label={`Go directly to official site for ${event.title}`}
              title="Official Link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <button 
            onClick={handleDetailsClick}
            className="px-5 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-black hover:bg-orange-600 hover:text-white transition-all flex items-center shrink-0 shadow-sm"
            aria-haspopup="dialog"
            aria-label={`View full details for ${event.title}`}
          >
            Details
            <svg className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
});

export default EventItem;

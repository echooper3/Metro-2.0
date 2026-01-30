
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

  const getPriceDisplay = () => {
    if (event.isFree) return { text: 'Free', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (event.price) return { text: event.price, className: 'bg-orange-50 text-orange-700 border-orange-100' };
    if (event.priceLevel) return { text: event.priceLevel, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return null;
  };

  const priceInfo = getPriceDisplay();
  const shouldTruncate = event.description.length > 150;
  const descriptionText = !isExpanded && shouldTruncate 
    ? event.description.slice(0, 150) + '...' 
    : event.description;

  const handleDetailsClick = () => {
    onOpenDetails(event);
  };

  const displayImageUrl = event.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800`;

  return (
    <article 
      className="group bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-2xl transition-all duration-300 flex flex-col h-full overflow-hidden relative"
      aria-labelledby={`event-title-${event.id}`}
    >
      {/* 1. Image Section (Top) with Lazy Loading */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
            </svg>
          </div>
        )}
        <img 
          src={displayImageUrl} 
          alt={event.title} 
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
          {event.isTrending && (
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1014 0c0-1.187-.266-2.315-.74-3.32a1.109 1.109 0 00-1.51-.494 3.507 3.507 0 01-4.355 5.018 1 1 0 00-.515-1.936 5.507 5.507 0 004.25-6.196c-.034-.15-.067-.298-.1-.444-.148-.638-.337-1.263-.564-1.848a9.964 9.964 0 00-.57-1.23z" clipRule="evenodd" />
              </svg>
              Popular
            </span>
          )}
          <span 
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-lg backdrop-blur-md ${getCategoryColor(event.category)}`}
          >
            {event.category}
          </span>
        </div>

        {/* Favorite Button Overlay */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSave?.(event); }}
          className={`absolute top-4 right-4 p-2.5 rounded-full transition-all z-10 backdrop-blur-md ${
            isSaved ? 'text-orange-600 bg-white shadow-xl' : 'text-white bg-black/20 hover:bg-white hover:text-orange-600'
          }`}
          aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
        >
          <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* 2. Title Section */}
      <div className="p-6 pb-2">
        <h3 
          id={`event-title-${event.id}`}
          className="text-xl font-black text-gray-900 leading-tight group-hover:text-orange-600 transition-colors mb-2 line-clamp-2 min-h-[3rem]"
        >
          {event.title}
        </h3>

        {/* 3. Description Section */}
        <div className="relative">
          <p className="text-gray-500 text-sm leading-relaxed">
            {descriptionText}
          </p>
          {shouldTruncate && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] hover:underline mt-2 transition-all"
            >
              {isExpanded ? 'Read Less' : 'Read More'}
            </button>
          )}
        </div>
      </div>

      {/* 4. Details Section (Bottom) */}
      <div className="mt-auto p-6 pt-2">
        <div className="space-y-3.5 border-t border-gray-100 pt-5 mb-6">
          <div className="flex items-start text-xs font-bold text-gray-700">
            <svg className="w-4 h-4 mr-3 text-orange-500 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate" title={event.venue || event.location}>
              {event.venue || event.location}
              {showCity && event.cityName && <span className="text-gray-400 font-medium ml-1">({event.cityName})</span>}
            </span>
          </div>

          <div className="flex items-center text-xs font-bold text-gray-700">
            <svg className="w-4 h-4 mr-3 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatFriendlyDate(event.date, event.time)}
          </div>

          {priceInfo && (
            <div className="flex items-center text-xs font-bold text-gray-700">
              <svg className="w-4 h-4 mr-3 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider border ${priceInfo.className}`}>
                {priceInfo.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={handleDetailsClick}
            className="flex-1 py-3.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center shadow-lg shadow-orange-100 active:scale-95"
            aria-haspopup="dialog"
          >
            Details
            <svg className="w-3.5 h-3.5 ml-2" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
});

export default EventItem;

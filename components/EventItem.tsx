import React, { useState } from 'react';
import { EventActivity } from '../types';
import { Calendar, MapPin, Clock, ExternalLink, TrendingUp, DollarSign, Users, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface EventItemProps {
  event: EventActivity;
  showCity?: boolean;
  onOpenDetails: (event: EventActivity) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, showCity, onOpenDetails }) => {
  const getCategoryColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('sports')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (c.includes('family')) return 'bg-purple-50 text-purple-600 border-purple-100';
    if (c.includes('entertainment')) return 'bg-pink-50 text-pink-600 border-pink-100';
    if (c.includes('food')) return 'bg-orange-50 text-orange-600 border-orange-100';
    if (c.includes('night')) return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    if (c.includes('arts')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (c.includes('outdoor')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const formatFriendlyDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return null;
    try {
      let cleanDate = dateStr;
      if (cleanDate.includes('T')) cleanDate = cleanDate.split('T')[0];
      
      const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/');
      let m, d, y;
      
      if (parts.length === 3) {
        if (parts[0].length === 4) { [y, m, d] = parts.map(Number); }
        else { [m, d, y] = parts.map(Number); }
        
        const eventDate = new Date(y, m - 1, d);
        if (isNaN(eventDate.getTime())) return dateStr;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = eventDate.getTime() === today.getTime();
        const datePrefix = isToday ? 'Today' : eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return timeStr ? `${datePrefix} @ ${timeStr}` : datePrefix;
      }
      return dateStr;
    } catch (e) { return dateStr; }
  };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200 transition-all duration-500 cursor-pointer flex flex-col h-full"
      onClick={() => onOpenDetails(event)}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
          <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
          {event.isTrending && (
            <span className="px-4 py-2 bg-black text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center shadow-lg">
              <TrendingUp className="w-3 h-3 mr-2" />
              Trending
            </span>
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Venue</span>
              <span className="text-white font-black text-sm tracking-tight">{event.venue}</span>
           </div>
           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
              <ChevronRight className="w-5 h-5 text-black" />
           </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-4 h-4 text-orange-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
            {formatFriendlyDate(event.date, event.time)}
          </span>
        </div>

        <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter leading-tight group-hover:text-orange-600 transition-colors">
          {event.title}
        </h3>

        <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3 font-medium">
          {event.description}
        </p>

        <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <MapPin className="w-4 h-4 mr-2 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
              {showCity ? event.cityName : event.location}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {event.price && (
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-xl">
                {event.price}
              </span>
            )}
            {event.isFree && (
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl">
                Free
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EventItem;

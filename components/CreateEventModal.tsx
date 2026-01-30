
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, CITIES } from '../constants';
import { EventActivity, Category } from '../types';
import { searchPlaces } from '../services/geminiService';

interface CreateEventModalProps {
  onClose: () => void;
  onSave: (event: EventActivity) => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<EventActivity>>({
    title: '',
    category: 'Community',
    description: '',
    location: '',
    venue: '',
    date: new Date().toISOString().split('T')[0], // Use YYYY-MM-DD for input[type=date]
    time: '19:00', // Default start time
    endTime: '22:00', // Default end time
    sourceUrl: '',
    ageRestriction: 'All Ages',
    cityName: 'Tulsa'
  });

  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasUserModifiedAddress, setHasUserModifiedAddress] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (addressInput.length < 3 || !hasUserModifiedAddress) {
      setSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(addressInput);
      setSuggestions(results);
      setIsSearching(false);
      setShowSuggestions(results.length > 0);
    }, 800);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [addressInput, hasUserModifiedAddress]);

  const handleSelectSuggestion = (s: typeof suggestions[0]) => {
    setFormData(prev => ({
      ...prev,
      venue: s.name,
      location: s.address,
      lat: s.lat,
      lng: s.lng
    }));
    setAddressInput(s.name);
    setHasUserModifiedAddress(false);
    setShowSuggestions(false);
  };

  const handleAddressChange = (val: string) => {
    setAddressInput(val);
    setHasUserModifiedAddress(true);
    // If user starts typing again, we clear the previous specific location data 
    // to ensure they either select a new one or fill it manually.
    if (val !== formData.venue) {
        setFormData(prev => ({ ...prev, venue: val, location: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || (!formData.location && !addressInput)) return;

    // If they didn't select a suggestion, use the raw input as the location
    const finalLocation = formData.location || addressInput;
    
    // Format date back to MM/DD/YYYY for internal consistency if needed
    let formattedDate = formData.date;
    if (formData.date && formData.date.includes('-')) {
        const [y, m, d] = formData.date.split('-');
        formattedDate = `${m}/${d}/${y}`;
    }

    const newEvent: EventActivity = {
      ...formData as EventActivity,
      date: formattedDate,
      location: finalLocation,
      id: `user-${Date.now()}`,
      userCreated: true,
      isTrending: false
    };

    onSave(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white rounded-[2rem] w-full max-w-xl p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <header className="mb-8">
          <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Community Portal</span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Post an Event</h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Share the heartbeat of the metro.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g., Underground Jazz Night"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
              <select 
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as Category})}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Primary City</label>
              <select 
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                value={formData.cityName}
                onChange={e => setFormData({...formData, cityName: e.target.value})}
              >
                {CITIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Venue or Address</label>
            <div className="relative">
              <input 
                required
                type="text" 
                placeholder="Search venue or street address..."
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all pr-12"
                value={addressInput}
                onChange={e => handleAddressChange(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-5 py-4 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="text-xs font-black text-gray-900">{s.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium truncate">{s.address}</div>
                  </button>
                ))}
              </div>
            )}
            
            {formData.location ? (
               <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl flex items-center border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified: {formData.venue} — {formData.location}
               </div>
            ) : addressInput && hasUserModifiedAddress && (
                <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl flex items-center border border-amber-100">
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Custom Location Entered
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Start Time</label>
              <input 
                type="time" 
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">End Time</label>
              <input 
                type="time" 
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                value={formData.endTime}
                onChange={e => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Website URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com/tickets"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
              value={formData.sourceUrl}
              onChange={e => setFormData({...formData, sourceUrl: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
            <textarea 
              rows={3}
              placeholder="What's happening? Be specific and exciting."
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-medium focus:bg-white focus:border-orange-500 outline-none transition-all resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest text-xs mt-4 active:scale-95"
          >
            Post Event to {formData.cityName}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;


import React, { useState, useEffect, useRef, useTransition } from 'react';
import { CATEGORIES, CITIES } from '../constants';
import { EventActivity, Category } from '../types';
import { searchPlaces } from '../services/geminiService';
import { fetchAddressSuggestions, LocationSuggestion, getCurrentPosition, reverseGeocode } from '../services/locationService';

interface CreateEventModalProps {
  onClose: () => void;
  onSave: (event: EventActivity) => void;
}

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<EventActivity>>({
    title: '', category: 'Community', description: '', location: '', venue: '',
    date: new Date().toISOString().split('T')[0], time: '19:00', cityName: 'Tulsa'
  });

  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const searchTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addressInput.length < 3) {
      setSuggestions([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        // We use a hybrid approach: Call Nominatim for address accuracy
        // But we could also call Gemini if we wanted venue-specific intelligence.
        // Nominatim is better for "Place Autocomplete" as requested.
        const results = await fetchAddressSuggestions(addressInput);
        startTransition(() => {
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        });
      } catch (e) {
        console.error("Location search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [addressInput]);

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    setFormData(prev => ({ 
      ...prev, 
      venue: s.name, 
      location: s.address, 
      lat: s.lat, 
      lng: s.lng 
    }));
    setAddressInput(s.address);
    setShowSuggestions(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (address) {
        setAddressInput(address);
        setFormData(prev => ({
          ...prev,
          location: address,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }));
      }
    } catch (e) {
      console.error("Geolocation failed:", e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImagePreview(compressed);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !addressInput || isCompressing) return;
    setIsSubmitting(true);
    
    const [y, m, d] = (formData.date || '').split('-');
    const finalEvent: EventActivity = {
        ...formData as EventActivity,
        id: `user-${Date.now()}`,
        date: formData.date ? `${m}/${d}/${y}` : '',
        location: formData.location || addressInput,
        venue: formData.venue || addressInput,
        userCreated: true,
        isTrending: false,
        imageUrl: imagePreview || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800`
    };

    onSave(finalEvent);
    onClose();
  };

  const getSuggestionIcon = (type: LocationSuggestion['type']) => {
    switch (type) {
      case 'venue': return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
      case 'city': return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2.945M8 3.935A9 9 0 1120.065 11H18a2 2 0 00-2 2v1a2 2 0 01-2 2 2 2 0 01-2-2v-2.945" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] w-full max-w-xl p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <header className="mb-8">
          <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Community Portal</span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Post an Event</h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cover Image</label>
            <div 
              onClick={() => !imagePreview && !isCompressing && fileInputRef.current?.click()}
              className={`relative h-44 w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50/30'}`}
            >
              {isCompressing ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Optimizing...</p>
                </div>
              ) : imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); }} className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                  </div>
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Add Event Photo</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Title</label>
            <input required type="text" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Give your event a name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
              <select className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all cursor-pointer" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">City</label>
              <select className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all cursor-pointer" value={formData.cityName} onChange={e => setFormData({...formData, cityName: e.target.value})}>
                {CITIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between ml-1 mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Address Autocomplete</label>
              <button 
                type="button" 
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-600 hover:text-orange-700 flex items-center transition-colors disabled:opacity-50"
              >
                {isLocating ? (
                  <span className="flex items-center"><div className="w-2 h-2 border border-orange-600 border-t-transparent rounded-full animate-spin mr-1.5"></div> Locating...</span>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Use Current
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input required type="text" placeholder="Start typing address or venue..." className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all pr-12" value={addressInput} onChange={e => setAddressInput(e.target.value)} onFocus={() => setShowSuggestions(suggestions.length > 0)} />
              {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                {suggestions.map((s, idx) => (
                  <button key={idx} type="button" onClick={() => handleSelectSuggestion(s)} className="w-full text-left px-5 py-4 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-3 group">
                    <div className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      {getSuggestionIcon(s.type)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-gray-900 group-hover:text-orange-600 transition-colors truncate">{s.name}</div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">{s.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date</label>
              <input required type="date" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Time</label>
              <input type="time" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || isCompressing} className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest text-xs mt-4 active:scale-95 disabled:opacity-50">
            {isSubmitting ? 'Finalizing...' : 'Upload Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;

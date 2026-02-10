
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { CATEGORIES, CITIES } from '../constants';
import { EventActivity, Category } from '../types';
import { searchPlaces } from '../services/geminiService';

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
  const [suggestions, setSuggestions] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
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
        const results = await searchPlaces(addressInput);
        // Performance: Use transition for suggestion state to prevent input lag
        startTransition(() => {
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        });
      } catch (e) {
        console.error("Venue search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Slightly longer debounce for better batching
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [addressInput]);

  const handleSelectSuggestion = (s: typeof suggestions[0]) => {
    setFormData(prev => ({ ...prev, venue: s.name, location: s.address, lat: s.lat, lng: s.lng }));
    setAddressInput(s.name);
    setShowSuggestions(false);
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
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Venue Search (Gemini Powered)</label>
            <div className="relative">
              <input required type="text" placeholder="Start typing venue name..." className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all pr-12" value={addressInput} onChange={e => setAddressInput(e.target.value)} onFocus={() => setShowSuggestions(suggestions.length > 0)} />
              {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {suggestions.map((s, idx) => (
                  <button key={idx} type="button" onClick={() => handleSelectSuggestion(s)} className="w-full text-left px-5 py-4 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0">
                    <div className="text-xs font-black text-gray-900">{s.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium truncate">{s.address}</div>
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

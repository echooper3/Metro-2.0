
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
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    cityName: 'Tulsa',
    organizerName: '',
    organizerUrl: '',
    organizerContact: ''
  });

  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addressInput.length < 2) {
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
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [addressInput]);

  const handleSelectSuggestion = (s: typeof suggestions[0]) => {
    setFormData(prev => ({ ...prev, venue: s.name, location: s.address, lat: s.lat, lng: s.lng }));
    setAddressInput(s.name);
    setShowSuggestions(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !addressInput) return;

    setIsSubmitting(true);
    
    setTimeout(() => {
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
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] w-full max-w-xl p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors z-10"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <header className="mb-8">
          <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Community Portal</span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Post an Event</h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Cover Image</label>
            <div 
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className={`relative h-44 w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50/30'}`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                  </div>
                  <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Click to upload photo</p>
                  <p className="text-[10px] text-gray-400 mt-1">Recommended: 1200x800px</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
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
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Primary City</label>
              <select className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all cursor-pointer" value={formData.cityName} onChange={e => setFormData({...formData, cityName: e.target.value})}>
                {CITIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Venue or Address</label>
            <div className="relative">
              <input required type="text" placeholder="Search venue or enter address..." className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all pr-12" value={addressInput} onChange={e => setAddressInput(e.target.value)} onFocus={() => setShowSuggestions(suggestions.length > 0)} />
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

          <div className="space-y-6 pt-4 border-t border-gray-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Host Information (Optional)</h4>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Organizer Name</label>
              <input type="text" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" value={formData.organizerName} onChange={e => setFormData({...formData, organizerName: e.target.value})} placeholder="e.g. Tulsa Symphony" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Host Website</label>
              <input type="url" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" value={formData.organizerUrl} onChange={e => setFormData({...formData, organizerUrl: e.target.value})} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
            <textarea rows={3} placeholder="Tell people why they should come..." className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-medium focus:bg-white focus:border-orange-500 outline-none transition-all resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest text-xs mt-4 active:scale-95 disabled:opacity-50">
            {isSubmitting ? 'Syncing...' : `Upload Event to ${formData.cityName}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;

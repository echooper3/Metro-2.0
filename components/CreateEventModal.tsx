import React, { useState, useEffect, useRef, useTransition } from 'react';
import { CATEGORIES, CITIES } from '../constants';
import { EventActivity, Category } from '../types';
import { searchPlaces } from '../services/geminiService';
import { fetchAddressSuggestions, LocationSuggestion, getCurrentPosition, reverseGeocode } from '../services/locationService';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, MapPin, Calendar, Clock, Sparkles, ArrowRight, Zap, Target } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateEventModalProps {
  onClose: () => void;
  onSave: (event: EventActivity) => void;
  userId?: string;
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

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSave, userId }) => {
  const [formData, setFormData] = useState<Partial<EventActivity>>({
    title: '', category: 'Community', description: '', location: '', venue: '',
    date: new Date().toISOString().split('T')[0], time: '19:00', endTime: '21:00', cityName: 'Tulsa',
    price: '', ageRestriction: ''
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
    const finalEvent: any = {
        ...formData,
        userId,
        date: formData.date ? `${m}/${d}/${y}` : '',
        location: formData.location || addressInput,
        venue: formData.venue || addressInput,
        userCreated: true,
        isTrending: false,
        imageUrl: imagePreview || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800`,
        createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'events'), finalEvent);
      onSave({ ...finalEvent, id: docRef.id });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSuggestionIcon = (type: LocationSuggestion['type']) => {
    switch (type) {
      case 'venue': return <Target className="w-4 h-4 text-orange-500" />;
      case 'city': return <MapPin className="w-4 h-4 text-black" />;
      default: return <MapPin className="w-4 h-4 text-gray-400" />;
    }
  };

  const inputClasses = "w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all placeholder:text-gray-300";
  const labelClasses = "text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white rounded-[3rem] w-full max-w-2xl p-10 md:p-16 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <button onClick={onClose} className="absolute top-10 right-10 p-3 bg-gray-100 hover:bg-black hover:text-white rounded-2xl transition-all z-10">
          <X className="w-6 h-6" />
        </button>
        
        <header className="mb-12">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-50 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-orange-600" />
            <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[9px]">Metropolitan Community Portal</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic">Post an Event</h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className={labelClasses}>Cover Image</label>
            <div 
              onClick={() => !imagePreview && !isCompressing && fileInputRef.current?.click()}
              className={`relative h-60 w-full rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
            >
              {isCompressing ? (
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Optimizing Metropolitan Signal...</p>
                </div>
              ) : imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); }} className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-red-600 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 text-black rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 rotate-3 group-hover:rotate-0 transition-transform">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Add High-Res Event Photo</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">JPG, PNG up to 10MB</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClasses}>Event Title</label>
            <input required type="text" className={inputClasses} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Give your event a bold name" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClasses}>Category</label>
              <select className={inputClasses} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelClasses}>City Hub</label>
              <select className={inputClasses} value={formData.cityName} onChange={e => setFormData({...formData, cityName: e.target.value})}>
                {CITIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between ml-1 mb-2">
              <label className={labelClasses}>Venue & Address</label>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 hover:text-orange-700 flex items-center transition-colors disabled:opacity-50"
              >
                {isLocating ? (
                  <span className="flex items-center"><div className="w-2 h-2 border border-orange-600 border-t-transparent rounded-full animate-spin mr-2"></div> Locating...</span>
                ) : (
                  <>
                    <Target className="w-3 h-3 mr-2" />
                    Use Current Position
                  </>
                )}
              </motion.button>
            </div>
            <div className="relative">
              <input required type="text" placeholder="Start typing address or venue..." className={`${inputClasses} pr-14`} value={addressInput} onChange={e => setAddressInput(e.target.value)} onFocus={() => setShowSuggestions(suggestions.length > 0)} />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
            
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-50 top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  {suggestions.map((s, idx) => (
                    <button key={idx} type="button" onClick={() => handleSelectSuggestion(s)} className="w-full text-left px-6 py-5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-4 group">
                      <div className="mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        {getSuggestionIcon(s.type)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-gray-900 group-hover:text-orange-600 transition-colors truncate uppercase tracking-tight">{s.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold truncate uppercase tracking-widest mt-1">{s.address}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClasses}>Date</label>
              <div className="relative">
                <input required type="date" className={inputClasses} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClasses}>Start Time</label>
              <div className="relative">
                <input type="time" className={inputClasses} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClasses}>End Time</label>
              <div className="relative">
                <input type="time" className={inputClasses} value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClasses}>Price / Entry Fee</label>
              <input type="text" className={inputClasses} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. $20, Free, Donation" />
            </div>
            <div className="space-y-2">
              <label className={labelClasses}>Age Restriction</label>
              <input type="text" className={inputClasses} value={formData.ageRestriction} onChange={e => setFormData({...formData, ageRestriction: e.target.value})} placeholder="e.g. 21+, All Ages" />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClasses}>Description</label>
            <textarea 
              className={`${inputClasses} h-32 resize-none py-6`} 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Tell the metro what to expect..."
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={isSubmitting || isCompressing} 
            className="w-full py-6 bg-black text-white font-black rounded-[2rem] hover:bg-orange-600 transition-all shadow-2xl shadow-black/10 uppercase tracking-widest text-[11px] mt-8 active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Broadcast Event
                <Zap className="w-4 h-4 ml-3" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateEventModal;

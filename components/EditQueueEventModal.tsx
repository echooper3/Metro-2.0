import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, Clock, MapPin, Building, DollarSign, Image as ImageIcon, 
  Trash2, Save, Upload, ExternalLink, AlertCircle, CheckCircle2, Loader2, PlusCircle 
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { EventActivity } from '../types';
import { CITIES } from '../constants';
import { doEventsMeetDuplicateConditions } from '../utils/duplicateEventProtocol';

const VALID_CATEGORIES = [
  'Sports', 
  'Family Activities', 
  'Entertainment', 
  'Visitor Attractions', 
  'Food & Drink', 
  'Arts & Culture', 
  'Outdoors', 
  'Community',
  'Undefined'
];

interface EditQueueEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventActivity | null;
  userId?: string;
  onSaveSuccess?: () => void;
  onDeleteSuccess?: (deletedId: string) => void;
  allEvents?: EventActivity[];
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

const EditQueueEventModal: React.FC<EditQueueEventModalProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  onSaveSuccess,
  onDeleteSuccess,
  allEvents
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Undefined',
    cityName: '',
    date: '',
    time: '',
    endTime: '',
    venue: '',
    location: '',
    description: '',
    imageUrl: '',
    price: '',
    isFree: false,
    sourceUrl: ''
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (event) {
      const rawCity = (event.cityName || '').trim();
      const isUnknownCity = !rawCity || rawCity.toLowerCase() === 'unknown';
      const cleanCityName = isUnknownCity ? '' : rawCity;

      setFormData({
        title: event.title || '',
        category: event.category || 'Undefined',
        cityName: cleanCityName,
        date: event.date || '',
        time: event.time || '',
        endTime: event.endTime || '',
        venue: event.venue || '',
        location: event.location || '',
        description: event.description || '',
        imageUrl: event.imageUrl || '',
        price: event.price || '',
        isFree: event.isFree || false,
        sourceUrl: event.sourceUrl || ''
      });
    } else {
      setFormData({
        title: '',
        category: 'Undefined',
        cityName: '',
        date: new Date().toISOString().split('T')[0],
        time: '7:00 PM',
        endTime: '10:00 PM',
        venue: '',
        location: '',
        description: '',
        imageUrl: '',
        price: '',
        isFree: false,
        sourceUrl: ''
      });
    }
    setConfirmDelete(false);
    setErrorMessage('');
  }, [event, isOpen]);

  const duplicateConflict = React.useMemo(() => {
    if (!allEvents || !formData.title?.trim()) return null;
    const currentEvent: EventActivity = {
      id: event?.id || 'temp',
      title: formData.title,
      date: formData.date,
      cityName: formData.cityName,
      venue: formData.venue,
      location: formData.location,
      price: formData.price,
      category: 'Entertainment',
      description: ''
    };

    return allEvents.find(e => {
      if (event && e.id === event.id) return false;
      return doEventsMeetDuplicateConditions(currentEvent, e);
    });
  }, [allEvents, formData.title, formData.date, formData.cityName, formData.venue, formData.location, formData.price, event]);

  if (!isOpen) return null;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setFormData(prev => ({ ...prev, imageUrl: compressed }));
        } catch (err) {
          console.error("Failed to compress image:", err);
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage("Event title is required.");
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      if (event) {
        const finalCityName = formData.cityName.trim().toLowerCase() === 'unknown' ? '' : formData.cityName.trim();
        const eventRef = doc(db, 'events', event.id);
        await setDoc(eventRef, {
          title: formData.title.trim(),
          category: formData.category,
          cityName: finalCityName,
          date: formData.date.trim(),
          time: formData.time.trim(),
          endTime: formData.endTime.trim(),
          venue: formData.venue.trim(),
          location: formData.location.trim(),
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          price: formData.isFree ? 'Free' : formData.price.trim(),
          isFree: formData.isFree,
          sourceUrl: formData.sourceUrl.trim(),
          userId: event.userId || userId || 'admin',
          userCreated: event.userCreated ?? false,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        const finalCityName = formData.cityName.trim().toLowerCase() === 'unknown' ? '' : formData.cityName.trim();
        const newEventRef = doc(collection(db, 'events'));
        await setDoc(newEventRef, {
          id: newEventRef.id,
          title: formData.title.trim(),
          category: formData.category,
          cityName: finalCityName,
          date: formData.date.trim(),
          time: formData.time.trim(),
          endTime: formData.endTime.trim(),
          venue: formData.venue.trim() || formData.title.trim(),
          location: formData.location.trim() || finalCityName,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          price: formData.isFree ? 'Free' : formData.price.trim(),
          isFree: formData.isFree,
          sourceUrl: formData.sourceUrl.trim(),
          userId: userId || 'admin',
          userCreated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      onSaveSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to save event:", err);
      setErrorMessage(err.message || "Failed to save event. Please verify permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setErrorMessage('');

    try {
      await deleteDoc(doc(db, 'events', event.id));
      onDeleteSuccess?.(event.id);
      onClose();
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      setErrorMessage(err.message || "Failed to delete event.");
      setDeleting(false);
    }
  };

  const inputClasses = "w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-400";
  const labelClasses = "text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={() => !saving && !deleting && onClose()}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 my-auto z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-100 bg-white sticky top-0 z-20">
            <div>
              <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase bg-orange-50 px-3 py-1 rounded-full inline-block mb-1.5">
                Admin Categorization Queue
              </span>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                {event ? 'Edit Event Signal' : 'Add Event to Queue'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-left">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {duplicateConflict && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black uppercase tracking-wide block">Protocol Notice: Duplicate Event Detected</span>
                  <span className="text-[11px] text-amber-800 block mt-1 leading-relaxed">
                    An event titled <strong>"{duplicateConflict.title}"</strong> is already recorded in {duplicateConflict.cityName || 'database'} ({duplicateConflict.date || 'Date TBD'}). Saving this may create a duplicate entry.
                  </span>
                </div>
              </div>
            )}

            {/* Event Title */}
            <div>
              <label className={labelClasses}>Event Title *</label>
              <input
                type="text"
                required
                className={inputClasses}
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Tulsa Symphony Orchestra Gala"
              />
            </div>

            {/* Category & City Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Assigned Category</label>
                <select
                  className={inputClasses}
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {VALID_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'Undefined' ? '⚠️ Undefined (Keep in Queue)' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClasses}>City Name</label>
                  {(!formData.cityName || formData.cityName.toLowerCase() === 'unknown') ? (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ⚠️ City Unknown (Please fill)
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      Editable Field
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    list="city-options-list"
                    className={inputClasses}
                    value={formData.cityName}
                    onChange={e => setFormData({ ...formData, cityName: e.target.value })}
                    placeholder="Leave blank or enter city name (e.g. Tulsa, Dallas...)"
                  />
                  <datalist id="city-options-list">
                    {CITIES.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  <MapPin className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
                {/* Quick Select Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Quick Select:</span>
                  {CITIES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, cityName: c.name })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        formData.cityName?.toLowerCase() === c.name.toLowerCase()
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-black'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {formData.cityName && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cityName: '' })}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-400 hover:text-red-600 border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                      title="Clear field to leave blank"
                    >
                      Clear (Blank)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClasses}>Date (e.g. YYYY-MM-DD or MM/DD/YYYY)</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    placeholder="2026-09-15"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Start Time</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    placeholder="7:00 PM"
                  />
                  <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelClasses}>End Time</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="10:00 PM"
                  />
                  <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Venue & Physical Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Venue Name</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.venue}
                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g. Cain's Ballroom"
                  />
                  <Building className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Physical Address / Location</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. 423 N Main St, Tulsa, OK"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClasses}>Description</label>
              <textarea
                rows={3}
                className={`${inputClasses} resize-none`}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about the event, artist, venue, or admission notes..."
              />
            </div>

            {/* Price & Admission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className={labelClasses}>Price / Admission</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={formData.isFree}
                    className={`${inputClasses} disabled:bg-gray-100 disabled:text-gray-400`}
                    value={formData.isFree ? 'Free' : formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. $25 - $45"
                  />
                  <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="pt-5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={e => setFormData({ ...formData, isFree: e.target.checked })}
                    className="w-4 h-4 accent-black rounded"
                  />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Admission is Free
                  </span>
                </label>
              </div>
            </div>

            {/* Image Preview & URL / Upload */}
            <div>
              <label className={labelClasses}>Event Image</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {formData.imageUrl ? (
                  <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    <img
                      src={formData.imageUrl}
                      alt="Event Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-md transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[8px] font-bold uppercase">No Image</span>
                  </div>
                )}

                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="text"
                    className={inputClasses}
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="Paste image URL (https://...)"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                    <button
                      type="button"
                      disabled={isCompressing}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isCompressing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Compressing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Upload & Compress
                        </>
                      )}
                    </button>
                    <span className="text-[9px] text-gray-400 font-bold">Auto-optimized for mobile performance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source URL */}
            <div>
              <label className={labelClasses}>Source / Ticket Website URL</label>
              <div className="relative">
                <input
                  type="url"
                  className={inputClasses}
                  value={formData.sourceUrl}
                  onChange={e => setFormData({ ...formData, sourceUrl: e.target.value })}
                  placeholder="https://..."
                />
                <ExternalLink className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Delete Area (Only for existing events) */}
              <div>
                {event ? (
                  confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
                        Permanently delete?
                      </span>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDelete}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-2.5 border-2 border-red-100 hover:border-red-600 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Event
                    </button>
                  )
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    New Queue Entry
                  </span>
                )}
              </div>

              {/* Save / Close */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="flex-1 sm:flex-none px-8 py-3 bg-black hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {event ? <Save className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                      {event
                        ? (formData.category !== 'Undefined' ? 'Save & Categorize' : 'Save Changes')
                        : (formData.category === 'Undefined' ? '+ Add to Queue' : '+ Create & Publish')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditQueueEventModal;

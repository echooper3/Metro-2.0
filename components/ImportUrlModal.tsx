import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Globe, Sparkles, Loader2, Calendar, Clock, MapPin, Building, 
  DollarSign, Image as ImageIcon, ArrowRight, CheckCircle2, AlertCircle, Edit3, PlusCircle, ExternalLink
} from 'lucide-react';
import { EventActivity } from '../types';
import { ScrapedEventDraft } from '../services/webScraperService';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventExtracted: (draft: ScrapedEventDraft) => void;
  onDirectSaveToQueue?: (draft: ScrapedEventDraft) => Promise<void>;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  onEventExtracted,
  onDirectSaveToQueue
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedEvent, setExtractedEvent] = useState<ScrapedEventDraft | null>(null);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setError('Please paste a website URL.');
      return;
    }

    let urlToFetch = urlInput.trim();
    if (!urlToFetch.startsWith('http://') && !urlToFetch.startsWith('https://')) {
      urlToFetch = `https://${urlToFetch}`;
    }

    setLoading(true);
    setError(null);
    setExtractedEvent(null);
    setSavedSuccess(false);

    try {
      const response = await fetch('/api/scrape/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch })
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned a non-JSON response. Please ensure your server is updated and running.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to extract event from website.');
      }

      setExtractedEvent(data.event);
    } catch (err: any) {
      console.error('URL extraction error:', err);
      setError(err.message || 'Could not parse event from this URL. Please verify the link.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = () => {
    if (!extractedEvent) return;
    onEventExtracted(extractedEvent);
    handleClose();
  };

  const handleDirectSave = async () => {
    if (!extractedEvent || !onDirectSaveToQueue) return;
    setIsSavingDirect(true);
    try {
      await onDirectSaveToQueue(extractedEvent);
      setSavedSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to save event to database.');
    } finally {
      setIsSavingDirect(false);
    }
  };

  const handleClose = () => {
    setUrlInput('');
    setError(null);
    setExtractedEvent(null);
    setSavedSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">
                Import Event from Website URL
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Paste any link (Eventbrite, Facebook, venue site, festival page) to auto-extract details
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* URL Input Form */}
          <form onSubmit={handleExtract} className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600">
              Target Event Webpage URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="url"
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.eventbrite.com/e/my-event-12345 or venue calendar link..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !urlInput.trim()}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-orange-600/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract Details
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs font-bold animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                <p className="text-[10px] text-red-600 mt-1 font-medium">
                  Tip: Make sure the URL points to a specific event page or calendar listing.
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p>Event successfully imported and saved to the Admin Queue!</p>
            </div>
          )}

          {/* Extraction Preview Card */}
          {extractedEvent && (
            <div className="border border-gray-200 rounded-3xl p-5 bg-gradient-to-br from-gray-50 to-white space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Successfully Extracted
                </span>

                <a 
                  href={extractedEvent.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                >
                  View Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Title & Category */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {extractedEvent.category || 'Entertainment'}
                  </span>
                  {extractedEvent.cityName ? (
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                      🏙️ {extractedEvent.cityName}
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                      ⚠️ City Left Blank (Please fill)
                    </span>
                  )}
                  {extractedEvent.isFree && (
                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Free Admission
                    </span>
                  )}
                </div>

                <h4 className="text-base font-black text-gray-900 tracking-tight">
                  {extractedEvent.title}
                </h4>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-600 bg-white p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="font-bold text-gray-900">{extractedEvent.date || 'Date TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>{extractedEvent.time ? `${extractedEvent.time} ${extractedEvent.endTime ? `- ${extractedEvent.endTime}` : ''}` : 'Time TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="truncate">{extractedEvent.venue || 'No venue name found'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>{extractedEvent.price || (extractedEvent.isFree ? 'Free' : 'Price unlisted')}</span>
                </div>
                {extractedEvent.location && (
                  <div className="col-span-full flex items-center gap-2 text-gray-500 truncate">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{extractedEvent.location}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {extractedEvent.description && (
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  {extractedEvent.description}
                </p>
              )}

              {/* Image Preview if available */}
              {extractedEvent.imageUrl && (
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                  <img
                    src={extractedEvent.imageUrl}
                    alt={extractedEvent.title}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenEditor}
                  className="w-full sm:w-auto px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Edit3 className="w-4 h-4 text-orange-400" />
                  Open in Editor & Confirm
                </button>

                {onDirectSaveToQueue && (
                  <button
                    type="button"
                    onClick={handleDirectSave}
                    disabled={isSavingDirect}
                    className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSavingDirect ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving to Queue...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        Save Directly to Queue
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span>Supported: Eventbrite, Ticketmaster, Facebook, venue sites, festivals</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-black font-bold uppercase tracking-wider text-[10px]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportUrlModal;

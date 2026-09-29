import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Globe, Sparkles, Loader2, Calendar, Clock, MapPin, Building, 
  DollarSign, CheckCircle2, AlertCircle, PlusCircle, ExternalLink, Play,
  RefreshCw, Check, CopyCheck, Plus, Trash2, Filter
} from 'lucide-react';
import { EventActivity } from '../types';
import { DEFAULT_CRAWLER_SOURCES, ScraperSourceConfig, ScrapedEventDraft } from '../services/webScraperService';
import { doEventsMeetDuplicateConditions } from '../utils/duplicateEventProtocol';
import { CITIES } from '../constants';

interface WebCrawlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEvents: EventActivity[];
  onBatchImportToQueue: (events: ScrapedEventDraft[]) => Promise<number>;
}

export const WebCrawlerModal: React.FC<WebCrawlerModalProps> = ({
  isOpen,
  onClose,
  existingEvents,
  onBatchImportToQueue
}) => {
  const [sources, setSources] = useState<ScraperSourceConfig[]>(() => {
    const saved = localStorage.getItem('metro_crawler_sources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_CRAWLER_SOURCES;
  });

  const [activeTab, setActiveTab] = useState<'sources' | 'results'>('sources');
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{ current: number; total: number; sourceName: string }>({
    current: 0,
    total: 0,
    sourceName: ''
  });

  const [discoveredEvents, setDiscoveredEvents] = useState<{
    draft: ScrapedEventDraft;
    isDuplicate: boolean;
    duplicateReason?: string;
    selected: boolean;
  }[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Custom Source Form
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceCity, setNewSourceCity] = useState('Tulsa');
  const [newSourceCategory, setNewSourceCategory] = useState('Entertainment');

  // Save sources to localStorage
  useEffect(() => {
    localStorage.setItem('metro_crawler_sources', JSON.stringify(sources));
  }, [sources]);

  const toggleSourceEnabled = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    let cleanUrl = newSourceUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const newSource: ScraperSourceConfig = {
      id: `custom-${Date.now()}`,
      name: newSourceName.trim(),
      url: cleanUrl,
      cityName: newSourceCity,
      category: newSourceCategory,
      enabled: true
    };

    setSources(prev => [newSource, ...prev]);
    setNewSourceName('');
    setNewSourceUrl('');
    setShowAddSource(false);
  };

  const handleRunCrawler = async () => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      alert('Please enable at least one crawler source website.');
      return;
    }

    setCrawling(true);
    setImportSummary(null);
    setDiscoveredEvents([]);
    setActiveTab('results');
    setCrawlProgress({ current: 0, total: enabledSources.length, sourceName: '' });

    const allCrawled: ScrapedEventDraft[] = [];

    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i];
      setCrawlProgress({
        current: i + 1,
        total: enabledSources.length,
        sourceName: source.name
      });

      try {
        const response = await fetch('/api/scrape/crawl-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: source.url,
            cityName: source.cityName
          })
        });

        const rawText = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.warn(`Server returned non-JSON response for ${source.name}`);
          continue;
        }

        if (response.ok && data && data.success && Array.isArray(data.events)) {
          allCrawled.push(...data.events);

          // Update source metadata
          setSources(prev => prev.map(s => s.id === source.id ? {
            ...s,
            lastCrawled: new Date().toLocaleDateString(),
            eventsFound: data.events.length
          } : s));
        }
      } catch (err) {
        console.error(`Failed to crawl ${source.name}:`, err);
      }
    }

    // Deduplicate against existing events using Duplicate Event Protocol
    const analyzed = allCrawled.map(draft => {
      const tempEvent: EventActivity = {
        id: `temp-${Math.random()}`,
        title: draft.title,
        date: draft.date,
        cityName: draft.cityName,
        venue: draft.venue,
        location: draft.location,
        price: draft.price,
        category: draft.category as any,
        description: draft.description
      };

      const match = existingEvents.find(existing => doEventsMeetDuplicateConditions(tempEvent, existing));
      return {
        draft,
        isDuplicate: Boolean(match),
        duplicateReason: match ? `Matches "${match.title}" (${match.date || 'Date TBD'})` : undefined,
        selected: !Boolean(match) // Pre-select newly discovered unique events
      };
    });

    setDiscoveredEvents(analyzed);
    setCrawling(false);
  };

  const handleToggleSelectAll = (selectNewOnly = true) => {
    setDiscoveredEvents(prev => prev.map(item => {
      if (selectNewOnly && item.isDuplicate) return { ...item, selected: false };
      return { ...item, selected: true };
    }));
  };

  const handleToggleItem = (index: number) => {
    setDiscoveredEvents(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const handleBatchImport = async () => {
    const selectedDrafts = discoveredEvents.filter(e => e.selected).map(e => e.draft);
    if (selectedDrafts.length === 0) return;

    setIsImporting(true);
    try {
      const count = await onBatchImportToQueue(selectedDrafts);
      setImportSummary(`Successfully imported ${count} events into the Admin Queue!`);
      // Unselect imported
      setDiscoveredEvents(prev => prev.map(item => item.selected ? { ...item, selected: false, isDuplicate: true, duplicateReason: 'Just added to queue' } : item));
    } catch (err: any) {
      alert(`Import error: ${err.message || 'Failed to save events'}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const newEventsCount = discoveredEvents.filter(e => !e.isDuplicate).length;
  const duplicateEventsCount = discoveredEvents.filter(e => e.isDuplicate).length;
  const selectedCount = discoveredEvents.filter(e => e.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/10">
              <Globe className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">
                Automated Web Scrapers & Crawlers
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Scan multiple venue and city calendars, extract upcoming listings, and filter duplicates
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'sources'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-400 hover:text-gray-900'
              }`}
            >
              Target Sources ({sources.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'results'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-400 hover:text-gray-900'
              }`}
            >
              Crawled Results {discoveredEvents.length > 0 && `(${discoveredEvents.length})`}
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {activeTab === 'sources' && (
              <button
                type="button"
                onClick={() => setShowAddSource(!showAddSource)}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-black text-gray-700 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Source
              </button>
            )}

            <button
              type="button"
              onClick={handleRunCrawler}
              disabled={crawling}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 disabled:opacity-50"
            >
              {crawling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning ({crawlProgress.current}/{crawlProgress.total})...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run Crawler Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add Source Form Drawer */}
          {showAddSource && (
            <form onSubmit={handleAddSource} className="p-4 bg-orange-50/60 border border-orange-200 rounded-3xl space-y-3 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-950">Add Custom Crawler Source</span>
                <button type="button" onClick={() => setShowAddSource(false)} className="text-gray-400 hover:text-black text-xs font-bold">Cancel</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="Website Name (e.g. Cain's Ballroom)"
                  className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                />
                <input
                  type="url"
                  required
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/events or calendar link"
                  className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={newSourceCity}
                  onChange={e => setNewSourceCity(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-black"
                >
                  {CITIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button
                  type="submit"
                  className="py-2 bg-black hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Save Crawler Source
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: Sources Manager */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                <span>Configured Web Crawler Targets ({sources.filter(s => s.enabled).length} Enabled)</span>
                <span>Select sources to scan</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map(source => (
                  <div
                    key={source.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      source.enabled
                        ? 'bg-white border-gray-200 shadow-xs'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={() => toggleSourceEnabled(source.id)}
                        className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black text-gray-900 truncate">{source.name}</h5>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {source.cityName}
                          </span>
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-400 hover:text-black flex items-center gap-1 truncate mt-0.5"
                        >
                          {source.url.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                        {source.lastCrawled && (
                          <p className="text-[9px] text-gray-400 mt-1">
                            Last scan: {source.lastCrawled} ({source.eventsFound || 0} events)
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteSource(source.id)}
                      className="p-1.5 text-gray-300 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Crawled Results */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {crawling && (
                <div className="p-8 border border-orange-200 bg-orange-50/50 rounded-3xl text-center space-y-3 animate-pulse">
                  <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    Crawling Source {crawlProgress.current} of {crawlProgress.total}...
                  </h4>
                  <p className="text-xs text-gray-600 font-bold">
                    Scanning {crawlProgress.sourceName}
                  </p>
                </div>
              )}

              {importSummary && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p>{importSummary}</p>
                </div>
              )}

              {!crawling && discoveredEvents.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl space-y-3">
                  <Globe className="w-8 h-8 text-gray-300 mx-auto" />
                  <h4 className="text-sm font-black text-gray-900 uppercase">No Crawl Results Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click "Run Crawler Now" above to scan your active calendar sources.
                  </p>
                </div>
              )}

              {!crawling && discoveredEvents.length > 0 && (
                <div className="space-y-4">
                  {/* Results Controls */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        ✨ {newEventsCount} New Unique
                      </span>
                      <span className="text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        🔁 {duplicateEventsCount} Already in DB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="px-3 py-1.5 bg-white border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-700 cursor-pointer shadow-xs"
                      >
                        Select All New
                      </button>

                      <button
                        type="button"
                        onClick={handleBatchImport}
                        disabled={selectedCount === 0 || isImporting}
                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 disabled:opacity-50"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            Import {selectedCount} Selected to Queue
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Discovered Items List */}
                  <div className="space-y-2.5">
                    {discoveredEvents.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleItem(idx)}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                          item.selected
                            ? 'bg-orange-50/40 border-orange-300 shadow-xs'
                            : item.isDuplicate
                            ? 'bg-gray-50/60 border-gray-200 opacity-60'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleItem(idx)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                              {item.draft.category || 'Entertainment'}
                            </span>
                            {item.draft.cityName ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                🏙️ {item.draft.cityName}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                No City Set
                              </span>
                            )}
                            {item.isDuplicate ? (
                              <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CopyCheck className="w-3 h-3 text-gray-500" />
                                {item.duplicateReason || 'Duplicate'}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                New Unique Event
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-gray-900 tracking-tight">{item.draft.title}</h5>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-gray-500 font-bold">
                            <span>📅 {item.draft.date || 'Date TBD'}</span>
                            {item.draft.time && <span>⏰ {item.draft.time}</span>}
                            {item.draft.venue && <span>📍 {item.draft.venue}</span>}
                            {item.draft.price && <span>🎟️ {item.draft.price}</span>}
                          </div>
                        </div>

                        {item.draft.sourceUrl && (
                          <a
                            href={item.draft.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-black p-1 transition-colors"
                            title="Visit Source Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span>Active Sources: {sources.filter(s => s.enabled).length} sites</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black font-bold uppercase tracking-wider text-[10px]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WebCrawlerModal;

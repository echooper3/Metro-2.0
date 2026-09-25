import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  TrendingUp, Users, Zap, MapPin, Globe, Clock, ArrowUpRight, Activity, 
  BarChart3, Search, Heart, LayoutGrid, X, Trash2, Megaphone, PlusCircle, 
  Eye, MousePointerClick, Percent, RefreshCw, CheckCircle2, AlertCircle, Upload, Inbox,
  Edit3, CheckSquare, Square, Filter, Loader2, Calendar, Building, DollarSign, Tag, User,
  FolderArchive, RotateCcw, FileText, Award, Sparkles, ExternalLink,
  Layers, AlertTriangle, Star, CopyCheck, GitMerge, CheckCheck
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, 
  serverTimestamp, updateDoc, increment, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { UserProfile, SponsorshipSubmission, EventActivity } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CITIES } from '../constants';
import { fetchEvents } from '../services/geminiService';
import EventsUploadDialog from './UploadEventsDialog';
import EditQueueEventModal from './EditQueueEventModal';
import SponsorOnboardingModal from './SponsorOnboardingModal';
import MonthlySponsorSummaryModal from './MonthlySponsorSummaryModal';
import { DateFilterType, isEventInDateRange, isEventExpired, parseEventDate } from '../utils/dateUtils';
import { buildTrackedUrl } from '../utils/trackingUtils';
import { 
  detectDuplicateEvents, 
  mergeEventData, 
  DuplicateCluster, 
  DuplicateMatchType, 
  calculateCompletenessScore 
} from '../utils/duplicateEventProtocol';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta: string;
  image: string;
  url: string;
  tag: string;
  cityId: string;
  clicks: number;
  impressions: number;
  createdAt?: any;
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

const VALID_CATEGORIES = [
  'Sports', 
  'Family Activities', 
  'Entertainment', 
  'Visitor Attractions', 
  'Food & Drink', 
  'Arts & Culture', 
  'Outdoors', 
  'Community'
];

interface AdminDashboardProps {
  user: UserProfile;
  dbEvents: EventActivity[];
  onUpdateSyncStats: (lastSyncAt: string, totalSyncs: number) => void;
  onDeleteMultipleEvents?: (events: EventActivity[]) => Promise<void>;
}

interface CategorizationCardProps {
  event: EventActivity;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (event: EventActivity) => void;
  onDelete: (id: string) => void;
  isArchiveView?: boolean;
  isDuplicateFlagged?: boolean;
  onOpenDuplicateProtocol?: () => void;
}

const CategorizationCard: React.FC<CategorizationCardProps> = ({ 
  event, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete,
  isArchiveView = false,
  isDuplicateFlagged = false,
  onOpenDuplicateProtocol
}) => {
  const isExpired = isEventExpired(event.date, event.time, event.endTime);
  const parsedDate = parseEventDate(event.date);
  const hasDateIssue = Boolean(event.date) && !parsedDate;

  const [selectedCat, setSelectedCat] = useState<string>(
    event.category && event.category !== 'Undefined' ? event.category : 'Entertainment'
  );
  const [saving, setSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (event.category && event.category !== 'Undefined') {
      setSelectedCat(event.category);
    }
  }, [event.category]);

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      const eventRef = doc(db, 'events', event.id);
      await setDoc(eventRef, { 
        category: selectedCat,
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update event category:", err);
      alert("Failed to update event category. Please check permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(event.id);
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className={`p-6 bg-white rounded-[2rem] border transition-all duration-200 flex flex-col justify-between space-y-4 relative text-left shadow-sm ${
      isSelected 
        ? 'border-orange-500 shadow-md ring-2 ring-orange-500/20' 
        : isArchiveView
          ? 'border-amber-200/80 bg-gradient-to-b from-white to-amber-50/20 hover:border-amber-300'
          : 'border-gray-200/80 hover:border-gray-300'
    }`}>
      {/* Top Bar: Select Checkbox & City Badge */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggleSelect(event.id)}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors cursor-pointer"
          title={isSelected ? "Deselect item" : "Select item"}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-orange-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-300 hover:text-gray-500" />
          )}
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
            {isSelected ? "Selected" : "Select"}
          </span>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isArchiveView && (
            isExpired ? (
              <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Past Event
              </span>
            ) : hasDateIssue ? (
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Date Issue
              </span>
            ) : null
          )}
          {isDuplicateFlagged && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDuplicateProtocol?.();
              }}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title="Flagged by Duplicate Protocol. Click to open protocol."
            >
              <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
              Duplicate Flagged
            </button>
          )}
          {event.cityName && event.cityName.toLowerCase() !== 'unknown' ? (
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
              {event.cityName}
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
              No City Set
            </span>
          )}
        </div>
      </div>

      {/* Image Thumbnail (if present) & Details */}
      <div className="space-y-3">
        {event.imageUrl && (
          <div className="w-full h-32 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-full h-full object-cover" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}

        <div>
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight line-clamp-2" title={event.title}>
            {event.title}
          </h4>
          
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>📅 {event.date || 'Date TBD'}</span>
            {event.time && <span>• ⏰ {event.time}</span>}
            {event.venue && <span className="text-gray-600">• 📍 {event.venue}</span>}
            {event.price && <span className="text-emerald-600 font-black">• 🎟️ {event.price}</span>}
          </div>
        </div>
        
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
          {event.description || 'No description provided.'}
        </p>
      </div>
      
      {/* Action Area */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <div>
          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Quick Categorize</label>
          <div className="flex gap-2">
            <select 
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-black transition-colors"
            >
              {event.category === 'Undefined' && (
                <option value="Undefined">⚠️ Undefined (Queue)</option>
              )}
              {VALID_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleSaveCategory}
              disabled={saving}
              className="px-4 py-2 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
              title="Save Category"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>

        {/* Edit & Delete Buttons */}
        {isConfirmingDelete ? (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-red-600 text-center">
              Delete this event permanently?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-[9px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Confirm Delete
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-2 border border-gray-200 hover:bg-white text-gray-600 font-black rounded-lg text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className={`py-2.5 px-3 border rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                isArchiveView 
                  ? 'border-orange-200 hover:border-orange-500 hover:bg-orange-50 text-orange-950 font-black' 
                  : 'border-gray-200 hover:border-black hover:bg-gray-50 text-gray-800 font-black'
              }`}
              title={isArchiveView ? "Reschedule this event to a future date to reactivate it" : "Edit Details"}
            >
              {isArchiveView ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                  Reschedule / Edit
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  Edit Details
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="py-2.5 px-3 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 font-black rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  dbEvents, 
  onUpdateSyncStats,
  onDeleteMultipleEvents 
}) => {
  const [stats, setStats] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Manage the Upload States
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'analytics' | 'ads' | 'inbox'>('analytics');
  const [inboxSubTab, setInboxSubTab] = useState<'sponsorships' | 'uncategorized' | 'duplicates' | 'archive'>('sponsorships');

  // Duplicate Event Protocol State
  const [dismissedDuplicateClusterKeys, setDismissedDuplicateClusterKeys] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('metro_admin_dismissed_duplicates');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [duplicateSearchQuery, setDuplicateSearchQuery] = useState('');
  const [duplicateCityFilter, setDuplicateCityFilter] = useState('All');
  const [duplicateMatchTypeFilter, setDuplicateMatchTypeFilter] = useState<DuplicateMatchType | 'all'>('all');
  const [isResolvingDuplicates, setIsResolvingDuplicates] = useState(false);
  const [isDismissedDuplicateBanner, setIsDismissedDuplicateBanner] = useState(false);

  // Inbox states
  const [submissions, setSubmissions] = useState<SponsorshipSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);

  // Categorization Queue Management State
  const [editingQueueEvent, setEditingQueueEvent] = useState<EventActivity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueCityFilter, setQueueCityFilter] = useState('All');
  const [queueCategoryFilter, setQueueCategoryFilter] = useState<string>('Undefined');
  const [queueSourceFilter, setQueueSourceFilter] = useState<'all' | 'my-admin' | 'crawled' | 'users'>('all');
  const [queueDateFilter, setQueueDateFilter] = useState<DateFilterType>('all');
  const [queueCustomStartDate, setQueueCustomStartDate] = useState<string>('');
  const [queueCustomEndDate, setQueueCustomEndDate] = useState<string>('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchCategory, setBatchCategory] = useState('Entertainment');
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set());

  // Past Events Purge & Auto-Sweep State
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('metro_admin_auto_purge_past_events') === 'true';
  });
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [hasAutoPurgedThisSession, setHasAutoPurgedThisSession] = useState(false);
  const [isDismissedPurgeBanner, setIsDismissedPurgeBanner] = useState(false);

  // Archive Folder State
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveCityFilter, setArchiveCityFilter] = useState('All');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('All');
  const [archiveIssueFilter, setArchiveIssueFilter] = useState<'all' | 'expired' | 'unparseable'>('all');
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<string[]>([]);

  // Ads Management State
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdCityFilter, setSelectedAdCityFilter] = useState<string>('all');
  const [isPublishingAd, setIsPublishingAd] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedSummaryAdId, setSelectedSummaryAdId] = useState<string | undefined>(undefined);

  // Form Fields State
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdTag, setNewAdTag] = useState('');
  const [newAdDescription, setNewAdDescription] = useState('');
  const [newAdCta, setNewAdCta] = useState('');
  const [newAdImage, setNewAdImage] = useState('');
  const [newAdUrl, setNewAdUrl] = useState('');
  const [newAdCityId, setNewAdCityId] = useState('general');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setNewAdImage(compressed);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Fetch traffic stats
    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'traffic'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Firestore onSnapshot Error [stats/traffic]:', error);
      setLoading(false);
    });

    // Fetch user count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserCount(snapshot.size);
    }, (error) => {
      console.error('Firestore onSnapshot Error [users]:', error);
    });

    // Fetch event count
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEventCount(snapshot.size);
    }, (error) => {
      console.error('Firestore onSnapshot Error [events]:', error);
    });

    // Fetch ads in real time
    const unsubscribeAds = onSnapshot(collection(db, 'ads'), (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
      setAds(adsData);
    }, (error) => {
      console.error('Firestore onSnapshot Error [ads]:', error);
    });

    // Fetch sponsorships in real time
    const unsubscribeSponsorships = onSnapshot(
      query(collection(db, 'sponsorships'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SponsorshipSubmission));
        setSubmissions(data);
        setSubmissionsLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot Error [sponsorships]:", error);
        setSubmissionsLoading(false);
      }
    );

    return () => {
      unsubscribeStats();
      unsubscribeUsers();
      unsubscribeEvents();
      unsubscribeAds();
      unsubscribeSponsorships();
    };
  }, []);

  const handleApproveSponsorship = async (sub: SponsorshipSubmission) => {
    if (!window.confirm(`Approve and launch "${sub.title}" as a live ad signal?`)) return;
    try {
      // 1. Create matching ad doc in 'ads'
      const newAdRef = doc(collection(db, 'ads'));
      await setDoc(newAdRef, {
        id: newAdRef.id,
        title: sub.title,
        tag: sub.tag || 'Sponsorship',
        description: sub.description || '',
        cta: sub.cta,
        image: sub.image,
        url: sub.url,
        cityId: sub.cityId,
        clicks: 0,
        impressions: 0,
        createdAt: serverTimestamp()
      });

      // 2. Update status of the sponsorship
      await updateDoc(doc(db, 'sponsorships', sub.id), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      alert("Sponsorship approved and activated successfully!");
    } catch (err) {
      console.error("Failed to approve sponsorship:", err);
      alert("Failed to approve sponsorship. Please try again.");
    }
  };

  const handleDeclineSponsorship = async (sub: SponsorshipSubmission) => {
    if (!window.confirm(`Are you sure you want to decline the sponsorship "${sub.title}"?`)) return;
    try {
      await updateDoc(doc(db, 'sponsorships', sub.id), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      alert("Sponsorship declined.");
    } catch (err) {
      console.error("Failed to decline sponsorship:", err);
      alert("Failed to decline sponsorship. Please try again.");
    }
  };

  const handlePublishAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle || !newAdCta || !newAdImage || !newAdUrl) {
      alert("Please fill in all required fields.");
      return;
    }
    setIsPublishingAd(true);
    try {
      const adsCollection = collection(db, 'ads');
      const newAdRef = doc(adsCollection);
      const adData: Ad = {
        id: newAdRef.id,
        title: newAdTitle,
        tag: newAdTag || 'Sponsorship',
        description: newAdDescription,
        cta: newAdCta,
        image: newAdImage,
        url: newAdUrl,
        cityId: newAdCityId,
        clicks: 0,
        impressions: 0
      };
      await setDoc(newAdRef, {
        ...adData,
        createdAt: serverTimestamp()
      });
      
      // Reset Form Fields
      setNewAdTitle('');
      setNewAdTag('');
      setNewAdDescription('');
      setNewAdCta('');
      setNewAdImage('');
      setNewAdUrl('');
      setNewAdCityId('general');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error("Failed to publish sponsorship signal:", err);
      alert("Failed to publish sponsorship signal. Please verify permissions.");
    } finally {
      setIsPublishingAd(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm("Are you sure you want to terminate this sponsorship signal?")) return;
    // Optimistic removal:
    setAds(prev => prev.filter(a => a.id !== adId));
    try {
      await deleteDoc(doc(db, 'ads', adId));
    } catch (err) {
      console.error("Failed to delete ad:", err);
      alert("Failed to delete ad. Please check permissions.");
    }
  };

  const handleSeedDefaultAds = async () => {
    if (!window.confirm("Do you want to seed default premium ads into the database? This will populate highly aesthetic sponsorship signals for all hubs.")) return;
    try {
      const adsCollection = collection(db, 'ads');
      const defaultAds = [
        {
          title: "Cain's Ballroom",
          description: "The historic home of Bob Wills. Experience the legendary sounds of the Arts District.",
          cta: "View Lineup",
          image: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&q=80&w=1200",
          tag: "Tulsa Legend",
          cityId: "tulsa",
          url: "https://www.cainsballroom.com"
        },
        {
          title: "Gathering Place",
          description: "A world-class park for all of Tulsa. Discover new heights of adventure today.",
          cta: "Explore Park",
          image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200",
          tag: "Metropolitan Star",
          cityId: "tulsa",
          url: "https://www.gatheringplace.org"
        },
        {
          title: "Bricktown Canal",
          description: "Navigate the heart of Oklahoma City. Scenic water taxi tours daily through the historic district.",
          cta: "Book Taxi",
          image: "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&q=80&w=1200",
          tag: "OKC Classic",
          cityId: "okc",
          url: "https://www.bricktownwatertaxi.com"
        },
        {
          title: "Paycom Center",
          description: "Home of the OKC Thunder. Experience the loudest arena in the NBA and premier concerts.",
          cta: "Buy Tickets",
          image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=1200",
          tag: "OKC Hub",
          cityId: "okc",
          url: "https://www.paycomcenter.com"
        },
        {
          title: "Reunion Tower",
          description: "The GeO-Deck offers 360-degree views of the Big D skyline. Dallas starts here.",
          cta: "See The View",
          image: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&q=80&w=1200",
          tag: "Dallas Icon",
          cityId: "dallas",
          url: "https://reuniontower.com"
        },
        {
          title: "NorthPark Center",
          description: "Premier shopping meets world-class art. Experience the finest Dallas has to offer.",
          cta: "Explore NorthPark",
          image: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&q=80&w=1200",
          tag: "Elite Partner",
          cityId: "dallas",
          url: "https://www.northparkcenter.com"
        },
        {
          title: "Space Center Houston",
          description: "The gateway to human space exploration. Visit the official NASA visitor center.",
          cta: "Mission Log",
          image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200",
          tag: "Global Landmark",
          cityId: "houston",
          url: "https://spacecenter.org"
        },
        {
          title: "The Museum District",
          description: "19 world-class institutions in the heart of Houston. Culture, science, and history united.",
          cta: "Visit District",
          image: "https://images.unsplash.com/photo-1518998053504-5368efc9bca7?auto=format&fit=crop&q=80&w=1200",
          tag: "Cultural Hub",
          cityId: "houston",
          url: "https://houstonmuseumdistrict.org"
        },
        {
          title: "Metropolitan Reserve",
          description: "Private wealth management for the modern intelligence network. Secure your regional legacy.",
          cta: "Request Consult",
          image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
          tag: "Certified",
          cityId: "general",
          url: "https://www.inside-the-metro.com"
        },
        {
          title: "The Velocity Collection",
          description: "Precision automotive engineering for the metropolitan driver. Experience unmatched power.",
          cta: "Schedule Drive",
          image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200",
          tag: "Featured",
          cityId: "general",
          url: "https://www.inside-the-metro.com"
        }
      ];

      const batch = writeBatch(db);
      defaultAds.forEach((ad) => {
        const newAdRef = doc(adsCollection);
        batch.set(newAdRef, {
          id: newAdRef.id,
          ...ad,
          clicks: 0,
          impressions: 0,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      alert("Seeded 10 beautiful sponsorship signals successfully!");
    } catch (err) {
      console.error("Failed to seed default ads:", err);
      alert("Seeding failed. Please verify security permissions.");
    }
  };

  const handleDeleteQueueEvent = async (id: string) => {
    // 1. Instant optimistic UI removal
    setOptimisticDeletedIds(prev => new Set(prev).add(id));
    setSelectedQueueIds(prev => prev.filter(item => item !== id));
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      console.error("Failed to delete event:", err);
      // Rollback on error
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert("Failed to delete event. Please check permissions.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedQueueIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedQueueIds.length} selected events from the database? This cannot be undone.`)) return;

    const idsToDelete = [...selectedQueueIds];
    const eventsToDelete = activeDbEvents.filter(e => idsToDelete.includes(e.id));

    // 1. Instant optimistic UI removal of all selected cards
    setOptimisticDeletedIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.add(id));
      return next;
    });
    setSelectedQueueIds([]);

    setIsBatchProcessing(true);
    try {
      if (onDeleteMultipleEvents && eventsToDelete.length > 0) {
        await onDeleteMultipleEvents(eventsToDelete);
      } else {
        const BATCH_SIZE = 400;
        for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
          const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.delete(doc(db, 'events', id));
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to batch delete events:", err);
      // Rollback on error
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
      alert("Failed to delete selected events.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchCategorize = async () => {
    if (selectedQueueIds.length === 0) return;
    if (!window.confirm(`Assign category "${batchCategory}" to ${selectedQueueIds.length} selected events and publish them?`)) return;

    const idsToCategorize = [...selectedQueueIds];
    setIsBatchProcessing(true);
    try {
      const BATCH_SIZE = 400;
      for (let i = 0; i < idsToCategorize.length; i += BATCH_SIZE) {
        const chunk = idsToCategorize.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.set(doc(db, 'events', id), {
            category: batchCategory,
            updatedAt: serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      }
      setSelectedQueueIds([]);
    } catch (err) {
      console.error("Failed to batch categorize events:", err);
      alert("Failed to categorize selected events.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleToggleSelectQueue = (id: string) => {
    setSelectedQueueIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectArchive = (id: string) => {
    setSelectedArchiveIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteArchive = async () => {
    if (selectedArchiveIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedArchiveIds.length} selected archived events from the database? This cannot be undone.`)) return;

    const idsToDelete = [...selectedArchiveIds];
    const eventsToDelete = activeDbEvents.filter(e => idsToDelete.includes(e.id));

    // Instant optimistic UI removal
    setOptimisticDeletedIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.add(id));
      return next;
    });
    setSelectedArchiveIds([]);

    setIsBatchProcessing(true);
    try {
      if (onDeleteMultipleEvents && eventsToDelete.length > 0) {
        await onDeleteMultipleEvents(eventsToDelete);
      } else {
        const BATCH_SIZE = 400;
        for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
          const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.delete(doc(db, 'events', id));
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to batch delete archived events:", err);
      // Rollback on error
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
      alert("Failed to delete selected archived events.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleOpenEditQueueModal = (event: EventActivity) => {
    setEditingQueueEvent(event);
    setIsEditModalOpen(true);
  };

  const cityData = stats?.cityViews ? Object.entries(stats.cityViews).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count) : [];

  const eventData = stats?.eventViews 
    ? Object.entries(stats.eventViews)
        .map(([name, count]) => {
          const safeCount = typeof count === 'object' && count !== null
            ? 0
            : (count as number);

          return {
            name: name.replace(/_/g, ' '),
            count: safeCount
          };
        })
        .filter(item => item.count > 0) 
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) 
    : [];

  const categoryData = stats?.categoryViews ? Object.entries(stats.categoryViews).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    value: count as number
  })).sort((a, b) => b.value - a.value) : [];

  const searchData = stats?.searchQueries ? Object.entries(stats.searchQueries).map(([query, count]) => ({
    query: query.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count).slice(0, 5) : [];

  const saveData = stats?.eventSaves ? Object.entries(stats.eventSaves).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    count: count as number
  })).sort((a, b) => b.count - a.count).slice(0, 5) : [];

  const COLORS = ['#000000', '#EA580C', '#4B5563', '#9CA3AF', '#E5E7EB', '#F97316', '#FB923C'];

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Initializing Global Sync...');
    try {
      for (let i = 0; i < CITIES.length; i++) {
        const city = CITIES[i];
        setSyncStatus(`Syncing ${city.name} (${i+1}/${CITIES.length})...`);
        const result = await fetchEvents(city.name, { forceRefresh: true, adminSync: true });
        if (result && result.events.length > 0) {
          for (const event of result.events) {
            const eventRef = doc(collection(db, 'events'));
            await setDoc(eventRef, {
              ...event,
              id: eventRef.id,
              userId: user.id,
              userCreated: false,
              createdAt: serverTimestamp()
            });
          }
        }
        if (i < CITIES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const syncTime = new Date().toISOString();
      const totalSyncs = (user.syncStats?.totalSyncs || 0) + 1;
      
      try {
        await updateDoc(doc(db, 'users', user.id), {
          "syncStats.lastSyncAt": syncTime,
          "syncStats.totalSyncs": increment(1)
        });
        onUpdateSyncStats(syncTime, totalSyncs);
      } catch (err) {
        console.error("Failed to update admin sync stats:", err);
      }

      setSyncStatus('Global Sync Complete');
      setTimeout(() => setSyncStatus(''), 5000);
    } catch (e) {
      setSyncStatus('Sync Failed');
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", duration: 0.5 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const uploadInBatches = async (eventsData: any[], db: any) => {
    const eventsCollection = collection(db, "events");
    const chunkSize = 500;

    for (let i = 0; i < eventsData.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = eventsData.slice(i, i + chunkSize);

      chunk.forEach((event) => {
        const docRef = doc(eventsCollection);
        batch.set(docRef, event);
      });

      await batch.commit();
      console.log(`Batch ${i / chunkSize + 1} uploaded`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!validTypes.includes(selectedFile.type)) {
      console.error("Please upload a valid Excel or CSV file");
      return;
    }

    setIsProcessing(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const readResponse = await fetch("/api/read-sheet", {
        method: "POST",
        body: formData,
      });

      const readData = await readResponse.json();

      if (!readResponse.ok) {
        throw new Error(readData.error || "Failed to read spreadsheet");
      }

      const jsonData = readData.data;

      const eventsData = jsonData.map((item: any) => ({
        title: item?.title || "Untitled Event",
        category: capitalizeFirstLetter(item?.category || ""),
        description: item?.description || "",
        date: item?.date?.toString() || "",
        time: item?.startTime?.toString() || "",
        endTime: item?.endTime?.toString() || "",
        lat: item?.lat ? parseFloat(item.lat) : 0,
        lng: item?.lng ? parseFloat(item.lng) : 0,
        price: item?.price?.toString() || "",
        ageRestriction: item?.ageRestriction?.toString() || "",
        venue: item?.venue?.toString() || "",
        location: item?.location?.toString() || "",
        cityName: (() => {
          const raw = item?.cityName?.toString().trim() || "";
          return raw.toLowerCase() === "unknown" ? "" : capitalizeFirstLetter(raw);
        })(),
        imageUrl: item?.imageUrl || "",
        adminCreated: true,
        userId: user.id,
        createdAt: serverTimestamp(),
      }));

      await uploadInBatches(eventsData, db);
      setUploadSuccess(true);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setUploadSuccess(false);
        setIsProcessing(false);
      }, 300);
    }
  };

  const filteredAds = React.useMemo(() => {
    if (selectedAdCityFilter === 'all') return ads;
    return ads.filter(ad => ad.cityId.toLowerCase() === selectedAdCityFilter.toLowerCase());
  }, [ads, selectedAdCityFilter]);

  const activeDbEvents = useMemo(() => {
    return (dbEvents || []).filter(e => !optimisticDeletedIds.has(e.id));
  }, [dbEvents, optimisticDeletedIds]);

  // Expired events whose scheduled date and time have passed
  const expiredEvents = useMemo(() => {
    return activeDbEvents.filter(e => isEventExpired(e.date, e.time, e.endTime));
  }, [activeDbEvents]);

  // Duplicate Protocol: Detect duplicate/identical events across active database
  const duplicateClusters = useMemo(() => {
    return detectDuplicateEvents(activeDbEvents, dismissedDuplicateClusterKeys);
  }, [activeDbEvents, dismissedDuplicateClusterKeys]);

  const duplicateEventIdSet = useMemo(() => {
    const ids = new Set<string>();
    duplicateClusters.forEach(cluster => {
      cluster.events.forEach(e => ids.add(e.id));
    });
    return ids;
  }, [duplicateClusters]);

  const filteredDuplicateClusters = useMemo(() => {
    return duplicateClusters.filter(cluster => {
      if (duplicateMatchTypeFilter !== 'all' && cluster.matchType !== duplicateMatchTypeFilter) {
        return false;
      }
      if (duplicateCityFilter !== 'All') {
        const hasCity = cluster.events.some(e => 
          Boolean(e.cityName) && e.cityName.toLowerCase() !== 'unknown' && e.cityName.toLowerCase() === duplicateCityFilter.toLowerCase()
        );
        if (!hasCity) return false;
      }
      if (duplicateSearchQuery.trim()) {
        const q = duplicateSearchQuery.toLowerCase();
        const matches = cluster.events.some(e => 
          e.title.toLowerCase().includes(q) ||
          (e.venue && e.venue.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.id.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [duplicateClusters, duplicateMatchTypeFilter, duplicateCityFilter, duplicateSearchQuery]);

  const handleDismissDuplicateCluster = (clusterKey: string) => {
    setDismissedDuplicateClusterKeys(prev => {
      const next = new Set(prev).add(clusterKey);
      try {
        localStorage.setItem('metro_admin_dismissed_duplicates', JSON.stringify([...next]));
      } catch (e) {
        console.error("Failed to persist dismissed duplicate clusters:", e);
      }
      return next;
    });
  };

  const handleResetDismissedDuplicates = () => {
    if (!window.confirm("Reset all dismissed duplicate clusters and re-evaluate the full database?")) return;
    setDismissedDuplicateClusterKeys(new Set());
    try {
      localStorage.removeItem('metro_admin_dismissed_duplicates');
    } catch (e) {
      console.error("Failed to clear dismissed duplicates:", e);
    }
  };

  const handleKeepPrimary = async (cluster: DuplicateCluster, primaryEventId: string) => {
    const primaryEvent = cluster.events.find(e => e.id === primaryEventId);
    if (!primaryEvent) return;

    const duplicatesToDelete = cluster.events.filter(e => e.id !== primaryEventId);
    const deleteIds = duplicatesToDelete.map(e => e.id);

    if (!window.confirm(
      `Protocol Action: Keep "${primaryEvent.title}" as primary and permanently remove ${duplicatesToDelete.length} redundant duplicate event${duplicatesToDelete.length > 1 ? 's' : ''}?`
    )) {
      return;
    }

    setIsResolvingDuplicates(true);
    // Optimistic removal of duplicates
    setOptimisticDeletedIds(prev => {
      const next = new Set(prev);
      deleteIds.forEach(id => next.add(id));
      return next;
    });

    try {
      // 1. Merge missing fields into primary
      const mergedFields = mergeEventData(primaryEvent, duplicatesToDelete);
      if (Object.keys(mergedFields).length > 0) {
        await updateDoc(doc(db, 'events', primaryEvent.id), {
          ...mergedFields,
          updatedAt: serverTimestamp()
        });
      }

      // 2. Delete redundant duplicate events
      if (onDeleteMultipleEvents && duplicatesToDelete.length > 0) {
        await onDeleteMultipleEvents(duplicatesToDelete);
      } else {
        const batch = writeBatch(db);
        deleteIds.forEach(id => {
          batch.delete(doc(db, 'events', id));
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Failed to resolve duplicate cluster:", err);
      // Rollback on error
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        deleteIds.forEach(id => next.delete(id));
        return next;
      });
      alert("Failed to resolve duplicates. Please check permissions.");
    } finally {
      setIsResolvingDuplicates(false);
    }
  };

  const handleBatchResolveExactDuplicates = async () => {
    const exactClusters = duplicateClusters.filter(c => c.matchType === 'exact');
    if (exactClusters.length === 0) return;

    const totalRedundant = exactClusters.reduce((acc, c) => acc + (c.events.length - 1), 0);

    if (!window.confirm(
      `Protocol Batch Action: Auto-resolve ${exactClusters.length} exact duplicate cluster${exactClusters.length > 1 ? 's' : ''}?\n\nThis will keep the highest-quality primary record for each cluster, merge any missing descriptions/images, and permanently delete ${totalRedundant} duplicate cop${totalRedundant > 1 ? 'ies' : 'y'}.`
    )) {
      return;
    }

    setIsResolvingDuplicates(true);

    const allIdsToDelete: string[] = [];
    const allEventsToDelete: EventActivity[] = [];
    const primaryUpdates: Array<{ id: string; fields: Partial<EventActivity> }> = [];

    exactClusters.forEach(cluster => {
      const primary = cluster.events.find(e => e.id === cluster.recommendedKeepId) || cluster.events[0];
      const duplicates = cluster.events.filter(e => e.id !== primary.id);

      duplicates.forEach(d => {
        allIdsToDelete.push(d.id);
        allEventsToDelete.push(d);
      });

      const merged = mergeEventData(primary, duplicates);
      if (Object.keys(merged).length > 0) {
        primaryUpdates.push({ id: primary.id, fields: merged });
      }
    });

    // Optimistic UI updates
    setOptimisticDeletedIds(prev => {
      const next = new Set(prev);
      allIdsToDelete.forEach(id => next.add(id));
      return next;
    });

    try {
      // 1. Update primaries with merged fields
      for (const update of primaryUpdates) {
        await updateDoc(doc(db, 'events', update.id), {
          ...update.fields,
          updatedAt: serverTimestamp()
        });
      }

      // 2. Delete redundant duplicates
      if (onDeleteMultipleEvents && allEventsToDelete.length > 0) {
        await onDeleteMultipleEvents(allEventsToDelete);
      } else {
        const BATCH_SIZE = 400;
        for (let i = 0; i < allIdsToDelete.length; i += BATCH_SIZE) {
          const chunk = allIdsToDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.delete(doc(db, 'events', id));
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to batch resolve exact duplicates:", err);
      // Rollback
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        allIdsToDelete.forEach(id => next.delete(id));
        return next;
      });
      alert("Failed to auto-resolve some duplicates.");
    } finally {
      setIsResolvingDuplicates(false);
    }
  };

  const handleToggleAutoPurge = () => {
    const nextVal = !autoPurgeEnabled;
    setAutoPurgeEnabled(nextVal);
    localStorage.setItem('metro_admin_auto_purge_past_events', String(nextVal));
  };

  const handlePurgePastEvents = async () => {
    if (expiredEvents.length === 0 || isPurging) return;
    try {
      setIsPurging(true);
      const toDelete = [...expiredEvents];
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        toDelete.forEach(e => next.add(e.id));
        return next;
      });
      setIsPurgeModalOpen(false);
      await onDeleteMultipleEvents(toDelete);
    } catch (err) {
      console.error("Purge past events failed:", err);
      // Rollback optimistic state
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        expiredEvents.forEach(e => next.delete(e.id));
        return next;
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Auto-sweep effect: runs once on dashboard load if auto-sweep is enabled
  useEffect(() => {
    if (!autoPurgeEnabled || hasAutoPurgedThisSession || isPurging || activeDbEvents.length === 0) {
      return;
    }
    if (expiredEvents.length > 0) {
      setHasAutoPurgedThisSession(true);
      const toDelete = [...expiredEvents];
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        toDelete.forEach(e => next.add(e.id));
        return next;
      });
      onDeleteMultipleEvents(toDelete);
    }
  }, [autoPurgeEnabled, hasAutoPurgedThisSession, isPurging, activeDbEvents.length, expiredEvents, onDeleteMultipleEvents]);

  const pendingSponsorshipsCount = submissions.filter(s => s.status === 'pending').length;
  const uncategorizedCount = useMemo(() => {
    return activeDbEvents.filter(e => e.category === 'Undefined').length;
  }, [activeDbEvents]);
  const unparseableCount = useMemo(() => {
    return activeDbEvents.filter(e => Boolean(e.date) && !parseEventDate(e.date)).length;
  }, [activeDbEvents]);
  const unassignedCityCount = useMemo(() => {
    return activeDbEvents.filter(e => !e.cityName || e.cityName.trim().toLowerCase() === 'unknown').length;
  }, [activeDbEvents]);
  const totalInboxCount = pendingSponsorshipsCount + uncategorizedCount + expiredEvents.length;

  const filteredQueueEvents = useMemo(() => {
    return activeDbEvents.filter(event => {
      // Category filter
      let matchesCategory = true;
      if (queueCategoryFilter === 'Undefined') {
        matchesCategory = event.category === 'Undefined';
      } else if (queueCategoryFilter !== 'All') {
        matchesCategory = event.category === queueCategoryFilter;
      }

      // City filter
      let matchesCity = true;
      if (queueCityFilter === 'Unassigned') {
        matchesCity = !event.cityName || event.cityName.trim().toLowerCase() === 'unknown';
      } else if (queueCityFilter !== 'All') {
        matchesCity = event.cityName?.toLowerCase() === queueCityFilter.toLowerCase();
      }

      // Search filter
      const q = queueSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        event.title?.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q) ||
        event.venue?.toLowerCase().includes(q) ||
        event.location?.toLowerCase().includes(q);

      // Source / Author filter
      let matchesSource = true;
      if (queueSourceFilter === 'my-admin') {
        matchesSource = event.userId === user.id;
      } else if (queueSourceFilter === 'crawled') {
        matchesSource = !event.userCreated || (!event.userId && !event.orgId);
      } else if (queueSourceFilter === 'users') {
        matchesSource = !!event.userCreated && event.userId !== user.id;
      }

      // Date range filtering - by default exclude past events so they stay organized in the archive folder
      const matchesDate = isEventInDateRange(
        event.date,
        queueDateFilter,
        queueCustomStartDate,
        queueCustomEndDate,
        queueDateFilter === 'past' || queueDateFilter === 'custom'
      );

      return matchesCategory && matchesCity && matchesSearch && matchesSource && matchesDate;
    });
  }, [activeDbEvents, queueCategoryFilter, queueCityFilter, queueSearchQuery, queueSourceFilter, queueDateFilter, queueCustomStartDate, queueCustomEndDate, user?.id]);

  // Filtered Archive Events (Past events or events with unparseable dates)
  const filteredArchiveEvents = useMemo(() => {
    return activeDbEvents.filter(event => {
      const isExpired = isEventExpired(event.date, event.time, event.endTime);
      const parsed = parseEventDate(event.date);
      const hasDateIssue = Boolean(event.date) && !parsed;

      // Status/issue filter
      if (archiveIssueFilter === 'expired') {
        if (!isExpired) return false;
      } else if (archiveIssueFilter === 'unparseable') {
        if (!hasDateIssue) return false;
      } else {
        // 'all': show expired events plus any with date parsing issues
        if (!isExpired && !hasDateIssue) return false;
      }

      // City filter
      if (archiveCityFilter !== 'All' && event.cityName?.toLowerCase() !== archiveCityFilter.toLowerCase()) {
        return false;
      }

      // Category filter
      if (archiveCategoryFilter !== 'All' && event.category !== archiveCategoryFilter) {
        return false;
      }

      // Search filter
      if (archiveSearchQuery.trim()) {
        const q = archiveSearchQuery.toLowerCase().trim();
        const matches = 
          event.title?.toLowerCase().includes(q) ||
          event.description?.toLowerCase().includes(q) ||
          event.venue?.toLowerCase().includes(q) ||
          event.location?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [activeDbEvents, archiveIssueFilter, archiveCityFilter, archiveCategoryFilter, archiveSearchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Zap className="w-12 h-12 animate-pulse text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Visual Premium Header with Tab selector */}
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 pb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px]">Metropolitan Intelligence</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight italic">
              {activeTab === 'analytics' ? (
                <>Metro <span className="text-orange-600">Analytics</span></>
              ) : activeTab === 'ads' ? (
                <>Sponsorship <span className="text-orange-600">Manager</span></>
              ) : (
                <>Metro <span className="text-orange-600">Inbox</span></>
              )}
            </h1>
          </div>

          <div className="flex bg-gray-50 p-2 rounded-[1.5rem] border border-gray-100 shrink-0">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-black text-white shadow-xl shadow-black/10' 
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('ads')}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'ads' 
                  ? 'bg-black text-white shadow-xl shadow-black/10' 
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Sponsorships
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'inbox' 
                  ? 'bg-black text-white shadow-xl shadow-black/10' 
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Inbox
              {totalInboxCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-orange-600 text-white rounded-full text-[8px] font-bold">
                  {totalInboxCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div
              key="analytics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {/* Automated Sync Control */}
              <div className="mb-16 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all ${isSyncing ? 'bg-orange-600 animate-spin' : 'bg-black'}`}>
                    <RefreshCw className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Automated Content Sync</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gemini Intelligence Content Sourcing</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {syncStatus && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      {syncStatus.includes('Complete') ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : syncStatus.includes('Failed') ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{syncStatus}</span>
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-orange-600 shadow-xl shadow-black/10'}`}
                  >
                    {isSyncing ? 'Syncing Hubs...' : 'Sync All Hubs'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-black text-white hover:bg-orange-600 shadow-xl shadow-black/10"
                    onClick={() => handleOpenChange(true)}
                  >
                    Upload Event's
                  </motion.button>
                </div>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Page Views</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{stats?.totalViews || 0}</h3>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Active Members</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{userCount}</h3>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Live</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Broadcast Signals</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter italic">{eventCount}</h3>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* City Popularity */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-black/5"
                >
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Hub Popularity</h3>
                  </div>
                  
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityData} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#111827' }}
                          width={100}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f9fafb' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                        />
                        <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={32}>
                          {cityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#EA580C' : '#000000'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Top Signals */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-black/5"
                >
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Trending Signals</h3>
                  </div>

                  <div className="space-y-8">
                    {eventData.length > 0 ? eventData.map((event, i) => (
                      <div key={event.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 group-hover:bg-black group-hover:text-white transition-all italic">
                            0{i + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-tight line-clamp-1">{event.name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signal Intelligence</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-gray-900 italic">{event.count}</span>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Views</p>
                        </div>
                      </div>
                    )) : (
                      <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                        <Activity className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Signals Tracked Yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
                {/* Category Popularity */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <LayoutGrid className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Category Interest</h3>
                  </div>
                  
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {categoryData.slice(0, 4).map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase text-gray-400">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Top Searches */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <Search className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Query Intelligence</h3>
                  </div>

                  <div className="space-y-6">
                    {searchData.length > 0 ? searchData.map((search, i) => (
                      <div key={search.query} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-gray-300">#{i + 1}</span>
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tight italic">"{search.query}"</span>
                        </div>
                        <span className="text-xs font-black text-orange-600">{search.count}</span>
                      </div>
                    )) : (
                      <div className="h-40 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest">No Queries Logged</div>
                    )}
                  </div>
                </motion.div>

                {/* Most Saved */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-black/5"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <Heart className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Vault Favorites</h3>
                  </div>

                  <div className="space-y-6">
                    {saveData.length > 0 ? saveData.map((save, i) => (
                      <div key={save.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tight line-clamp-1 max-w-[120px]">{save.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">{save.count}</span>
                          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                        </div>
                      </div>
                    )) : (
                      <div className="h-40 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest">No Signals Saved</div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* System Health */}
              <div className="mt-16 bg-black text-white p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2" />
                <div className="relative z-10">
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Metropolitan Health</h3>
                  <p className="text-white/50 font-medium max-w-md">The intelligence network is operating at peak efficiency. All regional hubs are synchronized and broadcasting live signals.</p>
                </div>
                <div className="flex items-center gap-12 relative z-10">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Latency</p>
                    <span className="text-2xl font-black italic">12ms</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Uptime</p>
                    <span className="text-2xl font-black italic">99.9%</span>
                  </div>
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <Zap className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'ads' ? (
            <motion.div
              key="ads-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {/* Sponsorships Controls / Actions */}
              <div className="mb-16 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl">
                    <Megaphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Sponsorship Operations</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enforce Zero-Crossover Placements</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOnboardingModalOpen(true)}
                    className="px-6 py-4 bg-white border border-gray-200 hover:border-black text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-orange-600" />
                    Sponsor Onboarding Sheet
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedSummaryAdId(undefined);
                      setIsSummaryModalOpen(true);
                    }}
                    className="px-6 py-4 bg-orange-600 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Monthly Sponsor Report
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSeedDefaultAds}
                    className="px-8 py-4 bg-black text-white hover:bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/10 transition-all cursor-pointer"
                  >
                    Seed Default Ads
                  </motion.button>
                </div>
              </div>

              {/* Grid: Form (Left) & Active Promotions (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* Form (Left - Column span 4) */}
                <div className="lg:col-span-5 bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                      <PlusCircle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Publish Sponsorship Signal</h3>
                  </div>

                  <form onSubmit={handlePublishAd} className="space-y-6">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Target Hub / City *</label>
                      <select
                        value={newAdCityId}
                        onChange={(e) => setNewAdCityId(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 focus:outline-none focus:border-black transition-colors"
                      >
                        <option value="general">General / Regional Hub</option>
                        <option value="tulsa">Tulsa Hub</option>
                        <option value="okc">Oklahoma City Hub</option>
                        <option value="dallas">Dallas Hub</option>
                        <option value="houston">Houston Hub</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Sponsorship Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cain's Ballroom"
                        value={newAdTitle}
                        onChange={(e) => setNewAdTitle(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Badge Tag *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tulsa Legend"
                          value={newAdTag}
                          onChange={(e) => setNewAdTag(e.target.value)}
                          className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">CTA Button Text *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Buy Tickets"
                          value={newAdCta}
                          onChange={(e) => setNewAdCta(e.target.value)}
                          className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Description *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="e.g. The historic home of Bob Wills. Experience the legendary..."
                        value={newAdDescription}
                        onChange={(e) => setNewAdDescription(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Target / Destination URL *</label>
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={newAdUrl}
                        onChange={(e) => setNewAdUrl(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                      />
                      {newAdUrl.trim() && (
                        <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-orange-600">
                            <Sparkles className="w-3 h-3" />
                            Auto-Appended GA4 Tracking Preview
                          </div>
                          <p className="font-mono text-[8.5px] text-gray-700 break-all select-all bg-white p-2 rounded-lg border border-gray-100">
                            {buildTrackedUrl(newAdUrl, {
                              source: 'inside_the_metro',
                              medium: newAdTag ? `sponsor_${newAdTag.toLowerCase().replace(/\s+/g, '_')}` : 'sponsor_placement',
                              campaign: newAdTitle || 'sponsor_campaign',
                              content: newAdCityId === 'all' ? 'metro_hub' : newAdCityId
                            })}
                          </p>
                          <p className="text-[7.5px] text-gray-400 font-bold uppercase tracking-wider">
                            UTM parameters are automatically appended on click to ensure Google Analytics 4 attribution.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Cover Image *</label>
                      <div 
                        onClick={() => !newAdImage && !isCompressing && fileInputRef.current?.click()}
                        className={`relative h-40 w-full rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${newAdImage ? 'border-transparent' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                      >
                        {isCompressing ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Optimizing Ad Image...</p>
                          </div>
                        ) : newAdImage ? (
                          <>
                            <img src={newAdImage} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-all flex items-center justify-center group" />
                            <button 
                              type="button" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setNewAdImage(''); 
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }} 
                              className="absolute top-2 right-2 p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-red-600 transition-all z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-10 h-10 bg-gray-100 text-black rounded-xl flex items-center justify-center mx-auto mb-2">
                              <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Click to Upload Cover Image</p>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1">Or paste a URL below</p>
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      </div>

                      {/* Paste URL input as alternative/fallback */}
                      {!newAdImage && (
                        <input
                          type="url"
                          placeholder="Or paste an image URL: https://..."
                          value={newAdImage}
                          onChange={(e) => setNewAdImage(e.target.value)}
                          className="w-full px-5 py-4 mt-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishingAd}
                      className="w-full py-5 bg-black text-white hover:bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg"
                    >
                      {isPublishingAd ? "Publishing Sponsorship..." : "Publish Sponsorship Signal"}
                    </button>
                  </form>
                </div>

                {/* Placements List (Right - Column span 8) */}
                <div className="lg:col-span-7 space-y-8">
                  
                  {/* City targeting filter controls */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-6 gap-4 flex-wrap">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Active Signals ({filteredAds.length})</h3>
                    <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 overflow-x-auto scrollbar-hide">
                      {['all', 'general', 'tulsa', 'okc', 'dallas', 'houston'].map(city => (
                        <button
                          key={city}
                          onClick={() => setSelectedAdCityFilter(city)}
                          className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                            selectedAdCityFilter === city 
                              ? 'bg-black text-white shadow-md' 
                              : 'text-gray-400 hover:text-black'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active ads list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                      {filteredAds.map((ad) => {
                        const ctr = ad.impressions > 0 
                          ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                          : '0.0';

                        return (
                          <motion.div
                            key={ad.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden flex flex-col relative group"
                          >
                            {/* Target Hub Indicator */}
                            <div className="absolute top-4 left-4 z-10 flex gap-2">
                              <span className="px-3 py-1.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-md border border-white/10">
                                {ad.cityId.toUpperCase()}
                              </span>
                              <span className="px-3 py-1.5 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-md">
                                {ad.tag}
                              </span>
                            </div>

                            <button 
                              onClick={() => handleDeleteAd(ad.id)}
                              className="absolute top-4 right-4 z-10 p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-md transition-colors"
                              title="Terminate Sponsorship Signal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
                              <img 
                                src={ad.image} 
                                alt={ad.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              <div className="absolute bottom-4 left-6 right-6">
                                <h4 className="text-white font-black text-lg uppercase tracking-tight line-clamp-1">{ad.title}</h4>
                                <span className="text-white/60 text-[8px] font-black uppercase tracking-widest">{ad.cta}</span>
                              </div>
                            </div>

                            <div className="p-6 flex-grow flex flex-col justify-between">
                              <p className="text-gray-400 text-[11px] leading-relaxed mb-6 line-clamp-2">{ad.description}</p>
                              
                              {/* Live Performance stats */}
                              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-auto">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                    <Eye className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Views</span>
                                  </div>
                                  <span className="font-black text-sm text-gray-900">{ad.impressions}</span>
                                </div>
                                <div className="text-center border-x border-gray-200">
                                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                    <MousePointerClick className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Clicks</span>
                                  </div>
                                  <span className="font-black text-sm text-gray-900">{ad.clicks}</span>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                    <Percent className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">CTR</span>
                                  </div>
                                  <span className="font-black text-sm text-orange-600">{ctr}%</span>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSummaryAdId(ad.id);
                                    setIsSummaryModalOpen(true);
                                  }}
                                  className="flex-1 py-2.5 px-3 bg-gray-900 hover:bg-orange-600 text-white rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  Sponsor Scorecard
                                </button>
                                <a
                                  href={buildTrackedUrl(ad.url, {
                                    source: 'inside_the_metro',
                                    medium: 'sponsor_admin_test',
                                    campaign: ad.title,
                                    content: ad.cityId
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black rounded-xl transition-colors cursor-pointer"
                                  title="Test Live GA4 Tagged Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {filteredAds.length === 0 && (
                      <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
                        <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4 opacity-40" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">No sponsorship signals found</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Select another targeted region or seed default partners.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          ) : activeTab === 'inbox' ? (
            <motion.div
              key="inbox-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 animate-fade-in"
            >
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100">
                {/* Inbox Sub-Tabs */}
                <div className="flex border-b border-gray-100 pb-6 mb-8 gap-8">
                  <button
                    onClick={() => setInboxSubTab('sponsorships')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      inboxSubTab === 'sponsorships'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                  >
                    Sponsorship Requests
                    {pendingSponsorshipsCount > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-605 rounded-full text-[8px] font-bold">
                        {pendingSponsorshipsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setInboxSubTab('uncategorized')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      inboxSubTab === 'uncategorized'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                  >
                    Database Events
                    {uncategorizedCount > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-605 rounded-full text-[8px] font-bold">
                        {uncategorizedCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setInboxSubTab('duplicates')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      inboxSubTab === 'duplicates'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-orange-600" />
                    Duplicate Protocol
                    {duplicateClusters.length > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[8px] font-bold animate-pulse">
                        {duplicateClusters.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setInboxSubTab('archive')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      inboxSubTab === 'archive'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-400 hover:text-black'
                    }`}
                  >
                    <FolderArchive className="w-4 h-4 text-amber-600" />
                    Past Events Archive
                    {expiredEvents.length > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[8px] font-bold">
                        {expiredEvents.length}
                      </span>
                    )}
                  </button>
                </div>

                {inboxSubTab === 'sponsorships' ? (
                  <>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-8">
                      Pending Sponsorship Requests ({pendingSponsorshipsCount})
                    </h3>

                    {submissionsLoading ? (
                      <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving partner signals...</p>
                      </div>
                    ) : pendingSponsorshipsCount === 0 ? (
                      <div className="py-24 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Inbox is empty</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">All organizer requests have been processed</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {submissions.filter(s => s.status === 'pending').map((sub) => (
                          <div key={sub.id} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 block mb-1">Submitted by</span>
                                  <h5 className="text-xs font-black text-gray-900 uppercase">{sub.userName || 'Organizer'}</h5>
                                  <p className="text-[9px] text-gray-400 font-bold tracking-widest lowercase mt-0.5">{sub.userEmail}</p>
                                </div>
                                <span className="px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                                  Pending Review
                                </span>
                              </div>

                              {sub.image && (
                                <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden border border-gray-200 bg-white">
                                  <img src={sub.image} alt={sub.title} className="w-full h-full object-cover" />
                                </div>
                              )}

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{sub.title}</h4>
                                  <span className="text-[9px] font-black text-white bg-black px-3 py-1 rounded-full uppercase tracking-widest">{sub.cityId === 'general' ? 'All Hubs' : sub.cityId}</span>
                                </div>
                                <p className="text-[10px] text-gray-550 font-bold uppercase tracking-widest mt-1">{sub.tag || 'Sponsorship'}</p>
                                <p className="text-xs text-gray-500 leading-relaxed mt-2">{sub.description}</p>
                              </div>

                              <div className="p-4 bg-white rounded-xl border border-gray-100 space-y-2 text-left">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block">Target Action</span>
                                <div className="flex justify-between items-center gap-4">
                                  <a href={sub.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-black hover:text-orange-600 underline uppercase tracking-widest truncate">
                                    {sub.url}
                                  </a>
                                  <span className="bg-gray-100 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-gray-700 shrink-0">
                                    {sub.cta}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50">
                              <button
                                onClick={() => handleDeclineSponsorship(sub)}
                                className="py-4 border-2 border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleApproveSponsorship(sub)}
                                className="py-4 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-black/10"
                              >
                                Approve & Publish
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : inboxSubTab === 'uncategorized' ? (
                  <>
                    <div className="space-y-6 mb-8 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tight">
                            {queueCategoryFilter === 'Undefined' 
                              ? `Categorization Queue (${uncategorizedCount})` 
                              : queueCategoryFilter === 'All'
                                ? `All Database Events (${filteredQueueEvents.length})`
                                : `${queueCategoryFilter} Events (${filteredQueueEvents.length})`}
                          </h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {queueCategoryFilter === 'Undefined'
                              ? 'Assign proper categories, edit details, or delete undefined / crawl-synced events'
                              : 'View, edit details, recategorize, or delete events across your database'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQueueEvent(null);
                              setIsEditModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-black/10 flex items-center gap-2"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Add Event
                          </button>

                          {/* Duplicate Protocol Shortcut Button */}
                          <button
                            type="button"
                            onClick={() => setInboxSubTab('duplicates')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                              duplicateClusters.length > 0
                                ? 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                            }`}
                            title="Open Duplicate Events Protocol"
                          >
                            <Layers className="w-4 h-4 text-orange-600" />
                            Duplicate Protocol {duplicateClusters.length > 0 && `(${duplicateClusters.length})`}
                          </button>

                          {/* Archive Folder Shortcut Button */}
                          <button
                            type="button"
                            onClick={() => setInboxSubTab('archive')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                              expiredEvents.length > 0
                                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                            }`}
                            title="Open Past Events Archive folder"
                          >
                            <FolderArchive className="w-4 h-4 text-amber-600" />
                            Archive Folder {expiredEvents.length > 0 && `(${expiredEvents.length})`}
                          </button>

                          {/* Purge Past Events Button */}
                          <button
                            type="button"
                            onClick={() => setIsPurgeModalOpen(true)}
                            disabled={expiredEvents.length === 0 || isPurging}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                              expiredEvents.length > 0
                                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600'
                                : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                            }`}
                            title={expiredEvents.length > 0 ? `Purge ${expiredEvents.length} expired events from database` : 'No past events to purge'}
                          >
                            <Trash2 className="w-4 h-4" />
                            Purge Past {expiredEvents.length > 0 && `(${expiredEvents.length})`}
                          </button>

                          {filteredQueueEvents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedQueueIds.length === filteredQueueEvents.length) {
                                  setSelectedQueueIds([]);
                                } else {
                                  setSelectedQueueIds(filteredQueueEvents.map(e => e.id));
                                }
                              }}
                              className="px-4 py-2.5 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              {selectedQueueIds.length === filteredQueueEvents.length && filteredQueueEvents.length > 0 ? (
                                <>
                                  <CheckSquare className="w-4 h-4 text-orange-600" />
                                  Deselect All ({filteredQueueEvents.length})
                                </>
                              ) : (
                                <>
                                  <Square className="w-4 h-4 text-gray-400" />
                                  Select All Filtered ({filteredQueueEvents.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expired Events Notification Banner */}
                      {expiredEvents.length > 0 && !isDismissedPurgeBanner && (
                        <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                              <FolderArchive className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                {expiredEvents.length} Past Event{expiredEvents.length > 1 ? 's' : ''} Grouped in Archive Folder
                              </p>
                              <p className="text-[11px] text-amber-800 font-medium">
                                Events whose scheduled date/time has passed are kept in your Past Events Archive folder so active feeds remain clean.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInboxSubTab('archive')}
                              className="px-4 py-2 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                              Open Archive Folder ({expiredEvents.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsPurgeModalOpen(true)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Purge Now
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleAutoPurge}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                                autoPurgeEnabled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {autoPurgeEnabled ? '✓ Auto-Sweep Active' : 'Enable Auto-Sweep'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsDismissedPurgeBanner(true)}
                              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                              title="Dismiss Banner"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Duplicate Events Alert Banner */}
                      {duplicateClusters.length > 0 && !isDismissedDuplicateBanner && (
                        <div className="p-4 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border border-red-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-red-950 uppercase tracking-wide">
                                Duplicate Protocol: {duplicateClusters.length} Duplicate Event Cluster{duplicateClusters.length > 1 ? 's' : ''} Detected ({duplicateClusters.reduce((acc, c) => acc + (c.events.length - 1), 0)} Redundant Signals)
                              </p>
                              <p className="text-[11px] text-red-800 font-medium">
                                Redundant or identical event signals detected across your database. Review differences, edit details, or deduplicate with one click.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInboxSubTab('duplicates')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Review in Protocol ({duplicateClusters.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsDismissedDuplicateBanner(true)}
                              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                              title="Dismiss Banner"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Filter & Search Toolbar */}
                      <div className="flex flex-col lg:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={queueSearchQuery}
                            onChange={e => setQueueSearchQuery(e.target.value)}
                            placeholder="Search events by title, venue, or description..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-400"
                          />
                          {queueSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setQueueSearchQuery('')}
                              className="absolute right-3 top-3 text-gray-400 hover:text-black cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
                          {/* Category Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={queueCategoryFilter}
                              onChange={e => {
                                setQueueCategoryFilter(e.target.value);
                                setSelectedQueueIds([]);
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="Undefined">⚠️ Uncategorized Queue ({uncategorizedCount})</option>
                              <option value="All">All Database Events ({activeDbEvents.length})</option>
                              {VALID_CATEGORIES.map(cat => {
                                const count = activeDbEvents.filter(e => e.category === cat).length;
                                return (
                                  <option key={cat} value={cat}>{cat} ({count})</option>
                                );
                              })}
                            </select>
                          </div>

                          {/* City Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={queueCityFilter}
                              onChange={e => setQueueCityFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="All">All Cities</option>
                              {unassignedCityCount > 0 && (
                                <option value="Unassigned">⚠️ No City Assigned ({unassignedCityCount})</option>
                              )}
                              {CITIES.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Source / Author Filter */}
                          <div className="relative w-full sm:w-auto">
                            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={queueSourceFilter}
                              onChange={e => {
                                setQueueSourceFilter(e.target.value as any);
                                setSelectedQueueIds([]);
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="all">All Sources</option>
                              <option value="my-admin">👤 Posted by My Account ({activeDbEvents.filter(e => user?.id && e.userId === user.id).length})</option>
                              <option value="crawled">🤖 Crawled / System Signals</option>
                              <option value="users">👥 Other User Submissions</option>
                            </select>
                          </div>

                          {/* Date Range Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={queueDateFilter}
                              onChange={e => {
                                setQueueDateFilter(e.target.value as any);
                                setSelectedQueueIds([]);
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="all">All Dates</option>
                              <option value="today">Today</option>
                              <option value="weekend">This Weekend</option>
                              <option value="week">Next 7 Days</option>
                              <option value="month">Next 30 Days</option>
                              <option value="past">Past Events</option>
                              <option value="custom">📅 Custom Date Range...</option>
                            </select>
                          </div>

                          {/* Auto-Sweep Past Events Toggle */}
                          <label 
                            className={`flex items-center gap-2 cursor-pointer select-none px-3.5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                              autoPurgeEnabled 
                                ? 'bg-orange-50/80 border-orange-200 text-orange-800' 
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'
                            }`}
                            title="When enabled, expired events are automatically purged from the database when an admin loads the dashboard"
                          >
                            <input
                              type="checkbox"
                              checked={autoPurgeEnabled}
                              onChange={handleToggleAutoPurge}
                              className="w-3.5 h-3.5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                            />
                            <span>Auto-Sweep Past</span>
                          </label>
                        </div>
                      </div>

                      {/* Admin Custom Date Range Bar */}
                      {queueDateFilter === 'custom' && (
                        <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-orange-600" />
                              Custom Date Window:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={queueCustomStartDate}
                                onChange={e => {
                                  setQueueCustomStartDate(e.target.value);
                                  setSelectedQueueIds([]);
                                }}
                                className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-black shadow-sm"
                                placeholder="Start Date"
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">to</span>
                              <input
                                type="date"
                                value={queueCustomEndDate}
                                onChange={e => {
                                  setQueueCustomEndDate(e.target.value);
                                  setSelectedQueueIds([]);
                                }}
                                className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-black shadow-sm"
                                placeholder="End Date"
                              />
                            </div>
                            {(queueCustomStartDate || queueCustomEndDate) && (
                              <span className="px-3 py-1 bg-white border border-orange-200 text-orange-700 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                                {queueCustomStartDate || 'Any'} → {queueCustomEndDate || 'Any'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setQueueCustomStartDate('');
                              setQueueCustomEndDate('');
                              setQueueDateFilter('all');
                              setSelectedQueueIds([]);
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black underline cursor-pointer"
                          >
                            Reset Date Filter
                          </button>
                        </div>
                      )}

                      {/* Batch Actions Bar */}
                      {selectedQueueIds.length > 0 && (
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-wider text-orange-900">
                              {selectedQueueIds.length} event{selectedQueueIds.length > 1 ? 's' : ''} selected
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <select
                                value={batchCategory}
                                onChange={e => setBatchCategory(e.target.value)}
                                className="bg-white border border-gray-300 rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-black"
                              >
                                {VALID_CATEGORIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={isBatchProcessing}
                                onClick={handleBatchCategorize}
                                className="px-4 py-2 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isBatchProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Categorize All
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={isBatchProcessing}
                              onClick={handleBatchDelete}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isBatchProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Delete Selected
                            </button>

                            <button
                              type="button"
                              disabled={isBatchProcessing}
                              onClick={() => setSelectedQueueIds([])}
                              className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {queueCategoryFilter === 'Undefined' && uncategorizedCount === 0 ? (
                      <div className="py-24 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Queue is Clear</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1 max-w-md mx-auto mb-6">
                          All {activeDbEvents.length} events currently in the database have assigned categories. Switch to "All Database Events" to edit or delete any existing event.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQueueCategoryFilter('All')}
                            className="px-5 py-2.5 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md"
                          >
                            View All Database Events ({activeDbEvents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQueueEvent(null);
                              setIsEditModalOpen(true);
                            }}
                            className="px-5 py-2.5 border-2 border-black hover:bg-black hover:text-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                          >
                            + Add New Event
                          </button>
                        </div>
                      </div>
                    ) : filteredQueueEvents.length === 0 ? (
                      <div className="py-16 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-500">No matching events found</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          Try adjusting your search query, city, or category filter
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredQueueEvents.map((event) => (
                          <CategorizationCard 
                            key={event.id} 
                            event={event}
                            isSelected={selectedQueueIds.includes(event.id)}
                            onToggleSelect={handleToggleSelectQueue}
                            onEdit={handleOpenEditQueueModal}
                            onDelete={handleDeleteQueueEvent}
                            isDuplicateFlagged={duplicateEventIdSet.has(event.id)}
                            onOpenDuplicateProtocol={() => setInboxSubTab('duplicates')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : inboxSubTab === 'duplicates' ? (
                  <>
                    <div className="space-y-6 mb-8 text-left">
                      {/* Duplicate Protocol Header Banner */}
                      <div className="p-6 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent rounded-[2rem] border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                            <Layers className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                                Duplicate Events Protocol ({filteredDuplicateClusters.length})
                              </h3>
                              <span className="px-3 py-0.5 bg-red-100 text-red-900 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Automated Detection
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1 max-w-2xl">
                              Automated protocol requiring matches across all 6 verified conditions: Date, Location, Price, Title, City, and Venue. Review differences side-by-side, edit details, delete redundant entries, or merge into the recommended primary record.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {duplicateClusters.some(c => c.matchType === 'exact') && (
                            <button
                              type="button"
                              onClick={handleBatchResolveExactDuplicates}
                              disabled={isResolvingDuplicates}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                              title="Auto-resolve all exact duplicates: keep recommended primary and remove redundant copies"
                            >
                              <CheckCheck className="w-4 h-4" />
                              Auto-Resolve Exact Matches ({duplicateClusters.filter(c => c.matchType === 'exact').length})
                            </button>
                          )}
                          {dismissedDuplicateClusterKeys.size > 0 && (
                            <button
                              type="button"
                              onClick={handleResetDismissedDuplicates}
                              disabled={isResolvingDuplicates}
                              className="px-4 py-2.5 bg-white border border-gray-200 hover:border-black text-gray-700 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                              title="Reset dismissed duplicate clusters"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset Dismissed ({dismissedDuplicateClusterKeys.size})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Duplicate Protocol Metrics Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-left">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Duplicate Groups</span>
                          <span className="text-2xl font-black text-gray-900 tracking-tight">{duplicateClusters.length}</span>
                          <span className="text-[10px] text-gray-400 block font-medium mt-0.5">Flagged clusters</span>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-left">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Redundant Signals</span>
                          <span className="text-2xl font-black text-red-600 tracking-tight">
                            {duplicateClusters.reduce((acc, c) => acc + (c.events.length - 1), 0)}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium mt-0.5">Removable copies</span>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-left">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Exact Matches</span>
                          <span className="text-2xl font-black text-orange-600 tracking-tight">
                            {duplicateClusters.filter(c => c.matchType === 'exact').length}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium mt-0.5">Safe 1-click resolve</span>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm text-left">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">High Disparity</span>
                          <span className="text-2xl font-black text-amber-600 tracking-tight">
                            {duplicateClusters.filter(c => c.totalScoreDifference > 20).length}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium mt-0.5">Unequal completeness</span>
                        </div>
                      </div>

                      {/* Filter & Search Toolbar */}
                      <div className="flex flex-col lg:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={duplicateSearchQuery}
                            onChange={e => setDuplicateSearchQuery(e.target.value)}
                            placeholder="Search duplicate events by title, venue, or event ID..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-400"
                          />
                          {duplicateSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setDuplicateSearchQuery('')}
                              className="absolute right-3 top-3 text-gray-400 hover:text-black cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
                          {/* Match Type Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={duplicateMatchTypeFilter}
                              onChange={e => setDuplicateMatchTypeFilter(e.target.value as any)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="all">All Match Types ({duplicateClusters.length})</option>
                              <option value="exact">Exact: Same Title, Date & City ({duplicateClusters.filter(c => c.matchType === 'exact').length})</option>
                              <option value="title_date">Same Title & Scheduled Date ({duplicateClusters.filter(c => c.matchType === 'title_date').length})</option>
                              <option value="title_city">Same Title in Same City ({duplicateClusters.filter(c => c.matchType === 'title_city').length})</option>
                              <option value="fuzzy">High Title Similarity ({duplicateClusters.filter(c => c.matchType === 'fuzzy').length})</option>
                            </select>
                          </div>

                          {/* City Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={duplicateCityFilter}
                              onChange={e => setDuplicateCityFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="All">All Cities</option>
                              {CITIES.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duplicate Clusters List */}
                    {duplicateClusters.length === 0 ? (
                      <div className="py-24 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Protocol Status: Clean & Deduplicated</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1 max-w-md mx-auto mb-6">
                          No duplicate or identical events detected across the database. Every signal in the active feed is distinct and unique.
                        </p>
                        <button
                          type="button"
                          onClick={() => setInboxSubTab('uncategorized')}
                          className="px-5 py-2.5 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                          View All Database Events
                        </button>
                      </div>
                    ) : filteredDuplicateClusters.length === 0 ? (
                      <div className="py-16 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-500">No matching duplicate groups</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          Try adjusting your search query, city, or match type filter
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {filteredDuplicateClusters.map((cluster) => {
                          return (
                            <div 
                              key={cluster.id}
                              className="p-6 sm:p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-200/80 space-y-6 text-left shadow-xs"
                            >
                              {/* Cluster Group Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                      cluster.matchType === 'exact'
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : cluster.matchType === 'title_date'
                                          ? 'bg-orange-50 text-orange-800 border-orange-200'
                                          : cluster.matchType === 'title_city'
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : 'bg-blue-50 text-blue-800 border-blue-200'
                                    }`}>
                                      {cluster.matchReason}
                                    </span>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                      • {cluster.events.length} Identical Signals
                                    </span>
                                  </div>
                                  <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                    "{cluster.events[0].title}"
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDismissDuplicateCluster(cluster.clusterKey)}
                                    className="px-3.5 py-2 bg-white border border-gray-200 hover:border-black text-gray-600 hover:text-black font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-2xs"
                                    title="Mark these events as distinct (removes from duplicate protocol)"
                                  >
                                    Mark Distinct (Dismiss)
                                  </button>
                                </div>
                              </div>

                              {/* Cluster Comparative Cards Grid */}
                              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(cluster.events.length, 3)} gap-6`}>
                                {cluster.events.map((event) => {
                                  const isPrimary = event.id === cluster.recommendedKeepId;
                                  const score = calculateCompletenessScore(event);

                                  return (
                                    <div
                                      key={event.id}
                                      className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between space-y-4 relative text-left shadow-sm ${
                                        isPrimary
                                          ? 'bg-white border-2 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                                          : 'bg-white border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      {/* Top Status Badge */}
                                      <div className="flex items-start justify-between gap-3">
                                        {isPrimary ? (
                                          <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xs">
                                            <Star className="w-3 h-3 fill-white" />
                                            Recommended Primary ({score}% Complete)
                                          </span>
                                        ) : (
                                          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <CopyCheck className="w-3 h-3 text-amber-600" />
                                            Duplicate Copy ({score}% Complete)
                                          </span>
                                        )}

                                        {event.cityName && event.cityName.toLowerCase() !== 'unknown' ? (
                                          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                                            {event.cityName}
                                          </span>
                                        ) : (
                                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                                            No City Set
                                          </span>
                                        )}
                                      </div>

                                      {/* Image Thumbnail & Details */}
                                      <div className="space-y-3">
                                        {event.imageUrl ? (
                                          <div className="w-full h-32 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                                            <img
                                              src={event.imageUrl}
                                              alt={event.title}
                                              className="w-full h-full object-cover"
                                              onError={e => (e.currentTarget.style.display = 'none')}
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-full h-24 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                            No Image Provided
                                          </div>
                                        )}

                                        <div>
                                          <h5 className="text-sm font-black text-gray-900 uppercase tracking-tight line-clamp-2" title={event.title}>
                                            {event.title}
                                          </h5>
                                          
                                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <span>📅 {event.date || 'Date TBD'}</span>
                                            {event.time && <span>• ⏰ {event.time}</span>}
                                            {event.cityName && <span className="text-orange-600 font-black">• 🏙️ {event.cityName}</span>}
                                            {event.venue && <span className="text-gray-700">• 📍 {event.venue}</span>}
                                            {event.location && <span className="text-gray-500">• 🗺️ {event.location}</span>}
                                            {event.price && <span className="text-emerald-600 font-black">• 🎟️ {event.price}</span>}
                                          </div>
                                        </div>

                                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                          {event.description || 'No description provided.'}
                                        </p>

                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                          <span>Source: {event.userCreated ? 'User Upload' : event.isLive ? 'Google Crawl' : 'Admin'}</span>
                                          <span className="font-mono text-[8px] text-gray-400">ID: {event.id.slice(0, 8)}...</span>
                                        </div>
                                      </div>

                                      {/* Action Area: Keep, Edit, or Delete */}
                                      <div className="space-y-2 pt-3 border-t border-gray-100">
                                        <button
                                          type="button"
                                          disabled={isResolvingDuplicates}
                                          onClick={() => handleKeepPrimary(cluster, event.id)}
                                          className={`w-full py-2.5 px-4 font-black rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 ${
                                            isPrimary
                                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                              : 'bg-black hover:bg-orange-600 text-white'
                                          }`}
                                          title="Keep this event as the primary source of truth, merge missing data from copies, and delete other duplicates"
                                        >
                                          <CheckCheck className="w-3.5 h-3.5" />
                                          {isPrimary ? 'Keep As Primary & Remove Others' : 'Select As Primary & Remove Others'}
                                        </button>

                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            disabled={isResolvingDuplicates}
                                            onClick={() => handleOpenEditQueueModal(event)}
                                            className="py-2.5 px-3 border border-gray-200 hover:border-black hover:bg-gray-50 text-gray-800 font-black rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                            title="Edit this event record"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Edit Event
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isResolvingDuplicates}
                                            onClick={() => {
                                              if (window.confirm(`Permanently delete this specific duplicate entry "${event.title}" (${event.id})?`)) {
                                                handleDeleteQueueEvent(event.id);
                                              }
                                            }}
                                            className="py-2.5 px-3 border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-black rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                            title="Delete this redundant duplicate event"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete Copy
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-6 mb-8 text-left">
                      {/* Archive Header Banner */}
                      <div className="p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-[2rem] border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                            <FolderArchive className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                                Past Events Archive ({filteredArchiveEvents.length})
                              </h3>
                              <span className="px-3 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Folder
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1 max-w-xl">
                              Events whose scheduled date or time has passed and were not auto-deleted. Safely archived here so they do not clutter your active feeds. Reschedule to reactivate or purge in bulk.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {/* Purge Folder Button */}
                          <button
                            type="button"
                            onClick={() => setIsPurgeModalOpen(true)}
                            disabled={expiredEvents.length === 0 || isPurging}
                            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                              expiredEvents.length > 0
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 shadow-md'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Purge Expired Events {expiredEvents.length > 0 && `(${expiredEvents.length})`}
                          </button>

                          {/* Auto-Sweep Toggle */}
                          <label 
                            className={`flex items-center gap-2 cursor-pointer select-none px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                              autoPurgeEnabled 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="When enabled, expired events are automatically purged from the database when an admin loads the dashboard"
                          >
                            <input
                              type="checkbox"
                              checked={autoPurgeEnabled}
                              onChange={handleToggleAutoPurge}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>{autoPurgeEnabled ? '✓ Auto-Sweep Active' : 'Enable Auto-Sweep'}</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => setInboxSubTab('uncategorized')}
                            className="px-4 py-3 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors cursor-pointer bg-white"
                          >
                            Back to Active Queue
                          </button>
                        </div>
                      </div>

                      {/* Filter & Search Toolbar */}
                      <div className="flex flex-col lg:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={archiveSearchQuery}
                            onChange={e => setArchiveSearchQuery(e.target.value)}
                            placeholder="Search past events in archive by title, venue, or details..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-400"
                          />
                          {archiveSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setArchiveSearchQuery('')}
                              className="absolute right-3 top-3 text-gray-400 hover:text-black cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
                          {/* Issue / Status Filter */}
                          <div className="relative w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <select
                              value={archiveIssueFilter}
                              onChange={e => {
                                setArchiveIssueFilter(e.target.value as any);
                                setSelectedArchiveIds([]);
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="all">All Archive Records ({expiredEvents.length + unparseableCount})</option>
                              <option value="expired">🕒 Confirmed Expired ({expiredEvents.length})</option>
                              <option value="unparseable">⚠️ Date Unclear / Needs Review ({unparseableCount})</option>
                            </select>
                          </div>

                          {/* City Filter */}
                          <div className="relative w-full sm:w-auto">
                            <select
                              value={archiveCityFilter}
                              onChange={e => setArchiveCityFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="All">All Cities</option>
                              {CITIES.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Category Filter */}
                          <div className="relative w-full sm:w-auto">
                            <select
                              value={archiveCategoryFilter}
                              onChange={e => setArchiveCategoryFilter(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all"
                            >
                              <option value="All">All Categories</option>
                              <option value="Undefined">Undefined</option>
                              {VALID_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          {/* Select All */}
                          {filteredArchiveEvents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedArchiveIds.length === filteredArchiveEvents.length) {
                                  setSelectedArchiveIds([]);
                                } else {
                                  setSelectedArchiveIds(filteredArchiveEvents.map(e => e.id));
                                }
                              }}
                              className="px-4 py-2.5 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors flex items-center gap-2 cursor-pointer bg-white"
                            >
                              {selectedArchiveIds.length === filteredArchiveEvents.length && filteredArchiveEvents.length > 0 ? (
                                <>
                                  <CheckSquare className="w-4 h-4 text-orange-600" />
                                  Deselect All ({filteredArchiveEvents.length})
                                </>
                              ) : (
                                <>
                                  <Square className="w-4 h-4 text-gray-400" />
                                  Select All ({filteredArchiveEvents.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Batch Actions Bar for Archive */}
                      {selectedArchiveIds.length > 0 && (
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-wider text-red-900">
                              {selectedArchiveIds.length} archived event{selectedArchiveIds.length > 1 ? 's' : ''} selected
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={isBatchProcessing}
                              onClick={handleBatchDeleteArchive}
                              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isBatchProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Permanently Delete Selected ({selectedArchiveIds.length})
                            </button>

                            <button
                              type="button"
                              disabled={isBatchProcessing}
                              onClick={() => setSelectedArchiveIds([])}
                              className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {filteredArchiveEvents.length === 0 ? (
                      <div className="py-24 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <FolderArchive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">
                          {archiveSearchQuery || archiveCityFilter !== 'All' || archiveCategoryFilter !== 'All'
                            ? 'No matching archived events'
                            : 'Archive Folder is Clean'}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-1 max-w-md mx-auto mb-6">
                          {archiveSearchQuery || archiveCityFilter !== 'All' || archiveCategoryFilter !== 'All'
                            ? 'Try clearing your search query or city filters.'
                            : 'There are currently no expired or past events stored in your database. Any events that pass their scheduled date and time will automatically be grouped here if auto-delete does not delete them.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setInboxSubTab('uncategorized')}
                          className="px-5 py-2.5 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                          View Active Database Events
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArchiveEvents.map((event) => (
                          <CategorizationCard 
                            key={event.id} 
                            event={event}
                            isArchiveView={true}
                            isSelected={selectedArchiveIds.includes(event.id)}
                            onToggleSelect={handleToggleSelectArchive}
                            onEdit={handleOpenEditQueueModal}
                            onDelete={handleDeleteQueueEvent}
                            isDuplicateFlagged={duplicateEventIdSet.has(event.id)}
                            onOpenDuplicateProtocol={() => setInboxSubTab('duplicates')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Upload Events Dialog */}
        <EventsUploadDialog
          eventsUploadDialogOpen={isOpen}
          setEventsUploadDialogOpen={handleOpenChange}
          isProcessing={isProcessing}
          uploadSuccess={uploadSuccess}
          onFileSelect={handleFileSelect}
          containerVariants={containerVariants}
        />

        {/* Edit Queue Event Dialog */}
        <EditQueueEventModal
          isOpen={isEditModalOpen}
          userId={user.id}
          allEvents={activeDbEvents}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingQueueEvent(null);
          }}
          event={editingQueueEvent}
          onDeleteSuccess={(deletedId) => {
            setOptimisticDeletedIds(prev => new Set(prev).add(deletedId));
            setSelectedQueueIds(prev => prev.filter(id => id !== deletedId));
          }}
        />

        {/* Purge Expired Events Confirmation Modal */}
        {isPurgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-scale-in">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">Purge Expired Events</h3>
                    <p className="text-xs text-gray-500 font-medium">Permanently remove past events from Firestore</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  disabled={isPurging}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl text-xs text-red-800">
                  <p className="font-bold">
                    Are you sure you want to permanently delete <span className="font-black text-red-950">{expiredEvents.length} expired event{expiredEvents.length > 1 ? 's' : ''}</span>?
                  </p>
                  <p className="text-[11px] text-red-600 mt-1">
                    These events have passed their scheduled date and time. Deleting them clears them from Firestore and all feeds. This action cannot be undone.
                  </p>
                </div>

                {/* Preview List */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                    <span>Events to be deleted ({expiredEvents.length})</span>
                    <span>Scheduled Date</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-2xl bg-gray-50/50">
                    {expiredEvents.slice(0, 50).map((ev) => (
                      <div key={ev.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{ev.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{ev.venue || ev.cityName || 'No venue specified'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">
                            {ev.date || 'No Date'} {ev.time ? `• ${ev.time}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                    {expiredEvents.length > 50 && (
                      <div className="p-2 text-center text-[10px] font-bold text-gray-400">
                        + {expiredEvents.length - 50} more past events
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  disabled={isPurging}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-white text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurgePastEvents}
                  disabled={isPurging}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isPurging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Purging {expiredEvents.length} Events...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirm & Purge All ({expiredEvents.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sponsor Onboarding Sheet Modal */}
        <SponsorOnboardingModal
          isOpen={isOnboardingModalOpen}
          onClose={() => setIsOnboardingModalOpen(false)}
        />

        {/* Monthly Sponsor Summary / Scorecard Modal */}
        <MonthlySponsorSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          ads={ads}
          initialSelectedAdId={selectedSummaryAdId}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;

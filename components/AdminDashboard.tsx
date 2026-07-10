import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  TrendingUp, Users, Zap, MapPin, Globe, Clock, ArrowUpRight, Activity, 
  BarChart3, Search, Heart, LayoutGrid, X, Trash2, Megaphone, PlusCircle, 
  Eye, MousePointerClick, Percent, RefreshCw, CheckCircle2, AlertCircle, Upload, Inbox 
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, 
  serverTimestamp, updateDoc, increment, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { UserProfile, SponsorshipSubmission } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CITIES } from '../constants';
import { fetchEvents } from '../services/geminiService';
import EventsUploadDialog from './UploadEventsDialog';

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

interface AdminDashboardProps {
  user: UserProfile;
  onUpdateSyncStats: (lastSyncAt: string, totalSyncs: number) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateSyncStats }) => {
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

  // Inbox states
  const [submissions, setSubmissions] = useState<SponsorshipSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);

  // Ads Management State
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdCityFilter, setSelectedAdCityFilter] = useState<string>('all');
  const [isPublishingAd, setIsPublishingAd] = useState(false);

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
    try {
      await deleteDoc(doc(db, 'ads', adId));
    } catch (err) {
      console.error("Failed to delete ad:", err);
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
        const result = await fetchEvents(city.name, { forceRefresh: true });
        if (result && result.events.length > 0) {
          for (const event of result.events) {
            const eventRef = doc(collection(db, 'events'));
            await setDoc(eventRef, {
              ...event,
              id: eventRef.id,
              userId: auth.currentUser?.uid || 'system',
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
        cityName: capitalizeFirstLetter(item?.cityName || ""),
        imageUrl: item?.imageUrl || "",
        adminCreated: true,
        userId: auth.currentUser?.uid || "unknown",
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
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-[0.85]">
              {activeTab === 'analytics' ? (
                <>Traffic <span className="text-orange-600">Analytics</span></>
              ) : activeTab === 'ads' ? (
                <>Sponsorship <span className="text-orange-600">Signals</span></>
              ) : (
                <>Partner <span className="text-orange-600">Inbox</span></>
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
                
                <div className="flex items-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSeedDefaultAds}
                    className="px-10 py-5 bg-black text-white hover:bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/10 transition-all"
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
          ) : (
            <motion.div
              key="inbox-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 animate-fade-in"
            >
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100">
                <h3 className="text-xl font-black uppercase tracking-tight mb-8">
                  Pending Sponsorship Requests ({submissions.filter(s => s.status === 'pending').length})
                </h3>

                {submissionsLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving partner signals...</p>
                  </div>
                ) : submissions.filter(s => s.status === 'pending').length === 0 ? (
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
              </div>
            </motion.div>
          )}
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
      </div>
    </div>
  );
};

export default AdminDashboard;

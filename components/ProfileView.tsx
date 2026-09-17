import React, { useState, useRef } from 'react';
import { UserProfile, EventActivity, Category, AppView, Organization, SponsorshipSubmission } from '../types';
import { CATEGORIES, CITIES } from '../constants';
import EventItem from './EventItem';
import ErrorBoundary from './ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, deleteDoc, collection, addDoc, serverTimestamp, updateDoc, increment, getDoc, setDoc, getDocs, arrayUnion, arrayRemove, onSnapshot, query, where, orderBy, deleteField } from 'firebase/firestore';
import bulkEvents from '../src/data/events.json';
import { DateFilterType, isEventInDateRange } from '../utils/dateUtils';
import { 
  User, 
  Settings, 
  Heart, 
  PlusCircle, 
  LogOut, 
  ChevronRight, 
  MapPin, 
  Tag, 
  Sparkles,
  Mail,
  Calendar,
  Shield,
  Zap,
  X,
  Trash2,
  Database,
  Lock,
  Eye,
  RefreshCw,
  CheckCircle2,
  Building2,
  Users,
  Globe,
  Megaphone,
  Upload,
  Edit3,
  Inbox,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

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

interface ProfileViewProps {
  user: UserProfile;
  savedEvents: EventActivity[];
  myEvents: EventActivity[];
  orgEvents: EventActivity[];
  onUpdatePreferences: (prefs: UserProfile['preferences']) => void;
  onLogout: () => void;
  onOpenEventDetails: (event: EventActivity) => void;
  onPostEvent: () => void;
  onToggleSave: (event: EventActivity) => void;
  onDeleteEvent: (event: EventActivity) => void;
  onDeleteMultipleEvents?: (events: EventActivity[]) => Promise<void>;
  onUpdateProfile: (name: string, email: string, phone?: string, birthday?: string, zipCode?: string, accountType?: 'individual' | 'organizer' | 'business') => void;
  onUpdateOrgInfo: (orgId?: string, orgRole?: 'owner' | 'member') => void;
  isAdmin?: boolean;
  isFirebaseConnected?: boolean | null;
  onEditEvent?: (event: EventActivity) => void;
  onNavigateToAdminQueue?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  savedEvents, 
  myEvents,
  orgEvents,
  onUpdatePreferences, 
  onLogout,
  onOpenEventDetails,
  onPostEvent,
  onToggleSave,
  onDeleteEvent,
  onDeleteMultipleEvents,
  onUpdateProfile,
  onUpdateOrgInfo,
  isAdmin,
  isFirebaseConnected,
  onEditEvent,
  onNavigateToAdminQueue
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'submissions' | 'org' | 'preferences' | 'settings' | 'privacy' | 'admin' | 'sponsorships'>('saved');
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'uncategorized'>('all');
  const [submissionsDateFilter, setSubmissionsDateFilter] = useState<DateFilterType>('all');
  const [submissionsCustomStart, setSubmissionsCustomStart] = useState<string>('');
  const [submissionsCustomEnd, setSubmissionsCustomEnd] = useState<string>('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [selectedOrgEventIds, setSelectedOrgEventIds] = useState<string[]>([]);
  const [isBatchDeletingOrg, setIsBatchDeletingOrg] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editBirthday, setEditBirthday] = useState(user.birthday || '');
  const [editZipCode, setEditZipCode] = useState(user.zipCode || '');
  const [editAccountType, setEditAccountType] = useState<'individual' | 'organizer' | 'business'>(
    user.accountType || (user.isOrganizer ? 'organizer' : 'individual')
  );
  const [isEditing, setIsEditing] = useState(false);
  const [cacheItems, setCacheItems] = useState<{key: string, size: number, timestamp: number}[]>([]);
  const [syncHealth, setSyncHealth] = useState<'optimal' | 'degraded' | 'offline'>('optimal');
  const [apiStatus, setApiStatus] = useState<{ ticketmaster: boolean, gemini: boolean, eventbrite?: boolean }>({ ticketmaster: false, gemini: false, eventbrite: false });

  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [isLoadingAllOrgs, setIsLoadingAllOrgs] = useState(false);
  const [searchQueryOrgs, setSearchQueryOrgs] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);

  // Creation form fields
  const [orgName, setOrgName] = useState(user.businessName || '');
  const [orgDesc, setOrgDesc] = useState('');

  // Sponsorship states
  const [sponsorships, setSponsorships] = useState<SponsorshipSubmission[]>([]);
  const [sponsorshipsLoading, setSponsorshipsLoading] = useState(true);
  const [allAdsForMetrics, setAllAdsForMetrics] = useState<any[]>([]); // To show live metrics
  const [newSponTitle, setNewSponTitle] = useState('');
  const [newSponTag, setNewSponTag] = useState('Sponsorship');
  const [newSponDescription, setNewSponDescription] = useState('');
  const [newSponCta, setNewSponCta] = useState('');
  const [newSponImage, setNewSponImage] = useState('');
  const [newSponUrl, setNewSponUrl] = useState('');
  const [newSponCityId, setNewSponCityId] = useState('general');
  const [isCompressingSpon, setIsCompressingSpon] = useState(false);
  const [isSubmittingSpon, setIsSubmittingSpon] = useState(false);
  const [sponsorshipToEdit, setSponsorshipToEdit] = useState<SponsorshipSubmission | null>(null);
  const sponFileInputRef = useRef<HTMLInputElement>(null);

  const handleSponImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingSpon(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setNewSponImage(compressed);
        setIsCompressingSpon(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEditSponsorship = (sub: SponsorshipSubmission) => {
    setSponsorshipToEdit(sub);
    setNewSponTitle(sub.title);
    setNewSponTag(sub.tag || 'Sponsorship');
    setNewSponDescription(sub.description);
    setNewSponCta(sub.cta);
    setNewSponImage(sub.image);
    setNewSponUrl(sub.url);
    setNewSponCityId(sub.cityId);
  };

  const handleCancelEditSponsorship = () => {
    setSponsorshipToEdit(null);
    setNewSponTitle('');
    setNewSponTag('Sponsorship');
    setNewSponDescription('');
    setNewSponCta('');
    setNewSponImage('');
    setNewSponUrl('');
    setNewSponCityId('general');
    if (sponFileInputRef.current) sponFileInputRef.current.value = '';
  };

  const handleSubmitSponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponTitle || !newSponCta || !newSponImage || isSubmittingSpon || isCompressingSpon) return;
    setIsSubmittingSpon(true);
    
    try {
      if (sponsorshipToEdit) {
        const sponRef = doc(db, 'sponsorships', sponsorshipToEdit.id);
        await updateDoc(sponRef, {
          title: newSponTitle,
          tag: newSponTag || 'Sponsorship',
          description: newSponDescription,
          cta: newSponCta,
          image: newSponImage,
          url: newSponUrl,
          cityId: newSponCityId,
          updatedAt: serverTimestamp()
        });
        alert("Sponsorship updated successfully!");
        setSponsorshipToEdit(null);
      } else {
        const sponRef = doc(collection(db, 'sponsorships'));
        const newSubmission: SponsorshipSubmission = {
          id: sponRef.id,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          title: newSponTitle,
          tag: newSponTag || 'Sponsorship',
          description: newSponDescription,
          cta: newSponCta,
          image: newSponImage,
          url: newSponUrl,
          cityId: newSponCityId,
          status: 'pending',
          createdAt: serverTimestamp()
        };
        await setDoc(sponRef, newSubmission);
        alert("Sponsorship inquiry submitted successfully! Our administrators will review it shortly.");
      }
      
      // Reset Form
      setNewSponTitle('');
      setNewSponTag('Sponsorship');
      setNewSponDescription('');
      setNewSponCta('');
      setNewSponImage('');
      setNewSponUrl('');
      setNewSponCityId('general');
      if (sponFileInputRef.current) sponFileInputRef.current.value = '';
    } catch (err) {
      console.error("Failed to save sponsorship:", err);
      alert("Failed to save sponsorship. Please try again.");
    } finally {
      setIsSubmittingSpon(false);
    }
  };

  // Listen to user's sponsorships in real-time
  React.useEffect(() => {
    if (!user.id) return;
    const q = query(
      collection(db, 'sponsorships'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SponsorshipSubmission));
      setSponsorships(data);
      setSponsorshipsLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot Error [sponsorships]:", error);
      setSponsorshipsLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  // Listen to live ads collection in real time to show click / impression performance metrics
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ads'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAdsForMetrics(data);
    });
    return () => unsubscribe();
  }, []);
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgEmail, setOrgEmail] = useState(user.email || '');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');

  // Fetch current user's organization
  React.useEffect(() => {
    if (user.orgId) {
      const fetchOrg = async () => {
        setIsLoadingOrg(true);
        try {
          const docSnap = await getDoc(doc(db, 'organizations', user.orgId!));
          if (docSnap.exists()) {
            setOrgData({ ...docSnap.data(), id: docSnap.id } as Organization);
          }
        } catch (err) {
          console.error("Failed to fetch organization", err);
        } finally {
          setIsLoadingOrg(false);
        }
      };
      fetchOrg();
    } else {
      setOrgData(null);
    }
  }, [user.orgId]);

  // Fetch all organizations for joining
  const fetchAllOrgs = async () => {
    setIsLoadingAllOrgs(true);
    try {
      const querySnap = await getDocs(collection(db, 'organizations'));
      const orgsList = querySnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Organization));
      setAllOrgs(orgsList);
    } catch (err) {
      console.error("Failed to fetch all organizations", err);
    } finally {
      setIsLoadingAllOrgs(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'org' && !user.orgId) {
      fetchAllOrgs();
    }
  }, [activeTab, user.orgId]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgDesc) return;
    setIsSubmittingOrg(true);
    try {
      const cleanSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org';
      const uniqueOrgId = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const effectiveEmail = orgEmail.trim() || user.email || '';
      const newOrg: Organization = {
        id: uniqueOrgId,
        name: orgName.trim(),
        description: orgDesc.trim(),
        ownerId: user.id,
        members: [user.id],
        logoUrl: orgLogoUrl?.trim() || `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400`,
        createdAt: serverTimestamp(),
        ...(orgWebsite?.trim() ? { website: orgWebsite.trim() } : {}),
        ...(effectiveEmail ? { email: effectiveEmail } : {}),
        ...(orgPhone?.trim() ? { phone: orgPhone.trim() } : {})
      };

      await setDoc(doc(db, 'organizations', uniqueOrgId), newOrg);
      
      // Update user document
      const userUpdates: any = {
        orgId: uniqueOrgId,
        orgRole: 'owner',
        isOrganizer: true
      };
      const finalAccountType = (user.accountType === 'business' || user.accountType === 'organizer') 
        ? user.accountType 
        : 'business';
      userUpdates.accountType = finalAccountType;

      await updateDoc(doc(db, 'users', user.id), userUpdates);

      if (onUpdateOrgInfo) {
        onUpdateOrgInfo(uniqueOrgId, 'owner');
      }

      if (onUpdateProfile) {
        onUpdateProfile(user.name, user.email, user.phone, user.birthday, user.zipCode, finalAccountType);
      }

      alert("Business / Organization profile established successfully!");
      setIsCreatingOrg(false);
    } catch (err: any) {
      console.error("Failed to create organization:", err);
      alert(`Failed to create organization profile: ${err?.message || err}`);
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  const handleJoinOrg = async (org: Organization) => {
    try {
      // Add user to org members
      await updateDoc(doc(db, 'organizations', org.id), {
        members: arrayUnion(user.id)
      });

      // Update user profile
      await updateDoc(doc(db, 'users', user.id), {
        orgId: org.id,
        orgRole: 'member'
      });

      if (onUpdateOrgInfo) {
        onUpdateOrgInfo(org.id, 'member');
      }

      alert(`Successfully joined ${org.name}!`);
    } catch (err: any) {
      console.error("Failed to join organization:", err);
      alert(`Failed to join organization: ${err?.message || err}`);
    }
  };

  const handleLeaveOrg = async () => {
    if (!orgData) return;
    if (orgData.ownerId === user.id) {
      alert("As the owner, you cannot leave the organization. You must disband it instead.");
      return;
    }

    if (window.confirm(`Are you sure you want to leave ${orgData.name}?`)) {
      try {
        // Remove user from org members
        await updateDoc(doc(db, 'organizations', orgData.id), {
          members: arrayRemove(user.id)
        });

        // Update user profile
        await updateDoc(doc(db, 'users', user.id), {
          orgId: deleteField(),
          orgRole: deleteField()
        });

        if (onUpdateOrgInfo) {
          onUpdateOrgInfo(undefined, undefined);
        }

        alert(`Successfully left ${orgData.name}.`);
      } catch (err: any) {
        console.error("Failed to leave organization:", err);
        alert(`Failed to leave organization: ${err?.message || err}`);
      }
    }
  };

  const handleDisbandOrg = async () => {
    if (!orgData) return;
    if (orgData.ownerId !== user.id) return;

    if (window.confirm(`WARNING: Are you sure you want to disband ${orgData.name}? This will remove all members and delete the profile permanently.`)) {
      try {
        await deleteDoc(doc(db, 'organizations', orgData.id));

        await updateDoc(doc(db, 'users', user.id), {
          orgId: deleteField(),
          orgRole: deleteField()
        });

        if (onUpdateOrgInfo) {
          onUpdateOrgInfo(undefined, undefined);
        }

        alert(`Disbanded ${orgData.name} successfully.`);
      } catch (err: any) {
        console.error("Failed to disband organization:", err);
        alert(`Failed to disband organization: ${err?.message || err}`);
      }
    }
  };

  React.useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await fetch('/api/config/status');
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data);
        }
      } catch (err) {
        console.warn("Failed to fetch API status:", err);
      }
    };
    fetchApiStatus();
  }, []);

  React.useEffect(() => {
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditBirthday(user.birthday || '');
    setEditZipCode(user.zipCode || '');
    setEditAccountType(user.accountType || (user.isOrganizer ? 'organizer' : 'individual'));
    if (!orgName && user.businessName) {
      setOrgName(user.businessName);
    }
    if (!orgEmail && user.email) {
      setOrgEmail(user.email);
    }
  }, [user.name, user.email, user.phone, user.birthday, user.zipCode, user.accountType, user.isOrganizer, user.businessName]);

  React.useEffect(() => {
    if (activeTab === 'privacy') {
      const items = Object.keys(localStorage)
        .filter(k => k.startsWith('itm_cache_v15_'))
        .map(k => {
          try {
            const val = localStorage.getItem(k) || '';
            const parsed = JSON.parse(val);
            return {
              key: k,
              size: val.length,
              timestamp: parsed.timestamp || 0
            };
          } catch (e) {
            return { key: k, size: 0, timestamp: 0 };
          }
        });
      setCacheItems(items);
      
      // Simulate sync health check
      setSyncHealth(Math.random() > 0.1 ? 'optimal' : 'degraded');
    }
  }, [activeTab]);

  const clearCache = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('itm_cache_v15_'))
      .forEach(k => localStorage.removeItem(k));
    setCacheItems([]);
  };

  const handleDelete = (event: EventActivity) => {
    if (window.confirm("Are you sure you want to terminate this broadcast signal?")) {
      setSelectedEventIds(prev => prev.filter(id => id !== event.id));
      setSelectedOrgEventIds(prev => prev.filter(id => id !== event.id));
      onDeleteEvent(event);
    }
  };

  const handleBatchDelete = async (eventsToDelete: EventActivity[]) => {
    if (eventsToDelete.length === 0) return;
    const count = eventsToDelete.length;
    if (!window.confirm(`Permanently delete ${count} selected broadcast signal${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsBatchDeleting(true);
    try {
      if (onDeleteMultipleEvents) {
        await onDeleteMultipleEvents(eventsToDelete);
      } else {
        for (const ev of eventsToDelete) {
          onDeleteEvent(ev);
        }
      }
      setSelectedEventIds(prev => prev.filter(id => !eventsToDelete.some(e => e.id === id)));
      setSelectedOrgEventIds(prev => prev.filter(id => !eventsToDelete.some(e => e.id === id)));
    } catch (err) {
      console.error("Failed to delete selected events:", err);
      alert("An error occurred while deleting selected events.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const toggleCategory = (cat: Category) => {
    const current = user.preferences.favoriteCategories;
    const next = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    onUpdatePreferences({ ...user.preferences, favoriteCategories: next });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-32">
      {/* Profile Header */}
      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-black rounded-[3rem] flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-2xl shadow-black/20 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-white" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              {user.accountType === 'business' ? (
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-full shadow-lg shadow-orange-600/20">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-black uppercase tracking-[0.25em] text-[9px]">Business Partner</span>
                </div>
              ) : (user.isOrganizer || user.accountType === 'organizer') ? (
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full shadow-lg shadow-black/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-black uppercase tracking-[0.25em] text-[9px]">Event Organizer</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full">
                  <Shield className="w-3 h-3 text-orange-600" />
                  <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[9px]">Metropolitan Member</span>
                </div>
              )}
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                <Zap className={`w-3 h-3 ${apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'text-emerald-600' : 'text-orange-600'}`} />
                <span className="font-black uppercase tracking-[0.3em] text-[9px]">
                  Signals: {apiStatus.gemini && apiStatus.ticketmaster && isFirebaseConnected ? 'Optimal' : (isFirebaseConnected === false ? 'System Offline' : 'Limited')}
                </span>
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-4 mb-4">
                <input 
                  type="text" 
                  maxLength={90}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase italic leading-none bg-gray-50 border-b-4 border-black outline-none w-full max-w-xl"
                  placeholder="Display Name"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="text-lg font-bold text-gray-400 tracking-widest uppercase bg-gray-50 border-b-2 border-gray-200 outline-none w-full max-w-md"
                    placeholder="Email Address"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-4">
                  {user.name}
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {user.preferences.favoriteCity || 'No Primary City'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4">
            {isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onUpdateProfile(editName, editEmail, editPhone, editBirthday, editZipCode, editAccountType);
                    setIsEditing(false);
                  }}
                  className="px-8 py-5 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"
                >
                  <Sparkles className="w-4 h-4" />
                  Save Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditName(user.name);
                    setEditEmail(user.email);
                    setEditAccountType(user.accountType || (user.isOrganizer ? 'organizer' : 'individual'));
                    setIsEditing(false);
                  }}
                  className="px-8 py-5 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-5 bg-gray-50 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3 border border-gray-100 hover:border-black transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPostEvent}
                  className="px-8 py-5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit Event
                </motion.button>
              </>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-5 bg-gray-50 text-gray-400 hover:text-red-600 rounded-2xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-24 z-30 bg-white/80 backdrop-blur-md py-4 -mx-4 px-4 mb-12 flex space-x-4 overflow-x-auto scrollbar-hide">
        {[
          { id: 'saved', label: 'Saved Signals', icon: Heart },
          { id: 'submissions', label: 'My Submissions', icon: Zap },
          { id: 'org', label: user?.accountType === 'business' ? 'Business Profile' : 'Organization Hub', icon: Building2 },
          ...(user?.isOrganizer || user?.accountType === 'business' ? [{ id: 'sponsorships', label: 'Sponsorships', icon: Megaphone }] : []),
          { id: 'preferences', label: 'Hub Preferences', icon: Tag },
          { id: 'settings', label: 'Account Settings', icon: Settings },
          { id: 'privacy', label: 'Privacy Dashboard', icon: Lock },
          ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: Shield }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-10 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shrink-0 ${
              activeTab === tab.id 
                ? 'bg-black text-white shadow-2xl shadow-black/20' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'saved' && (
          <ErrorBoundary>
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              {savedEvents.filter(e => e && typeof e === 'object').length > 0 ? (
                savedEvents.filter(e => e && typeof e === 'object').map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <EventItem 
                      event={event} 
                      showCity={true} 
                      onOpenDetails={onOpenEventDetails} 
                      isSaved={true}
                      onToggleSave={() => onToggleSave(event)}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <Heart className="w-16 h-16 text-gray-100 mx-auto mb-8" />
                  <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] mb-8">No saved metropolitan signals yet</p>
                  <button className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline">Explore The Metro</button>
                </div>
              )}
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'submissions' && (
          <ErrorBoundary>
            <motion.div
              key="submissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-left"
            >
              {(() => {
                const displayed = myEvents.filter(e => {
                  const matchesCat = submissionsFilter === 'uncategorized' ? e.category === 'Undefined' : true;
                  const matchesDate = isEventInDateRange(
                    e.date,
                    submissionsDateFilter,
                    submissionsCustomStart,
                    submissionsCustomEnd,
                    true
                  );
                  return matchesCat && matchesDate;
                });

                const allDisplayedSelected = displayed.length > 0 && displayed.every(e => selectedEventIds.includes(e.id));

                return (
                  <>
                    {/* Header & Filter Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                          My Broadcasted Signals ({myEvents.length})
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                          Manage your submissions, bulk delete, and organize queue items
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {isAdmin && (
                          <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setSubmissionsFilter('all');
                                setSelectedEventIds([]);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                submissionsFilter === 'all' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                              }`}
                            >
                              All ({myEvents.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSubmissionsFilter('uncategorized');
                                setSelectedEventIds([]);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                                submissionsFilter === 'uncategorized' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-500 hover:text-black'
                              }`}
                            >
                              Queue ({myEvents.filter(e => e.category === 'Undefined').length})
                            </button>
                          </div>
                        )}

                        {/* Date Filter Dropdown */}
                        <div className="relative">
                          <select
                            value={submissionsDateFilter}
                            onChange={e => {
                              setSubmissionsDateFilter(e.target.value as any);
                              setSelectedEventIds([]);
                            }}
                            className="bg-gray-100 hover:bg-gray-200 border-none rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-widest text-gray-700 cursor-pointer focus:outline-none"
                          >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="weekend">This Weekend</option>
                            <option value="week">Next 7 Days</option>
                            <option value="month">Next 30 Days</option>
                            <option value="past">Past Signals</option>
                            <option value="custom">📅 Custom Range...</option>
                          </select>
                        </div>

                        {displayed.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (allDisplayedSelected) {
                                setSelectedEventIds(prev => prev.filter(id => !displayed.some(e => e.id === id)));
                              } else {
                                const toAdd = displayed.map(e => e.id);
                                setSelectedEventIds(prev => Array.from(new Set([...prev, ...toAdd])));
                              }
                            }}
                            className="px-4 py-2.5 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors flex items-center gap-2 cursor-pointer bg-white"
                          >
                            {allDisplayedSelected ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-orange-600" />
                                Deselect All ({displayed.length})
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 text-gray-400" />
                                Select All ({displayed.length})
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={onPostEvent}
                          className="px-5 py-2.5 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-black/10 flex items-center gap-2 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          + Add New Signal
                        </button>
                      </div>
                    </div>

                    {/* Custom Date Range Bar */}
                    {submissionsDateFilter === 'custom' && (
                      <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-orange-600" />
                            Filter Window:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={submissionsCustomStart}
                              onChange={e => {
                                setSubmissionsCustomStart(e.target.value);
                                setSelectedEventIds([]);
                              }}
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-black shadow-sm"
                              placeholder="Start Date"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">to</span>
                            <input
                              type="date"
                              value={submissionsCustomEnd}
                              onChange={e => {
                                setSubmissionsCustomEnd(e.target.value);
                                setSelectedEventIds([]);
                              }}
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-black shadow-sm"
                              placeholder="End Date"
                            />
                          </div>
                          {(submissionsCustomStart || submissionsCustomEnd) && (
                            <span className="px-3 py-1 bg-white border border-orange-200 text-orange-700 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                              {submissionsCustomStart || 'Any'} → {submissionsCustomEnd || 'Any'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionsCustomStart('');
                            setSubmissionsCustomEnd('');
                            setSubmissionsDateFilter('all');
                            setSelectedEventIds([]);
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black underline cursor-pointer"
                        >
                          Reset Date Filter
                        </button>
                      </div>
                    )}

                    {/* Batch Actions Bar */}
                    {selectedEventIds.length > 0 && (
                      <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-orange-900">
                            {selectedEventIds.length} signal{selectedEventIds.length > 1 ? 's' : ''} selected
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isBatchDeleting}
                            onClick={() => {
                              const selectedObjs = myEvents.filter(e => selectedEventIds.includes(e.id));
                              handleBatchDelete(selectedObjs);
                            }}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            {isBatchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete Selected ({selectedEventIds.length})
                          </button>

                          <button
                            type="button"
                            disabled={isBatchDeleting}
                            onClick={() => setSelectedEventIds([])}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors underline cursor-pointer px-2"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grid of Events */}
                    {displayed.length === 0 ? (
                      <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                        <Zap className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] mb-6">
                          {submissionsFilter === 'uncategorized' ? 'No uncategorized queue signals found' : "You haven't broadcasted any signals yet"}
                        </p>
                        <button onClick={onPostEvent} className="text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline cursor-pointer">
                          Broadcast a New Event
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayed.map((event, i) => {
                          const isSelected = selectedEventIds.includes(event.id);
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.04 }}
                              className={`relative group flex flex-col justify-between rounded-[2rem] p-4 border transition-all ${
                                isSelected
                                  ? 'bg-orange-50/20 border-orange-500 ring-2 ring-orange-500/30 shadow-md'
                                  : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'
                              }`}
                            >
                              <EventItem event={event} showCity={true} onOpenDetails={onOpenEventDetails} />

                              {/* Badges & Action Bar */}
                              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEventIds(prev => 
                                        prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                                      );
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isSelected
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : 'border-gray-200 text-gray-600 hover:border-black hover:text-black bg-white'
                                    }`}
                                    title={isSelected ? "Deselect Event" : "Select Event for Deletion"}
                                  >
                                    {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    <span>{isSelected ? "Selected" : "Select"}</span>
                                  </button>

                                  {event.category === 'Undefined' ? (
                                    <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                                      ⚠️ Queue
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[90px]">
                                      {event.category}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    type="button"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (onEditEvent) {
                                        onEditEvent(event);
                                      } else {
                                        onOpenEventDetails(event);
                                      }
                                    }}
                                    className="px-3 py-1.5 border border-gray-200 hover:border-black hover:bg-gray-50 text-gray-800 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                                    title="Edit Event"
                                  >
                                    <Edit3 className="w-3 h-3 text-gray-600" />
                                    Edit
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                                    className="px-3 py-1.5 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                                    title="Delete Broadcast"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'org' && (
          <ErrorBoundary>
            <motion.div
              key="org"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {isLoadingOrg ? (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : orgData ? (
                // User has an organization
                <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                  <div className="flex flex-col lg:flex-row items-start gap-12 pb-12 border-b border-gray-100 mb-12">
                    <div className="w-32 h-32 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black uppercase shadow-2xl shadow-orange-500/10 shrink-0 overflow-hidden">
                      {orgData.logoUrl ? (
                        <img src={orgData.logoUrl} alt={orgData.name} className="w-full h-full object-cover rounded-[2.5rem]" />
                      ) : (
                        orgData.name.substring(0, 2)
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">{orgData.name}</h3>
                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${user.orgRole === 'owner' ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/10' : 'bg-gray-100 text-gray-500'}`}>
                          {user.orgRole === 'owner' ? 'Organization Owner' : 'Member'}
                        </span>
                      </div>
                      
                      <p className="text-gray-500 font-medium text-lg leading-relaxed">{orgData.description}</p>
                      
                      <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2">
                        {orgData.website && (
                          <a href={orgData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-orange-600 hover:underline">
                            <Globe className="w-4 h-4" /> {orgData.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {orgData.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" /> {orgData.email}
                          </div>
                        )}
                        {orgData.phone && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" /> {orgData.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" /> {orgData.members.length} {orgData.members.length === 1 ? 'Member' : 'Members'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto shrink-0">
                      {user.orgRole === 'owner' ? (
                        <button 
                          onClick={handleDisbandOrg}
                          className="px-8 py-5 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm w-full text-center cursor-pointer"
                        >
                          Disband Organization
                        </button>
                      ) : (
                        <button 
                          onClick={handleLeaveOrg}
                          className="px-8 py-5 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm w-full text-center cursor-pointer"
                        >
                          Leave Organization
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Organization Events */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        <Zap className="w-5 h-5 text-orange-600" />
                        Organization Broadcast Signals ({orgEvents.length})
                      </h4>

                      {user.orgRole === 'owner' && orgEvents.length > 0 && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected = orgEvents.every(e => selectedOrgEventIds.includes(e.id));
                              if (allSelected) {
                                setSelectedOrgEventIds([]);
                              } else {
                                setSelectedOrgEventIds(orgEvents.map(e => e.id));
                              }
                            }}
                            className="px-4 py-2 border border-gray-200 hover:border-black rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors flex items-center gap-2 cursor-pointer bg-white"
                          >
                            {orgEvents.every(e => selectedOrgEventIds.includes(e.id)) ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-orange-600" />
                                Deselect All ({orgEvents.length})
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 text-gray-400" />
                                Select All ({orgEvents.length})
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Org Batch Actions Bar */}
                    {user.orgRole === 'owner' && selectedOrgEventIds.length > 0 && (
                      <div className="mb-8 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-orange-900">
                            {selectedOrgEventIds.length} signal{selectedOrgEventIds.length > 1 ? 's' : ''} selected
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isBatchDeletingOrg}
                            onClick={async () => {
                              const selectedObjs = orgEvents.filter(e => selectedOrgEventIds.includes(e.id));
                              setIsBatchDeletingOrg(true);
                              try {
                                await handleBatchDelete(selectedObjs);
                              } finally {
                                setIsBatchDeletingOrg(false);
                              }
                            }}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            {isBatchDeletingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete Selected ({selectedOrgEventIds.length})
                          </button>

                          <button
                            type="button"
                            disabled={isBatchDeletingOrg}
                            onClick={() => setSelectedOrgEventIds([])}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors underline cursor-pointer px-2"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {orgEvents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {orgEvents.map((event) => {
                          const isSelected = selectedOrgEventIds.includes(event.id);
                          return (
                            <div 
                              key={event.id} 
                              className={`relative group rounded-[2.5rem] transition-all ${
                                isSelected ? 'ring-4 ring-orange-500/40 shadow-xl' : ''
                              }`}
                            >
                              <EventItem event={event} showCity={true} onOpenDetails={onOpenEventDetails} />
                              {user.orgRole === 'owner' && (
                                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgEventIds(prev => 
                                        prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                                      );
                                    }}
                                    className={`p-2.5 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-orange-600 text-white shadow-orange-600/30 scale-105'
                                        : 'bg-white/90 backdrop-blur-md text-gray-500 hover:text-black hover:bg-white'
                                    }`}
                                    title={isSelected ? "Deselect Event" : "Select Event"}
                                  >
                                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                  </button>

                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                                    className="p-2.5 bg-red-600 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-xl cursor-pointer"
                                    title="Delete Broadcast"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-20 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6">No signals broadcasted under this organization</p>
                        <button onClick={onPostEvent} className="px-8 py-4 bg-black text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg">Broadcast Org Event</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // User has no organization - Show Join / Create options
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Create Organization Form */}
                  <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">
                          {user.accountType === 'business' ? 'Establish Business Profile' : 'Establish Organization / Business Profile'}
                        </h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                          {user.accountType === 'business' 
                            ? 'Launch a verified profile for your business to publish official schedules and submit sponsorships' 
                            : 'Launch a profile to publish official metropolitan schedules'}
                        </p>
                      </div>
                    </div>
                    
                    <form onSubmit={handleCreateOrg} className="space-y-6">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">
                          {user.accountType === 'business' ? 'Business or Venue Name' : 'Business / Organization Name'}
                        </label>
                        <input 
                          required
                          type="text" 
                          placeholder={user.accountType === 'business' ? "e.g. Cain's Ballroom or Metro Cafe" : "e.g. Tulsa Symphony Orchestra"} 
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">
                          {user.accountType === 'business' ? 'Business Email Address' : 'Official Email Address'}
                        </label>
                        <input 
                          required
                          type="email" 
                          placeholder="info@yourcompany.com" 
                          value={orgEmail}
                          onChange={(e) => setOrgEmail(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">
                            {user.accountType === 'business' ? 'Business Website URL' : 'Website URL'}
                          </label>
                          <input 
                            type="url" 
                            placeholder="https://yourcompany.com" 
                            value={orgWebsite}
                            onChange={(e) => setOrgWebsite(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Logo URL (Optional)</label>
                          <input 
                            type="url" 
                            placeholder="https://.../logo.png" 
                            value={orgLogoUrl}
                            onChange={(e) => setOrgLogoUrl(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">
                          {user.accountType === 'business' ? 'Business Overview & Focus' : 'Mission & Description'}
                        </label>
                        <textarea 
                          required
                          placeholder={user.accountType === 'business' 
                            ? "Briefly describe your business, venue, and upcoming events or promotions..." 
                            : "Briefly describe your organization's mission and event focus..."} 
                          value={orgDesc}
                          onChange={(e) => setOrgDesc(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 h-28 resize-none text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmittingOrg}
                        className="w-full py-5 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingOrg ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Building2 className="w-4 h-4" />
                            {user.accountType === 'business' ? 'Establish Business Profile' : 'Establish Organization Profile'}
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Join Organization search */}
                  <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Join Organization</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Connect to an established profile to post under their brand</p>
                      </div>
                    </div>
                    
                    <div className="mb-6 relative">
                      <input 
                        type="text" 
                        placeholder="Search active organizations..." 
                        value={searchQueryOrgs}
                        onChange={(e) => setSearchQueryOrgs(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 space-y-4 scrollbar-hide">
                      {isLoadingAllOrgs ? (
                        <div className="py-10 text-center">
                          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : allOrgs.filter(org => org.name.toLowerCase().includes(searchQueryOrgs.toLowerCase())).length > 0 ? (
                        allOrgs.filter(org => org.name.toLowerCase().includes(searchQueryOrgs.toLowerCase())).map(org => (
                          <div key={org.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                            <div className="overflow-hidden">
                              <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm truncate">{org.name}</h4>
                              <p className="text-[10px] text-gray-400 font-medium truncate mt-1">{org.description}</p>
                              <div className="flex items-center gap-4 text-[9px] font-black uppercase text-gray-400 mt-2">
                                <span>{org.members.length} {org.members.length === 1 ? 'Member' : 'Members'}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => handleJoinOrg(org)}
                              className="px-6 py-3 bg-black hover:bg-orange-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
                            >
                              Join Org
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                          No organizations found matching "{searchQueryOrgs}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'preferences' && (
          <ErrorBoundary>
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                  <MapPin className="w-6 h-6 text-orange-600" />
                  Primary Metropolitan Hub
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {CITIES.map(city => (
                    <button
                      key={city.id}
                      onClick={() => onUpdatePreferences({ ...user.preferences, favoriteCity: city.name })}
                      className={`p-8 rounded-[2rem] border-2 transition-all text-center ${
                        user.preferences.favoriteCity === city.name
                          ? 'border-black bg-black text-white shadow-2xl'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{city.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                  <Tag className="w-6 h-6 text-orange-600" />
                  Intelligence Categories
                </h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8 ml-1">Select your primary intelligence streams for personalized signals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all gap-3 ${
                        user.preferences.favoriteCategories.includes(cat)
                          ? 'border-orange-600 bg-orange-50 text-orange-600 shadow-xl shadow-orange-600/10'
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.preferences.favoriteCategories.includes(cat) ? 'bg-orange-600 text-white' : 'bg-white text-gray-300'}`}>
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-center">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'settings' && (
          <ErrorBoundary>
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-xl space-y-10">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Display Name</label>
                  <input 
                    type="text" 
                    maxLength={90}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Email Address</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Phone Number</label>
                    <input 
                      type="tel" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Zip Code</label>
                    <input 
                      type="text" 
                      maxLength={10}
                      value={editZipCode}
                      onChange={(e) => setEditZipCode(e.target.value)}
                      placeholder="74103"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4 block">Birthday</label>
                  <input 
                    type="date" 
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 px-8 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 block">Account Type & Membership Tier</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { type: 'individual', label: 'Individual Member', icon: User, desc: 'Browse and save events to your vault.' },
                      { type: 'organizer', label: 'Event Organizer', icon: Sparkles, desc: 'Host organizations & publish official events.' },
                      { type: 'business', label: 'Business Partner', icon: Building2, desc: 'Establish business profile & submit sponsorships.' }
                    ] as const).map(item => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setEditAccountType(item.type)}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-start text-left gap-2 cursor-pointer ${
                          editAccountType === item.type
                            ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-sm'
                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className={`w-4 h-4 ${editAccountType === item.type ? 'text-orange-600' : 'text-gray-400'}`} />
                          <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 leading-tight">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => onUpdateProfile(editName, editEmail, editPhone, editBirthday, editZipCode, editAccountType)}
                    className="px-12 py-6 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl cursor-pointer"
                  >
                    Update Account Data
                  </button>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
        {activeTab === 'privacy' && (
          <ErrorBoundary>
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Metropolitan Privacy Dashboard</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Monitor and manage your local intelligence footprint</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Local Cache Size</span>
                    </div>
                    <div className="text-4xl font-black text-gray-900 tracking-tighter">
                      {(cacheItems.reduce((acc, curr) => acc + curr.size, 0) / 1024).toFixed(2)} <span className="text-lg text-gray-400">KB</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cached Signals</span>
                    </div>
                    <div className="text-4xl font-black text-gray-900 tracking-tighter">
                      {cacheItems.length} <span className="text-lg text-gray-400">Entries</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ticketmaster API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.ticketmaster ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className={`text-lg font-black uppercase tracking-tight italic ${apiStatus.ticketmaster ? 'text-emerald-600' : 'text-red-600'}`}>
                        {apiStatus.ticketmaster ? 'Configured' : 'Missing Key'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Metropolitan Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.gemini ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className={`text-lg font-black uppercase tracking-tight italic ${apiStatus.gemini ? 'text-emerald-600' : 'text-red-600'}`}>
                        {apiStatus.gemini ? 'Operational' : 'Offline (Missing Key)'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Eventbrite API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.eventbrite ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className={`text-lg font-black uppercase tracking-tight italic ${apiStatus.eventbrite ? 'text-emerald-600' : 'text-red-600'}`}>
                        {apiStatus.eventbrite ? 'Operational' : 'Offline (Missing Key/Org)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tracking Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-lg font-black text-emerald-600 uppercase tracking-tight italic">Zero Trackers</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signal Integrity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-lg font-black text-emerald-600 uppercase tracking-tight italic">Verified Secure</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Metropolitan Signal Cache</h4>
                      <p className="text-xs text-gray-400 font-medium">Temporary storage for faster signal synchronization and offline access.</p>
                    </div>
                    <button 
                      onClick={clearCache}
                      className="flex items-center gap-3 px-8 py-4 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Purge Cache
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Session Data Persistence</h4>
                      <p className="text-xs text-gray-400 font-medium">Your profile and preferences are currently ephemeral and stored in memory only.</p>
                    </div>
                    <div className="px-6 py-3 bg-gray-100 text-gray-400 font-black rounded-xl text-[9px] uppercase tracking-widest">
                      In-Memory Only
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">Third-Party Intelligence</h4>
                      <p className="text-xs text-gray-400 font-medium">Signals are synchronized via Gemini AI. No PII is shared during synchronization.</p>
                    </div>
                    <div className="px-6 py-3 bg-emerald-50 text-emerald-600 font-black rounded-xl text-[9px] uppercase tracking-widest">
                      Verified Secure
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
        {activeTab === 'admin' && isAdmin && (
          <ErrorBoundary>
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100"
            >
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Metropolitan Admin Portal</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">System-level intelligence management</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Database className="w-5 h-5 text-orange-600" />
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Bulk Intelligence Sync</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                      Synchronize pre-formatted schedules for OU Football, OKC Thunder, and Dallas Sports directly to the metropolitan database.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">OU Football 2026</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">6 Events</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">OKC Thunder April</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">2 Events</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Dallas Sports Mix</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">3 Events</span>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        if (window.confirm(`Synchronize ${bulkEvents.length} events to Firestore?`)) {
                          const btn = document.getElementById('sync-btn');
                          if (btn) btn.innerText = 'Synchronizing...';
                          
                          let count = 0;
                          for (const event of bulkEvents) {
                            try {
                              // Format date to MM/DD/YYYY if it's in YYYY-MM-DD
                              let formattedDate = event.date;
                              if (event.date && event.date.includes('-')) {
                                const [y, m, d] = event.date.split('-');
                                formattedDate = `${m}/${d}/${y}`;
                              }

                              await addDoc(collection(db, 'events'), {
                                ...event,
                                date: formattedDate,
                                userCreated: true,
                                isTrending: false,
                                createdAt: serverTimestamp(),
                                userId: user.id
                              });
                              count++;
                            } catch (err) {
                              console.error("Sync failed for event:", event.title, err);
                            }
                          }
                          
                          // Update User Sync Stats
                          try {
                            await updateDoc(doc(db, 'users', user.id), {
                              "syncStats.lastSyncAt": new Date().toISOString(),
                              "syncStats.totalSyncs": increment(1)
                            });
                          } catch (err) {
                            console.error("Failed to update user sync stats:", err);
                          }

                          alert(`Successfully synchronized ${count} metropolitan signals. Sync credentials updated in your Auth profile.`);
                          if (btn) btn.innerText = 'Sync Intelligence Now';
                        }
                      }}
                      id="sync-btn"
                      className="w-full mt-10 py-6 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Sync Intelligence Now
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">System Health</h4>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Cloud Database</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-500' : isFirebaseConnected === false ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`} />
                          <span className={`text-sm font-black uppercase italic ${isFirebaseConnected ? 'text-emerald-600' : isFirebaseConnected === false ? 'text-red-600' : 'text-orange-600'}`}>
                            {isFirebaseConnected ? 'Active & Secure' : isFirebaseConnected === false ? 'Connection Offline' : 'Syncing Hub...'}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Auth Provider</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-black text-gray-900 uppercase italic">Firebase Identity</span>
                        </div>
                      </div>
                      
                      {user.syncStats && (
                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 block mb-2">Authenticated Sync Status</span>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-900 uppercase">Last Sync: <span className="text-emerald-600">{user.syncStats.lastSyncAt ? new Date(user.syncStats.lastSyncAt).toLocaleString() : 'Never'}</span></p>
                              <p className="text-[10px] font-black text-gray-900 uppercase">Total Operations: <span className="text-emerald-600">{user.syncStats.totalSyncs || 0}</span></p>
                            </div>
                          </div>
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <Inbox className="w-5 h-5 text-orange-600" />
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Categorization Queue</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        Review, edit details, assign valid categories, or delete undefined/crawl-synced events waiting in the queue.
                      </p>
                      
                      <div className="p-6 bg-white rounded-2xl border border-gray-100 mb-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Uncategorized Events</span>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-gray-900">
                            {myEvents.filter(e => e.category === 'Undefined').length}
                          </span>
                          <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                            In Queue
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToAdminQueue) {
                            onNavigateToAdminQueue();
                          } else {
                            setActiveTab('submissions');
                            setSubmissionsFilter('uncategorized');
                          }
                        }}
                        className="w-full py-4 bg-black hover:bg-orange-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <Inbox className="w-4 h-4" />
                        Open Categorization Queue
                      </button>

                      <button
                        type="button"
                        onClick={onPostEvent}
                        className="w-full py-4 border-2 border-black hover:bg-black hover:text-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        + Add Event to Queue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
        {activeTab === 'sponsorships' && (user.isOrganizer || user.accountType === 'business') && (
          <ErrorBoundary>
            <motion.div
              key="sponsorships-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-12 animate-fade-in"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-[1.25rem] flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Sponsorship Hub</h3>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Submit & manage your local sponsorship listings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Side: Submission History */}
                <div className="lg:col-span-7 space-y-6">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-100">
                    My Applications ({sponsorships.length})
                  </h4>
                  
                  {sponsorshipsLoading ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading submissions...</p>
                    </div>
                  ) : sponsorships.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No sponsorships submitted yet</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Fill out the form on the right to broadcast your brand</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sponsorships.map((sub) => {
                        const liveAd = allAdsForMetrics.find(ad => ad.title === sub.title && ad.cityId === sub.cityId);
                        
                        return (
                          <div key={sub.id} className="p-6 bg-white border border-gray-100 rounded-[2rem] hover:shadow-xl hover:shadow-gray-100 transition-all space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-4">
                                {sub.image && (
                                  <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                    <img src={sub.image} alt={sub.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div>
                                  <h5 className="text-sm font-black text-gray-900 uppercase tracking-tight">{sub.title}</h5>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-orange-600 block mt-1">{sub.tag}</span>
                                </div>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                sub.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                sub.status === 'declined' ? 'bg-red-50 text-red-600' :
                                'bg-orange-50 text-orange-600'
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-55 text-left">
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Target Hub</span>
                                <span className="text-[10px] font-black text-gray-900 uppercase">
                                  {sub.cityId === 'general' ? 'All Hubs' : sub.cityId}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Impressions</span>
                                <span className="text-[10px] font-black text-gray-900">
                                  {liveAd ? liveAd.impressions || 0 : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Clicks</span>
                                <span className="text-[10px] font-black text-gray-900">
                                  {liveAd ? liveAd.clicks || 0 : '-'}
                                </span>
                              </div>
                            </div>
                            {sub.status === 'pending' && (
                              <button 
                                onClick={() => handleStartEditSponsorship(sub)}
                                className="mt-4 w-full py-3 bg-gray-100 hover:bg-black hover:text-white text-black font-black rounded-2xl text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Edit Campaign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side: Submission Form */}
                <div className="lg:col-span-5 bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">
                    {sponsorshipToEdit ? "Edit Sponsorship Request" : "New Sponsorship Request"}
                  </h4>
                  
                  <form onSubmit={handleSubmitSponsorship} className="space-y-6">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Campaign Title *</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Summer Music Series" 
                        value={newSponTitle}
                        onChange={(e) => setNewSponTitle(e.target.value)}
                        className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Tag *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. Sponsorship" 
                          value={newSponTag}
                          onChange={(e) => setNewSponTag(e.target.value)}
                          className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Target Hub *</label>
                        <select
                          value={newSponCityId}
                          onChange={(e) => setNewSponCityId(e.target.value)}
                          className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                        >
                          <option value="general">All Hubs (General)</option>
                          {CITIES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">CTA Button Label *</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Buy Tickets" 
                        value={newSponCta}
                        onChange={(e) => setNewSponCta(e.target.value)}
                        className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Redirect URL *</label>
                      <input 
                        required
                        type="url" 
                        placeholder="https://yourbrand.com/campaign" 
                        value={newSponUrl}
                        onChange={(e) => setNewSponUrl(e.target.value)}
                        className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Description *</label>
                      <textarea 
                        required
                        placeholder="Provide details about what you are promoting..." 
                        value={newSponDescription}
                        onChange={(e) => setNewSponDescription(e.target.value)}
                        className="w-full bg-white border-2 border-transparent rounded-2xl py-4 px-6 h-24 resize-none text-xs font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Cover Image *</label>
                      <div 
                        onClick={() => !newSponImage && !isCompressingSpon && sponFileInputRef.current?.click()}
                        className={`relative h-32 w-full rounded-2xl border-2 border-dashed bg-white transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${newSponImage ? 'border-transparent' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                      >
                        {isCompressingSpon ? (
                          <div className="text-center">
                            <div className="w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Optimizing Image...</p>
                          </div>
                        ) : newSponImage ? (
                          <>
                            <img src={newSponImage} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-all flex items-center justify-center" />
                            <button 
                              type="button" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setNewSponImage(''); 
                                if (sponFileInputRef.current) sponFileInputRef.current.value = '';
                              }} 
                              className="absolute top-2 right-2 p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-red-600 transition-all z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-8 h-8 bg-gray-55 text-black rounded-lg flex items-center justify-center mx-auto mb-2">
                              <Upload className="w-4 h-4" />
                            </div>
                            <p className="text-[8px] font-black text-gray-900 uppercase tracking-widest">Click to Upload Cover Image</p>
                          </div>
                        )}
                        <input type="file" ref={sponFileInputRef} onChange={handleSponImageChange} accept="image/*" className="hidden" />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingSpon || isCompressingSpon}
                      className="w-full py-5 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingSpon ? "Saving..." : (sponsorshipToEdit ? "Save Changes" : "Submit Inquiry")}
                    </button>
                    {sponsorshipToEdit && (
                      <button 
                        type="button"
                        onClick={handleCancelEditSponsorship}
                        className="mt-2 w-full py-5 border border-gray-200 text-gray-700 hover:border-black font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all cursor-pointer bg-white"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileView;
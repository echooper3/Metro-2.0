import React, { useState } from 'react';
import { X, Shield, ArrowRight, User, Mail, Lock, Phone, MapPin, Calendar, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (userData: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    birthday: '',
    zip_code: '',
    user_id: ''
  });

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onSuccess({
          user_id: result.user.uid,
          first_name: result.user.displayName?.split(' ')[0] || 'Member',
          last_name: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          email: result.user.email
        });
        onClose();
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (mode === 'LOGIN') {
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        if (result.user) {
          onSuccess({
            user_id: result.user.uid,
            first_name: result.user.displayName?.split(' ')[0] || 'Member',
            email: result.user.email
          });
          onClose();
        }
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (result.user) {
          await updateProfile(result.user, {
            displayName: `${formData.first_name} ${formData.last_name}`
          });
          
          const profileData = {
            id: result.user.uid,
            name: `${formData.first_name} ${formData.last_name}`,
            email: formData.email,
            phone: formData.phone,
            birthday: formData.birthday,
            zipCode: formData.zip_code,
            metroId: formData.user_id,
            savedEvents: [],
            preferences: { favoriteCategories: [] },
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'users', result.user.uid), profileData);
          
          onSuccess({
            user_id: result.user.uid,
            first_name: formData.first_name,
            email: formData.email
          });
          onClose();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed";
      if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
      else if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      else if (err.code === 'auth/email-already-in-use') msg = "An account already exists with this email.";
      else if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      else if (err.code === 'auth/operation-not-allowed') msg = "Email/Password sign-in is not enabled. Please contact the administrator.";
      else if (err.code === 'auth/invalid-email') msg = "Invalid email address format.";
      else if (err.code === 'permission-denied') msg = "Database access denied. Please try again.";
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-12 text-sm font-bold focus:bg-white focus:border-black outline-none transition-all placeholder:text-gray-300";
  const labelClasses = "text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
        className="relative bg-white rounded-[3rem] w-full max-w-xl p-10 md:p-16 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <button onClick={onClose} className="absolute top-10 right-10 p-3 bg-gray-100 hover:bg-black hover:text-white rounded-2xl transition-all z-10">
          <X className="w-6 h-6" />
        </button>

        <header className="mb-12 text-center">
          <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 rotate-6 shadow-xl shadow-black/10">
            <span className="text-white font-black text-3xl italic">M</span>
          </div>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full mb-4">
            <Shield className="w-3 h-3 text-orange-600" />
            <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[9px]">Secure Metropolitan Access</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic">{mode === 'LOGIN' ? 'Member Login' : 'Join The Metro'}</h2>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex bg-gray-50 p-2 rounded-3xl mb-10">
          <button 
            onClick={() => setMode('LOGIN')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-black'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setMode('SIGNUP')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'SIGNUP' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-black'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4 mb-10">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full py-5 bg-white border-2 border-gray-100 text-gray-900 font-black rounded-2xl hover:border-black transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-black/5"
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </motion.button>
          
          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Or Metropolitan ID</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'SIGNUP' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelClasses}>First Name</label>
                  <input required type="text" className={inputClasses} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="Jane" />
                  <User className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
                </div>
                <div className="relative">
                  <label className={labelClasses}>Last Name</label>
                  <input required type="text" className={inputClasses} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="Doe" />
                  <User className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
                </div>
              </div>

              <div className="relative">
                <label className={labelClasses}>User ID</label>
                <input required type="text" className={inputClasses} value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} placeholder="metro_jane_99" />
                <User className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
              </div>
            </>
          )}

          <div className="relative">
            <label className={labelClasses}>Email Address</label>
            <input required type="email" className={inputClasses} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@metro.com" />
            <Mail className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
          </div>

          <div className="relative">
            <label className={labelClasses}>Password</label>
            <input required type="password" className={inputClasses} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            <Lock className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
          </div>

          {mode === 'SIGNUP' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelClasses}>Phone</label>
                  <input required type="tel" className={inputClasses} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(555) 000-0000" />
                  <Phone className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
                </div>
                <div className="relative">
                  <label className={labelClasses}>Zip Code</label>
                  <input required type="text" className={inputClasses} value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} placeholder="74101" />
                  <MapPin className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
                </div>
              </div>

              <div className="relative">
                <label className={labelClasses}>Birthday</label>
                <input required type="date" className={inputClasses} value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
                <Calendar className="absolute left-4 top-[42px] w-4 h-4 text-gray-300" />
              </div>
            </>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-6 bg-black text-white font-black rounded-[2rem] hover:bg-orange-600 transition-all shadow-2xl shadow-black/10 uppercase tracking-[0.2em] text-[11px] mt-8 active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'LOGIN' ? 'Enter The Metro' : 'Create Metro ID'}
                <ArrowRight className="w-4 h-4 ml-3" />
              </>
            )}
          </motion.button>

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center mt-8">
            {mode === 'LOGIN' ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
              className="text-black hover:text-orange-600 transition-colors"
            >
              {mode === 'LOGIN' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthModal;


import React, { useState } from 'react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (userData: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      onSuccess(formData);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  const inputClasses = "w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-300";
  const labelClasses = "text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-gray-400 hover:text-orange-600 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <header className="mb-10 text-center">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <span className="text-white font-black text-2xl">M</span>
          </div>
          <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Secure Access</span>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Member Login</h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>First Name</label>
              <input required type="text" className={inputClasses} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="Jane" />
            </div>
            <div>
              <label className={labelClasses}>Last Name</label>
              <input required type="text" className={inputClasses} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className={labelClasses}>User ID</label>
            <input required type="text" className={inputClasses} value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} placeholder="metro_jane_99" />
          </div>

          <div>
            <label className={labelClasses}>Email Address</label>
            <input required type="email" className={inputClasses} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
          </div>

          <div>
            <label className={labelClasses}>Password</label>
            <input required type="password" className={inputClasses} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Phone Number</label>
              <input required type="tel" className={inputClasses} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className={labelClasses}>Zip Code</label>
              <input required type="text" className={inputClasses} value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} placeholder="74101" />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Birthday</label>
            <input required type="date" className={inputClasses} value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 uppercase tracking-[0.2em] text-xs mt-4 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : 'Enter The Metro'}
          </button>

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center mt-6">
            By entering, you agree to our terms and privacy policy.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

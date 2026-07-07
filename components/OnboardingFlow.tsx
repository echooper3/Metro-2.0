import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, Target, ArrowRight, X, Globe, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { City, Category, UserProfile } from '../types';
import { CITIES, CATEGORIES } from '../constants';

interface OnboardingFlowProps {
  user: UserProfile | null;
  onComplete: (data: { favoriteCity: string; favoriteCategories: Category[]; isOrganizer?: boolean; accountType?: 'individual' | 'organizer' | 'business' }) => void;
  onClose: () => void;
  isDismissible?: boolean;
  onSignInClick?: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onComplete, onClose, isDismissible = true, onSignInClick }) => {
  const [step, setStep] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>(user?.preferences?.favoriteCity || '');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(user?.preferences?.favoriteCategories || []);
  const [accountType, setAccountType] = useState<'individual' | 'organizer' | 'business'>(
    user?.accountType || (user?.isOrganizer ? 'organizer' : 'individual')
  );

  const totalSteps = 5;

  const toggleCategory = (cat: Category) => {
    if (cat === 'All') return;
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleFinish();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    onComplete({
      favoriteCity: selectedCity,
      favoriteCategories: selectedCategories,
      isOrganizer: accountType === 'organizer',
      accountType: accountType
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  };

  const stepVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/80 backdrop-blur-xl"
        onClick={isDismissible ? onClose : undefined}
      />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          {[...Array(totalSteps)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 transition-all duration-500 ${i + 1 <= step ? 'bg-orange-500' : 'bg-gray-100'}`} 
            />
          ))}
        </div>

        {/* Close Button */}
        {isDismissible && (
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}

        <div className="p-8 md:p-12 overflow-y-auto">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={1}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="space-y-8"
              >
                <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-gray-900 leading-none">
                    Welcome to Inside <span className="text-orange-500">The Metro.</span>
                  </h1>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest max-w-md">
                    A local discovery platform that helps you explore what's happening inside your city.
                  </p>
                  
                  {onSignInClick && !user && (
                    <div className="flex items-center justify-between p-5 bg-orange-50/50 border border-orange-100 rounded-[1.5rem] mt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Already a Metropolitan member?</span>
                      <button 
                        type="button"
                        onClick={onSignInClick}
                        className="px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md shadow-black/10"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <Zap className="w-5 h-5 text-orange-500 mb-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-2">Live Intelligence</h3>
                    <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed">Real-time data feeds powered by metropolitan node networks.</p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <Target className="w-5 h-5 text-orange-500 mb-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-2">Deep Discovery</h3>
                    <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed">Uncover hyper-local activities hidden in the urban noise.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={1}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-900">Select Primary City</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {CITIES.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => setSelectedCity(city.name)}
                      className={`group relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                        selectedCity === city.name 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-100 bg-white hover:border-black'
                      }`}
                    >
                      <div className="relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1">
                          {city.name}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {city.state}
                        </span>
                      </div>
                      {selectedCity === city.name && (
                        <div className="absolute top-4 right-4 z-10">
                          <CheckCircle2 className="w-4 h-4 text-orange-500" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={1}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-900">Signaling Interests</h2>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select categories to personalize your metropolitan feed.</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-6 py-4 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${
                        selectedCategories.includes(cat)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                custom={1}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-900">Choose Role</h2>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select the type of account you want to establish.</p>
                
                <div className="grid grid-cols-1 gap-4 max-h-[320px] overflow-y-auto pr-1">
                  {(['individual', 'organizer', 'business'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4 ${
                        accountType === type
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-100 bg-white hover:border-black'
                      }`}
                    >
                      <div className="flex-grow">
                        <h4 className="text-xs font-black text-gray-900 uppercase">
                          {type === 'individual' ? 'Individual Member' : type === 'organizer' ? 'Event Organizer' : 'Business Partner'}
                        </h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {type === 'individual' && 'Browse, save events to your personal vault, and connect with the community.'}
                          {type === 'organizer' && 'Establish official organization hubs, post public/private events, and manage members.'}
                          {type === 'business' && 'Promote sponsored events, upload sponsorships, and connect with metropolitan audiences.'}
                        </p>
                      </div>
                      {accountType === type && (
                        <div className="mt-1">
                          <CheckCircle2 className="w-4 h-4 text-orange-500" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                custom={1}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="space-y-8 text-center"
              >
                <div className="w-20 h-20 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-200">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Signal Lock.</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                    Personalized hub synchronization protocol initialized. You are now connected to the metropolitan pulse.
                  </p>
                </div>
                
                <div className="max-w-xs mx-auto p-6 bg-gray-50 rounded-[2rem] border border-gray-100 text-left">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-gray-400">Primary City</span>
                      <span className="text-[9px] font-black uppercase text-black">{selectedCity || 'None'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-gray-400">Interests</span>
                      <span className="text-[9px] font-black uppercase text-black">{selectedCategories.length} Locked</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-gray-400">Account Role</span>
                      <span className="text-[9px] font-black uppercase text-black">
                        {accountType === 'individual' ? 'Individual' : accountType === 'organizer' ? 'Organizer' : 'Business'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={prevStep}
            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-black'}`}
          >
            Previous
          </button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextStep}
            disabled={step === 2 && !selectedCity}
            className={`px-10 py-5 rounded-2xl flex items-center gap-3 transition-all ${
              (step === 2 && !selectedCity) 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-black text-white shadow-xl shadow-gray-200'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest">
              {step === totalSteps ? (user ? 'Enter The Metro' : 'Sign Up to Enter') : 'Next'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;

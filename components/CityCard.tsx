import React from 'react';
import { City } from '../types';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface CityCardProps {
  city: City;
  onClick: (city: City) => void;
}

const CityCard: React.FC<CityCardProps> = ({ city, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(city)}
      className="group relative h-[500px] overflow-hidden rounded-[3rem] cursor-pointer shadow-2xl shadow-black/5"
    >
      <img 
        src={city.image} 
        alt={city.name} 
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      
      <div className="absolute top-8 left-8">
        <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">
          {city.state}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 p-10 text-white w-full">
        <h3 className="text-5xl font-black mb-4 tracking-tighter uppercase italic">{city.name}</h3>
        <p className="text-sm text-white/60 font-medium leading-relaxed mb-8 max-w-[280px] opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
          {city.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-orange-500">
            Explore Metro
            <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-2 transition-transform" />
          </div>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:border-orange-600 transition-all duration-500">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CityCard;

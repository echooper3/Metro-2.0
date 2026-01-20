
import React, { memo } from 'react';
import { City } from '../types';

interface CityCardProps {
  city: City;
  onClick: (city: City) => void;
}

const CityCard: React.FC<CityCardProps> = memo(({ city, onClick }) => {
  return (
    <div 
      onClick={() => onClick(city)}
      className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer shadow-lg transition-all duration-300 hover:scale-[1.02]"
    >
      <img 
        src={city.image} 
        alt={city.name} 
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 text-white w-full">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-1 block">
          {city.state}
        </span>
        <h3 className="text-3xl font-extrabold mb-2">{city.name}</h3>
        <p className="text-sm text-gray-200 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {city.description}
        </p>
        <div className="mt-4 flex items-center text-sm font-semibold text-orange-300">
          Explore Activities
          <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  );
});

export default CityCard;

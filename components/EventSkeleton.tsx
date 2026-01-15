
import React from 'react';

const EventSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
        <div className="h-4 w-16 bg-gray-100 rounded"></div>
      </div>
      <div className="h-7 w-3/4 bg-gray-200 rounded mb-3"></div>
      <div className="space-y-2 mb-6">
        <div className="h-3 w-full bg-gray-100 rounded"></div>
        <div className="h-3 w-full bg-gray-100 rounded"></div>
        <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
        <div className="h-3 w-32 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
};

export default EventSkeleton;

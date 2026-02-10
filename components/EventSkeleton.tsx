
import React from 'react';

// Component for displaying a loading skeleton for event cards during data fetching
const EventSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse flex flex-col h-full shadow-sm">
      <div className="h-52 w-full bg-gray-200" />
      <div className="p-7 flex flex-col flex-grow">
        <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3" />
        <div className="h-6 bg-gray-200 rounded-md w-1/2 mb-6" />
        
        <div className="space-y-2 mb-6">
          <div className="h-3 bg-gray-100 rounded-md w-full" />
          <div className="h-3 bg-gray-100 rounded-md w-full" />
          <div className="h-3 bg-gray-100 rounded-md w-2/3" />
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-100 mr-3" />
            <div className="h-3 bg-gray-100 rounded-md w-1/2" />
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-100 mr-3" />
            <div className="h-3 bg-gray-100 rounded-md w-1/3" />
          </div>
        </div>

        <div className="mt-6 w-full h-12 bg-gray-200 rounded-2xl shadow-sm" />
      </div>
    </div>
  );
};

export default EventSkeleton;


import React from 'react';

// Component for displaying a high-fidelity loading skeleton for event cards
const EventSkeleton: React.FC = () => {
  return (
    <div className="group bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse flex flex-col h-full shadow-sm">
      {/* Image Area Placeholder */}
      <div className="relative h-52 w-full bg-gray-200">
        {/* Badge placeholders in top corners */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="h-6 w-16 bg-gray-300 rounded-full" />
          <div className="h-6 w-12 bg-gray-300 rounded-lg" />
        </div>
        <div className="absolute top-4 right-4">
          <div className="h-6 w-20 bg-gray-300 rounded-full" />
        </div>
      </div>

      <div className="p-7 flex flex-col flex-grow">
        {/* Title Placeholder */}
        <div className="mb-3 space-y-2">
          <div className="h-5 bg-gray-200 rounded-md w-11/12" />
          <div className="h-5 bg-gray-200 rounded-md w-2/3" />
        </div>
        
        {/* Description Placeholder */}
        <div className="space-y-2 mb-6">
          <div className="h-3 bg-gray-100 rounded-md w-full" />
          <div className="h-3 bg-gray-100 rounded-md w-full" />
          <div className="h-3 bg-gray-100 rounded-md w-4/5" />
        </div>

        {/* Read More Button Placeholder */}
        <div className="mt-2 h-10 w-full bg-gray-50 rounded-xl border border-gray-100" />

        {/* Footer Info Placeholder (Location/Time) */}
        <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-4">
          <div className="flex items-start">
            <div className="w-4 h-4 rounded-full bg-gray-200 mt-0.5 mr-3 shrink-0" />
            <div className="space-y-2 flex-grow">
              <div className="h-3 bg-gray-200 rounded-md w-1/2" />
              <div className="h-2 bg-gray-100 rounded-md w-1/3" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-200 mr-3 shrink-0" />
            <div className="h-3 bg-gray-200 rounded-md w-2/5" />
          </div>
        </div>

        {/* Bottom Action Button Placeholder */}
        <div className="mt-6 w-full h-14 bg-gray-200 rounded-2xl shadow-sm" />
      </div>
    </div>
  );
};

export default EventSkeleton;

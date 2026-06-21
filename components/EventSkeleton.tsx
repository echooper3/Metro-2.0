import React from 'react';

interface EventSkeletonProps {
  isTrending?: boolean;
}

const EventSkeleton: React.FC<EventSkeletonProps> = ({ isTrending }) => {
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow duration-500">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        
        <div className="absolute top-6 left-6 flex gap-2">
          <div className="h-8 w-24 bg-gray-200/40 backdrop-blur-md rounded-2xl border border-white/20" />
          {isTrending && <div className="h-8 w-28 bg-gray-200/40 backdrop-blur-md rounded-2xl border border-white/20" />}
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow bg-white">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-5 h-5 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 w-36 bg-gray-100 rounded-full animate-pulse" />
        </div>

        <div className="space-y-3 mb-8">
          <div className="h-8 w-full bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-8 w-3/4 bg-gray-100 rounded-xl animate-pulse" />
        </div>

        <div className="space-y-3 mb-10">
          <div className="h-3 w-full bg-gray-50 rounded-full animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-50 rounded-full animate-pulse" />
          <div className="h-3 w-4/6 bg-gray-50 rounded-full animate-pulse" />
        </div>

        <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default EventSkeleton;

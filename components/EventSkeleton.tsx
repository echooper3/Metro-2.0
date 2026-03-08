import React from 'react';

interface EventSkeletonProps {
  isTrending?: boolean;
}

const EventSkeleton: React.FC<EventSkeletonProps> = ({ isTrending }) => {
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 animate-pulse flex flex-col h-full shadow-sm">
      <div className="relative aspect-[4/3] bg-gray-200">
        <div className="absolute top-6 left-6 flex gap-2">
          <div className="h-8 w-20 bg-gray-300 rounded-2xl" />
          {isTrending && <div className="h-8 w-24 bg-gray-300 rounded-2xl" />}
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-4 h-4 bg-gray-200 rounded-full" />
          <div className="h-3 w-24 bg-gray-200 rounded-full" />
        </div>

        <div className="space-y-3 mb-4">
          <div className="h-6 w-full bg-gray-300 rounded-lg" />
          <div className="h-6 w-2/3 bg-gray-300 rounded-lg" />
        </div>

        <div className="space-y-2 mb-8">
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="h-3 w-4/5 bg-gray-100 rounded-full" />
        </div>

        <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded-full mr-2" />
            <div className="h-3 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default EventSkeleton;

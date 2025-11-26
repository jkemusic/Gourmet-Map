import React from 'react';
import { CheckIn } from '../types';
import { StarRating } from './StarRating';
import { Clock } from 'lucide-react';

interface TimelineProps {
  checkIns: CheckIn[];
}

export const Timeline: React.FC<TimelineProps> = ({ checkIns }) => {
  if (checkIns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm italic">
        尚未有打卡紀錄。成為第一個吧！
      </div>
    );
  }

  // Sort by latest
  const sorted = [...checkIns].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">歷史紀錄</h3>
      <div className="border-l-2 border-indigo-100 pl-4 space-y-6">
        {sorted.map((checkIn) => (
          <div key={checkIn.id} className="relative group">
            {/* Timeline dot */}
            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white shadow-sm group-hover:bg-indigo-600 transition" />
            
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                   <StarRating rating={checkIn.rating} size={14} />
                   <span className="text-xs text-gray-400 flex items-center">
                     <Clock size={10} className="mr-1" />
                     {new Date(checkIn.timestamp).toLocaleDateString('zh-TW')}
                   </span>
                </div>
              </div>
              
              {checkIn.text && (
                <p className="text-sm text-gray-700 mb-2">{checkIn.text}</p>
              )}
              
              {checkIn.image && (
                <div className="rounded-md overflow-hidden mt-2 max-h-40 w-full bg-gray-50">
                   <img src={checkIn.image} alt="Check-in" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
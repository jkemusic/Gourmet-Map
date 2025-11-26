import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2 } from 'lucide-react';
import { Place, CheckIn } from '../types';
import { StarRating } from './StarRating';
import { analyzeFoodPhoto } from '../services/geminiService';

interface CheckInModalProps {
  place: Place;
  isOpen: boolean;
  onClose: () => void;
  onSave: (checkIn: Omit<CheckIn, 'id' | 'timestamp'>) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  place,
  isOpen,
  onClose,
  onSave,
}) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);

        // Auto-fill text with AI if empty
        if (!text) {
            setIsAnalyzing(true);
            const pureBase64 = base64.split(',')[1];
            const description = await analyzeFoodPhoto(pureBase64);
            setText(description);
            setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (rating === 0) {
      alert("請給予評分！");
      return;
    }
    onSave({
      placeId: place.id,
      rating,
      text,
      image: image || undefined
    });
    // Reset
    setRating(0);
    setText('');
    setImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="font-semibold text-lg">在 {place.name} 打卡</h2>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Rating Section */}
          <div className="flex flex-col items-center space-y-2">
            <span className="text-gray-600 font-medium">體驗如何？</span>
            <StarRating rating={rating} maxStars={5} interactive onRate={setRating} size={32} />
          </div>

          {/* Photo Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">照片</label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Camera size={32} />
                  <span className="mt-2 text-sm">點擊拍照或上傳</span>
                </div>
              )}
              
              {/* Overlay for change */}
              {image && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                   <Upload className="text-white" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>

          {/* Text Section */}
          <div className="space-y-2 relative">
            <label className="block text-sm font-medium text-gray-700">筆記</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px]"
              placeholder="吃了什麼？氣氛如何？"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
             {isAnalyzing && (
                <div className="absolute top-8 right-2 flex items-center space-x-1 text-xs text-indigo-600 bg-white/90 p-1 rounded shadow-sm">
                    <Loader2 size={12} className="animate-spin" />
                    <span>AI 正在生成描述...</span>
                </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            儲存打卡
          </button>
        </div>
      </div>
    </div>
  );
};
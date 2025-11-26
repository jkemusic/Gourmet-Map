import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxStars = 5, 
  interactive = false, 
  onRate,
  size = 16
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;

        return (
          <Star
            key={index}
            size={size}
            className={`
              transition-colors duration-150
              ${isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              ${interactive ? 'cursor-pointer hover:scale-110' : ''}
            `}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            onClick={() => interactive && onRate && onRate(starValue)}
          />
        );
      })}
    </div>
  );
};
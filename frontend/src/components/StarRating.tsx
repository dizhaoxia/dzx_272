import React from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

const sizeMap = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export function StarRating({ value, onChange, size = 'md', readonly }: StarRatingProps) {
  return (
    <div className={`inline-flex ${sizeMap[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={readonly ? undefined : () => onChange?.(star)}
          className={`leading-none ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition'
          }`}
        >
          <span className={star <= Math.round(value) ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        </span>
      ))}
    </div>
  );
}

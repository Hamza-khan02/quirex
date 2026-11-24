import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const STARS = [1, 2, 3, 4, 5];

// Read-only stars, rounded to the nearest half.
const StarRating = ({ value = 0, className = '' }) => (
  <span className={`star-rating ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
    {STARS.map((star) => {
      if (value >= star) return <FaStar key={star} />;
      if (value >= star - 0.5) return <FaStarHalfAlt key={star} />;
      return <FaRegStar key={star} />;
    })}
  </span>
);

// Clickable stars for choosing a rating from 1 to 5.
export const StarInput = ({ value, onChange }) => (
  <div className="star-rating star-input" role="radiogroup" aria-label="Rating">
    {STARS.map((star) => (
      <button
        key={star}
        type="button"
        role="radio"
        aria-checked={value === star}
        aria-label={`${star} star${star > 1 ? 's' : ''}`}
        onClick={() => onChange(star)}
        className="star-button"
      >
        {value >= star ? <FaStar /> : <FaRegStar />}
      </button>
    ))}
  </div>
);

export default StarRating;

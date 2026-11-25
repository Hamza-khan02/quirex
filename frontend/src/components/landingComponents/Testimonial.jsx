import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import { FaQuoteLeft } from 'react-icons/fa';
import StarRating from '../common/StarRating';
import { api } from '../../config/api';

// The newest 4- and 5-star reviews written on the site. Hidden until there
// are some.
const Testimonial = () => {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api.get('/api/featured-reviews').then((response) => {
      if (response?.data?.code == 200) setReviews(response.data.data);
    });
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="row py-5 background">
      <div className="text-center">
        <div className="tagline">Reviews</div>
        <h2 className="section-title">What Our Customers Say</h2>
      </div>
      <div className="col-sm-10 mx-auto">
        <div className="row g-4 py-3 justify-content-center">
          {reviews.map((review) => (
            <div key={review._id} className="col-md-4">
              <div className="amenity-card review-card h-100 text-start d-flex flex-column">
                <FaQuoteLeft className="icons fs-3 mb-2" />
                <p className="featuredp flex-grow-1">{review.comment}</p>
                <div className="d-flex align-items-center gap-3">
                  <span className="avatar-initial" aria-hidden="true">{review.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <b>{review.name}</b>
                    <div><StarRating value={review.rating} /></div>
                    <Link to={`/property/${review.propertyId}`} className="small text-decoration-none">{review.propertyTitle}</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Testimonial

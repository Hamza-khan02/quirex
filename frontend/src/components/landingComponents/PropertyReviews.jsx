import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import StarRating, { StarInput } from '../common/StarRating';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';

// Reviews of one property. Users can write, update and delete their own
// review; admins can delete any review. `onChange` runs after any change so
// the page can refresh the property's average rating.
const PropertyReviews = ({ propertyId, onChange }) => {
  const user = getUser();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get(`/api/property/${propertyId}/reviews`);
    if (response?.data?.code == 200) setReviews(response.data.data);
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const mine = reviews.find((review) => user && review.userId === user._id);

  // Start the form from the user's existing review, if there is one.
  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? '');
  }, [mine?._id, mine?.rating, mine?.comment]);

  const submit = async (event) => {
    event.preventDefault();
    if (rating < 1) {
      Swal.fire({ title: 'Review', text: 'Please choose a rating from 1 to 5 stars.', icon: 'error' });
      return;
    }
    setSaving(true);
    const response = await api.post(`/api/property/${propertyId}/reviews`, { rating, comment });
    setSaving(false);
    Swal.fire({ title: 'Review', text: response?.data?.message, icon: response?.data?.code == 200 ? 'success' : 'error' });
    await load();
    onChange?.();
  };

  const remove = async (review) => {
    const confirm = await Swal.fire({
      title: 'Delete review?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!confirm.isConfirmed) return;
    const response = await api.post('/api/delete-review', { _id: review._id });
    Swal.fire({ title: 'Review', text: response?.data?.message, icon: response?.data?.code == 200 ? 'success' : 'error' });
    await load();
    onChange?.();
  };

  const canDelete = (review) => user && (review.userId === user._id || user.userType === 'admin');
  const showForm = user?.userType === 'user';

  return (
    <div className="mt-5">
      <h4 className="fw-bold mb-3">Reviews</h4>
      <div className="row g-4">
        {user?.userType !== 'admin' && (
          <div className="col-lg-5">
            {showForm ? (
              <form onSubmit={submit} className="form-box">
                <h6 className="fw-bold">{mine ? 'Update your review' : 'Write a review'}</h6>
                <StarInput value={rating} onChange={setRating} />
                <textarea
                  className="form-control mt-2"
                  rows="3"
                  maxLength={1000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your thoughts (optional)"
                  aria-label="Review comment"
                />
                <button type="submit" disabled={saving} className="btn btn1 px-4 mt-3">
                  {mine ? 'Update Review' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="form-box">
                <p className="mb-3">Log in to rate this property.</p>
                <Link to="/login" className="btn btn1 px-4">Login</Link>
              </div>
            )}
          </div>
        )}

        <div className={user?.userType === 'admin' ? 'col-12' : 'col-lg-7'}>
          {reviews.length == 0 && <p className="featuredp">No reviews yet.</p>}
          {reviews.map((review) => (
            <div key={review._id} className="amenity-card text-start mb-3 review-card">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <b>{review.name}</b>
                  {review.userId === user?._id && <span className="badge bg-secondary ms-2">You</span>}
                  <div><StarRating value={review.rating} /></div>
                </div>
                <div className="text-end">
                  <small className="featuredp">{new Date(review.createdAt).toLocaleDateString()}</small>
                  {canDelete(review) && (
                    <div>
                      <button type="button" onClick={() => remove(review)} className="btn btn-sm btn-outline-danger mt-1">Delete</button>
                    </div>
                  )}
                </div>
              </div>
              {review.comment && <p className="featuredp mb-0 mt-2 message-cell">{review.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyReviews;

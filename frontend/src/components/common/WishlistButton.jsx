import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';

// Heart that saves a property to the user's wishlist. Visitors are sent to
// log in; admins don't get the button.
const WishlistButton = ({ property, onChange, className = '' }) => {
  const navigate = useNavigate();
  const user = getUser();
  const [saved, setSaved] = useState(Boolean(property?.isSaved));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(Boolean(property?.isSaved));
  }, [property?.isSaved]);

  if (user?.userType === 'admin') return null;

  const toggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(true);
    const response = await api.post('/api/wishlist-toggle', { propertyId: property._id });
    setBusy(false);
    if (response?.data?.code == 200) {
      setSaved(response.data.data.saved);
      onChange?.(response.data.data.saved);
    } else {
      Swal.fire({ title: 'Wishlist', text: response?.data?.message, icon: 'error' });
    }
  };

  const label = saved ? 'Remove from wishlist' : 'Save to wishlist';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`wishlist-button ${saved ? 'saved' : ''} ${className}`}
      aria-label={label}
      aria-pressed={saved}
      title={label}
    >
      {saved ? <FaHeart /> : <FaRegHeart />}
    </button>
  );
};

export default WishlistButton;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';
import { STATUS_LABELS, formatPrice } from '../../config/property';

// "Buy" for sale listings, "Rent" for rentals. Clicking sends a request that
// the admin approves. Taken properties get a disabled Sold/Rented button, a
// pending request shows "Request Sent", visitors are sent to log in, and
// admins (who don't buy) get no button at all.
const BuyButton = ({ property, onBought, className = '' }) => {
  const navigate = useNavigate();
  const user = getUser();
  const isRent = property?.listingType === 'rent';
  const action = isRent ? 'Rent' : 'Buy';

  if (property?.isSold) {
    return (
      <button className={`btn btn-secondary ${className}`} disabled>
        {STATUS_LABELS[property.status] ?? 'Sold'}
      </button>
    );
  }
  if (property?.hasPendingRequest) {
    return (
      <button className={`btn btn-secondary ${className}`} disabled title="Waiting for the admin to review your request">
        Request Sent
      </button>
    );
  }
  if (!user) {
    return <button onClick={() => navigate('/login')} className={`btn btn-outline-danger ${className}`}>Login to {action}</button>;
  }
  if (user.userType !== 'user') return null;

  const handleClick = async () => {
    const confirm = await Swal.fire({
      title: `${action} Property`,
      text: `Send a request to ${action.toLowerCase()} "${property.title}" for ${formatPrice(property.price, property.listingType)}? The admin will review it, and you can follow it under Requests.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, send request',
    });
    if (!confirm.isConfirmed) return;

    const response = await api.post('/api/buy', { propertyId: property._id });
    Swal.fire({
      title: `${action} Property`,
      text: response?.data?.message,
      icon: response?.data?.code == 200 ? 'success' : 'error',
    });
    onBought?.();
  };

  return <button onClick={handleClick} className={`btn btn-outline-danger ${className}`}>{action}</button>;
};

export default BuyButton;

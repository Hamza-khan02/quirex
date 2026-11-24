import React from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';

// Sold properties get a disabled "Sold" button, visitors are sent to log in,
// and admins (who don't buy) get no button at all.
const BuyButton = ({ property, onBought, className = '' }) => {
  const navigate = useNavigate();
  const user = getUser();

  if (property?.isSold) {
    return <button className={`btn btn-secondary ${className}`} disabled>Sold</button>;
  }
  if (!user) {
    return <button onClick={() => navigate('/login')} className={`btn btn-outline-danger ${className}`}>Login to Buy</button>;
  }
  if (user.userType !== 'user') return null;

  const handleBuy = async () => {
    const confirm = await Swal.fire({
      title: 'Buy Property',
      text: `Buy "${property.title}" for $${property.price}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, buy it',
    });
    if (!confirm.isConfirmed) return;

    const response = await api.post('/api/buy', { propertyId: property._id });
    Swal.fire({
      title: 'Buy Property',
      text: response?.data?.message,
      icon: response?.data?.code == 200 ? 'success' : 'error',
    });
    onBought?.();
  };

  return <button onClick={handleBuy} className={`btn btn-outline-danger ${className}`}>Buy</button>;
};

export default BuyButton;

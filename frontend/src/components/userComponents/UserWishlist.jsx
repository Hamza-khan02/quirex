import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../landingComponents/NavBar';
import PropertyCard from '../common/PropertyCard';
import BuyButton from '../common/BuyButton';
import { api } from '../../config/api';

const UserWishlist = () => {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get('/api/wishlist');
    if (response?.data?.code == 200) setItems(response.data.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Un-hearting a property removes it from this page straight away.
  const handleWishlistChange = (propertyId) => (saved) => {
    if (!saved) setItems((previous) => previous.filter((item) => item._id !== propertyId));
  };

  return (
    <>
      <NavBar />
      <div className='row property py-5'>
        <div className="text-center">
          <div className="tagline">Saved</div>
          <h2 className="section-title">My Wishlist</h2>
        </div>
        <div className='col-sm-10 mx-auto'>
          <div className='row g-4 py-3'>
            {items.map((item) => (
              <div key={item._id} className='col-sm-6 col-lg-3'>
                <PropertyCard property={item} onWishlistChange={handleWishlistChange(item._id)}>
                  <BuyButton property={item} onBought={load} className="w-100" />
                </PropertyCard>
              </div>
            ))}
          </div>
          {loaded && items.length == 0 && (
            <div className="text-center my-4">
              <h4>Your wishlist is empty.</h4>
              <p className="featuredp">Tap the heart on any property to save it here.</p>
              <Link to="/user-property" className="btn btn1 px-4">Browse Properties</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserWishlist;

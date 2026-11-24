import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoBedOutline, IoLocationOutline } from 'react-icons/io5';
import NavBar from './NavBar';
import BuyButton from '../common/BuyButton';
import { api, getImageUrl } from '../../config/api';
import { getUser } from '../../config/auth';

const backPathFor = (user) => {
  if (user?.userType === 'admin') return '/admin-list';
  if (user?.userType === 'user') return '/user-property';
  return '/property';
};

const PropertyDetail = () => {
  const { id } = useParams();
  const user = getUser();
  const [property, setProperty] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const fetchProperty = useCallback(async () => {
    const response = await api.get(`/api/property/${id}`);
    if (response?.data?.code == 200) {
      setProperty(response.data.data);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  return (
    <>
      <NavBar />
      <div className="container my-5">
        {notFound && (
          <div className="text-center py-5">
            <h2>Property not found</h2>
            <Link to={backPathFor(user)} className="btn btn1 px-4 mt-3">Back to properties</Link>
          </div>
        )}

        {!notFound && !property && <p className="text-center py-5">Loading...</p>}

        {!notFound && property && (
          <div className="row g-5 align-items-start">
            <div className="col-lg-7">
              <img src={getImageUrl(property.pic)} alt={property.title} className="img-fluid rounded shadow w-100 detail-img" />
            </div>
            <div className="col-lg-5">
              <div className="tagline">{property.isSold ? 'Sold' : 'For Sale'}</div>
              <h2 className="section-title mycolor2">{property.title}</h2>
              <p className="featuredp mb-2"><IoLocationOutline className="me-1" />{property.location}</p>
              <h3 className="mycolor1 fw-bold my-3">${property.price}</h3>
              <p className="d-flex align-items-center gap-2"><IoBedOutline /> {property.area} Bedroom</p>

              <h5 className="mt-4">Description</h5>
              <p className="featuredp">{property.description}</p>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <BuyButton property={property} onBought={fetchProperty} className="px-4" />
                {user?.userType === 'admin' ? (
                  <Link to={`/admin-edit/${property._id}`} className="btn btn-outline-primary px-4">Edit Property</Link>
                ) : (
                  <Link to={`/contact?property=${property._id}`} className="btn btn1 px-4">Enquire About This Property</Link>
                )}
              </div>

              <Link to={backPathFor(user)} className="d-inline-block mt-4 text-decoration-none">&larr; Back to properties</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PropertyDetail;

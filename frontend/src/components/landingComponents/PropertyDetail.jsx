import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoBedOutline, IoLocationOutline } from 'react-icons/io5';
import { BiArea } from 'react-icons/bi';
import NavBar from './NavBar';
import PropertyReviews from './PropertyReviews';
import BuyButton from '../common/BuyButton';
import StarRating from '../common/StarRating';
import WishlistButton from '../common/WishlistButton';
import { api, getImageUrl } from '../../config/api';
import { getUser } from '../../config/auth';
import { PROPERTY_TYPES, LISTING_TYPES, STATUS_LABELS, labelFor, formatPrice } from '../../config/property';

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
          <>
            <div className="row g-5 align-items-start">
              <div className="col-lg-7">
                <img src={getImageUrl(property.pic)} alt={property.title} className="img-fluid rounded shadow w-100 detail-img" />
              </div>
              <div className="col-lg-5">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <span className="tagline mb-0">{labelFor(LISTING_TYPES, property.listingType)}</span>
                  <span className="tagline mb-0">{labelFor(PROPERTY_TYPES, property.propertyType)}</span>
                  {property.status !== 'available' && <span className="tagline mb-0">{STATUS_LABELS[property.status]}</span>}
                </div>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <h2 className="section-title mycolor2">{property.title}</h2>
                  <WishlistButton property={property} className="flex-shrink-0 mt-1" />
                </div>
                {property.pendingRequests > 0 && (
                  <Link to="/admin-requests" className="badge bg-warning text-dark text-decoration-none mb-2">
                    {property.pendingRequests} pending request{property.pendingRequests > 1 ? 's' : ''}
                  </Link>
                )}
                <p className="featuredp mb-2"><IoLocationOutline className="me-1" />{property.location}</p>
                <p className="mb-2">
                  {property.rating?.count > 0 ? (
                    <>
                      <StarRating value={property.rating.average} />{' '}
                      <span className="featuredp">{property.rating.average} ({property.rating.count} {property.rating.count === 1 ? 'review' : 'reviews'})</span>
                    </>
                  ) : (
                    <span className="featuredp">No reviews yet</span>
                  )}
                </p>
                <h3 className="mycolor1 fw-bold my-3">{formatPrice(property.price, property.listingType)}</h3>
                <div className="d-flex flex-wrap gap-4 mb-2">
                  {property.bedrooms > 0 && <span className="d-flex align-items-center gap-2"><IoBedOutline /> {property.bedrooms} Bedroom{property.bedrooms > 1 ? 's' : ''}</span>}
                  {property.area > 0 && <span className="d-flex align-items-center gap-2"><BiArea /> {property.area.toLocaleString('en-US')} sq ft</span>}
                </div>

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

            <PropertyReviews propertyId={property._id} onChange={fetchProperty} />
          </>
        )}
      </div>
    </>
  );
};

export default PropertyDetail;

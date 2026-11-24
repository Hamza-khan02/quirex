import React from 'react';
import { Link } from 'react-router-dom';
import { IoBedOutline, IoLocationOutline } from 'react-icons/io5';
import { BiArea } from 'react-icons/bi';
import StarRating from './StarRating';
import { getImageUrl } from '../../config/api';
import { PROPERTY_TYPES, LISTING_TYPES, STATUS_LABELS, labelFor, formatPrice } from '../../config/property';

// One property in a grid. `children` is the action area at the bottom
// (Buy button for visitors and users, Edit/Delete for admins).
const PropertyCard = ({ property, children }) => {
  const detailPath = `/property/${property._id}`;
  return (
    <div className="card h-100 shadow-lg border border-0">
      <Link to={detailPath} className="position-relative">
        <img src={getImageUrl(property.pic)} className="card-img-top img-fluid featuredimg" alt={property.title} />
        <span className={`badge position-absolute top-0 start-0 m-2 ${property.listingType === 'rent' ? 'bg-info text-dark' : 'bg-success'}`}>
          {labelFor(LISTING_TYPES, property.listingType)}
        </span>
        {property.status && property.status !== 'available' && (
          <span className="badge bg-dark position-absolute top-0 end-0 m-2">{STATUS_LABELS[property.status]}</span>
        )}
      </Link>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <p className="mycolor1 mb-1"><b>{formatPrice(property.price, property.listingType)}</b></p>
          <span className="badge rounded-pill text-bg-light border">{labelFor(PROPERTY_TYPES, property.propertyType)}</span>
        </div>
        <h5 className="card-title mb-1">
          <Link to={detailPath} className="text-decoration-none"><b className="mycolor2">{property.title}</b></Link>
        </h5>
        <p className="featuredp small mb-2"><IoLocationOutline className="me-1" />{property.location}</p>
        {property.rating?.count > 0 && (
          <p className="small mb-2">
            <StarRating value={property.rating.average} /> <span className="featuredp">({property.rating.count})</span>
          </p>
        )}
        <p className="card-text featuredp property-description">{property.description}</p>
        <div className="d-flex flex-wrap gap-3 featuredp small mb-3">
          {property.bedrooms > 0 && <span><IoBedOutline className="me-1" />{property.bedrooms} Bed</span>}
          {property.area > 0 && <span><BiArea className="me-1" />{property.area.toLocaleString('en-US')} sq ft</span>}
        </div>
        <div className="mt-auto">{children}</div>
      </div>
    </div>
  );
};

export default PropertyCard;

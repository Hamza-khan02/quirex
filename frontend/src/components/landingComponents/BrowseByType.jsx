import React from 'react'
import { Link } from 'react-router-dom';
import { FaBuilding, FaStore } from 'react-icons/fa';
import { FaHouse, FaMapLocationDot } from 'react-icons/fa6';

const TYPES = [
  { value: 'house', label: 'Houses', icon: <FaHouse /> },
  { value: 'flat', label: 'Flats', icon: <FaBuilding /> },
  { value: 'shop', label: 'Shops', icon: <FaStore /> },
  { value: 'land', label: 'Land', icon: <FaMapLocationDot /> },
];

// One card per property type with its live count, linking to the filtered list.
const BrowseByType = ({ stats }) => {
  return (
    <div className="row py-5 bg">
      <div className="text-center">
        <div className="tagline">Categories</div>
        <h2 className="section-title">Browse by Type</h2>
      </div>
      <div className="col-sm-10 mx-auto">
        <div className="row g-4 py-3">
          {TYPES.map((type) => {
            const count = stats?.byType?.[type.value];
            return (
              <div key={type.value} className="col-6 col-md-3" data-aos="zoom-in">
                <Link to={`/property?propertyType=${type.value}`} className="text-decoration-none text-reset">
                  <div className="amenity-card h-100">
                    <div className="amenity-icon mx-auto mb-3"><span className="icons fs-4">{type.icon}</span></div>
                    <h5 className="fw-bold mb-1">{type.label}</h5>
                    <p className="featuredp mb-0">
                      {count === undefined ? '…' : `${count} ${count === 1 ? 'property' : 'properties'}`}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default BrowseByType

import React, { useEffect, useState } from 'react';
import { PROPERTY_TYPES, LISTING_TYPES } from '../../config/property';

const FIELDS = ['q', 'listingType', 'propertyType', 'location', 'minPrice', 'maxPrice', 'bedrooms', 'sort', 'available'];

const readValues = (searchParams) =>
  Object.fromEntries(FIELDS.map((field) => [field, searchParams.get(field) ?? '']));

// Search form for property lists. Applying it writes the filters into the URL
// query; usePropertySearch then loads the matching page.
const PropertyFilters = ({ searchParams, setSearchParams }) => {
  const [values, setValues] = useState(() => readValues(searchParams));

  // Keep the form in step when the URL changes (back button, links).
  useEffect(() => {
    setValues(readValues(searchParams));
  }, [searchParams]);

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((previous) => ({ ...previous, [name]: type === 'checkbox' ? (checked ? 'true' : '') : value }));
  };

  const apply = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [name, value] of Object.entries(values)) {
      if (value !== '') next.set(name, value);
    }
    setSearchParams(next);
  };

  const reset = () => setSearchParams(new URLSearchParams());

  return (
    <form onSubmit={apply} className="form-box mb-4" aria-label="Search properties">
      <div className="row g-3 align-items-end">
        <div className="col-lg-4 col-md-6">
          <label htmlFor="filter-q" className="form-label">Search</label>
          <input id="filter-q" name="q" value={values.q} onChange={update} className="form-control" placeholder="Title, location or keyword" />
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-listingType" className="form-label">Buy or Rent</label>
          <select id="filter-listingType" name="listingType" value={values.listingType} onChange={update} className="form-select">
            <option value="">All</option>
            {LISTING_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-propertyType" className="form-label">Type</label>
          <select id="filter-propertyType" name="propertyType" value={values.propertyType} onChange={update} className="form-select">
            <option value="">Any type</option>
            {PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div className="col-lg-4 col-md-6">
          <label htmlFor="filter-location" className="form-label">Location</label>
          <input id="filter-location" name="location" value={values.location} onChange={update} className="form-control" placeholder="City or area" />
        </div>

        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-minPrice" className="form-label">Min Price ($)</label>
          <input id="filter-minPrice" type="number" min="0" name="minPrice" value={values.minPrice} onChange={update} className="form-control" placeholder="No min" />
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-maxPrice" className="form-label">Max Price ($)</label>
          <input id="filter-maxPrice" type="number" min="0" name="maxPrice" value={values.maxPrice} onChange={update} className="form-control" placeholder="No max" />
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-bedrooms" className="form-label">Bedrooms</label>
          <select id="filter-bedrooms" name="bedrooms" value={values.bedrooms} onChange={update} className="form-select">
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <label htmlFor="filter-sort" className="form-label">Sort By</label>
          <select id="filter-sort" name="sort" value={values.sort} onChange={update} className="form-select">
            <option value="">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
        <div className="col-lg-2 col-md-6 col-6">
          <div className="form-check mb-2">
            <input id="filter-available" type="checkbox" name="available" checked={values.available === 'true'} onChange={update} className="form-check-input" />
            <label htmlFor="filter-available" className="form-check-label">Available only</label>
          </div>
        </div>
        <div className="col-lg-2 col-md-6 col-6 d-flex gap-2">
          <button type="submit" className="btn btn1 btn-sm flex-fill py-2">Search</button>
          <button type="button" onClick={reset} className="btn btn-sm btn-outline-secondary flex-fill py-2">Reset</button>
        </div>
      </div>
    </form>
  );
};

export default PropertyFilters;

import React from 'react'
import { Link, useLocation } from "react-router-dom";
import NavBar from './NavBar';
import BuyButton from '../common/BuyButton';
import PropertyCard from '../common/PropertyCard';
import PropertyFilters from '../common/PropertyFilters';
import Pagination from '../common/Pagination';
import { usePropertySearch } from '../common/usePropertySearch';

const FEATURED_QUERY = 'limit=8';

// The property listing. With `featured` (home page) it shows the newest
// eight properties without filters; otherwise it has search, filters and
// pages, all kept in the URL.
const Property = ({ featured = false }) => {
  const location = useLocation();
  const { items, total, page, pages, loaded, searchParams, setSearchParams, setPage, refresh } =
    usePropertySearch(featured ? FEATURED_QUERY : undefined);

  return (
    <>
      {location?.pathname != "/" && <NavBar />}
      <div className='row property py-5'>
        <div className="text-center ">
          <div className="tagline ">Properties </div>
          <h2 className="section-title">{featured ? 'Featured Listings' : 'Find Your Property'}</h2>
        </div>
        <div className='col-sm-10 mx-auto'>
          {!featured && (
            <>
              <PropertyFilters searchParams={searchParams} setSearchParams={setSearchParams} />
              {loaded && <p className="featuredp mb-0">{total} {total === 1 ? 'property' : 'properties'} found</p>}
            </>
          )}

          <div className='row g-4 py-3'>
            {items.map((item) => (
              <div key={item._id} className='col-sm-6 col-lg-3'>
                <PropertyCard property={item}>
                  <BuyButton property={item} onBought={refresh} className="w-100" />
                </PropertyCard>
              </div>
            ))}
          </div>
          {loaded && items.length == 0 && (
            <h4 className='text-center my-4'>{featured ? 'No properties yet.' : 'No properties match your search.'}</h4>
          )}

          {!featured && <Pagination page={page} pages={pages} onChange={setPage} />}
          {featured && items.length > 0 && (
            <div className="text-center mt-2">
              <Link to="/property" className="btn btn1 px-4">View All Properties</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Property

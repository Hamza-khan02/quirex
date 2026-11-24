import React from 'react'
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar'
import PropertyCard from '../common/PropertyCard';
import PropertyFilters from '../common/PropertyFilters';
import Pagination from '../common/Pagination';
import { usePropertySearch } from '../common/usePropertySearch';
import { api } from '../../config/api';

const AdminPropertyList = () => {
  const { items, total, page, pages, loaded, searchParams, setSearchParams, setPage, refresh } = usePropertySearch();

  const handleDeleteProperty = async (property) => {
    const result = await Swal.fire({
      title: "Are you sure ?",
      text: `Delete "${property.title}"? Its sale record and reviews are deleted too. You won't be able to revert this!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });
    if (!result.isConfirmed) return;

    const response = await api.post('/api/delete-property', { _id: property._id });
    Swal.fire({
      title: "Delete Property.",
      text: response?.data?.message,
      icon: response?.data?.code == 200 ? "success" : "error",
    });
    refresh();
  }

  return (
    <>
      <NavBar />
      <div className='row property py-5'>
        <div className="text-center ">
          <div className="tagline ">Properties </div>
          <h2 className="section-title">All Listings</h2>
        </div>
        <div className='col-sm-10 mx-auto'>
          <PropertyFilters searchParams={searchParams} setSearchParams={setSearchParams} />
          {loaded && <p className="featuredp mb-0">{total} {total === 1 ? 'property' : 'properties'} found</p>}

          <div className='row g-4 py-3'>
            {items.map((item) => (
              <div key={item._id} className='col-sm-6 col-lg-3'>
                <PropertyCard property={item}>
                  <div className='d-flex gap-2'>
                    <Link to={`/admin-edit/${item._id}`} className='btn btn-outline-primary p-1 flex-fill'>Edit</Link>
                    <button onClick={() => handleDeleteProperty(item)} className='btn btn-outline-danger p-1 flex-fill'>Delete</button>
                  </div>
                </PropertyCard>
              </div>
            ))}
          </div>
          {loaded && items.length == 0 && <h4 className='text-center my-4'>No Record Found</h4>}
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}

export default AdminPropertyList

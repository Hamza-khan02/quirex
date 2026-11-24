import React, { useEffect, useState } from 'react'
import NavBar from '../landingComponents/NavBar'
import Swal from 'sweetalert2';
import { api, getImageUrl } from '../../config/api';
import { formatPrice } from '../../config/property';

const AdminSoldProperty = () => {
  const [data, setData] = useState([])
  useEffect(() => {
    fetchData();
  }, [])
  const fetchData = async () => {
    const response = await api.get('/api/admin-sold-list');
    if (response?.data?.code == 200) {
      setData(response?.data?.data)
    }
  }

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: "Are you sure ?",
      text: `Delete this record? "${item.title}" will be available again. You won't be able to revert this!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });
    if (!result.isConfirmed) return;

    const response = await api.post('/api/delete-sold-item', { _id: item._id });
    Swal.fire({
      title: "Delete Record.",
      text: response?.data?.message,
      icon: response?.data?.code == 200 ? "success" : "error",
    })
    fetchData();
  }

  return (
    <div>
      <NavBar />
      <div className="row">
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <h1 className='text-center text-danger'>Sold &amp; Rented Properties</h1>
          <div className="table-responsive">
            <table className='table align-middle'>
              <thead className='table table-dark'>
                <tr>
                  <th>Sr.No.</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Location</th>
                  <th>Media</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((item, index) => (
                  <tr key={item?._id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className={`badge ${item.dealType === 'rent' ? 'bg-info text-dark' : 'bg-success'}`}>
                        {item.dealType === 'rent' ? 'Rented' : 'Sold'}
                      </span>
                    </td>
                    <td>{item?.name}</td>
                    <td>{item?.email}</td>
                    <td>{item?.contact}</td>
                    <td>{item?.title}</td>
                    <td>{formatPrice(item?.price, item?.listingType)}</td>
                    <td>{item?.location}</td>
                    <td>{item?.pic && <img height="60" width="100" src={getImageUrl(item.pic)} alt='' />}</td>
                    <td><button onClick={() => handleDelete(item)} className='btn btn-sm btn-outline-danger'>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.length == 0 && <p className='text-center'>No Record Found!</p>}
          <p className="featuredp small">Deleting a record makes the property available again.</p>
        </div>
        <div className="col-sm-1"></div>
      </div>
    </div>
  )
}

export default AdminSoldProperty

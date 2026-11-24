import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import NavBar from '../landingComponents/NavBar'
import { api, getImageUrl } from '../../config/api';
import { formatPrice, dealLabel } from '../../config/property';

const UserBoughtList = () => {
  const [list, setList] = useState([])
  useEffect(() => {
    fetchData()
  }, [])
  const fetchData = async () => {
    // The backend reads the user from the login token.
    const response = await api.post('/api/user-bought-list')
    if (response?.data?.code == 200) {
      setList(response?.data?.data)
    }
  }
  return (
    <>
      <NavBar />
      <div className="row">
        <h1 className='text-danger text-center'>My Properties</h1>
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className='table table-dark'>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Price</th>
                  <th scope="col">Bedrooms</th>
                  <th scope="col">Area</th>
                  <th scope="col">Location</th>
                  <th scope="col">Media</th>
                </tr>
              </thead>
              <tbody>
                {list?.map((item, index) => (
                  <tr key={item?._id}>
                    <th scope="row">{index + 1}</th>
                    <td><Link to={`/property/${item.propertyId}`}>{item?.title}</Link></td>
                    <td>
                      <span className={`badge ${item.dealType === 'rent' ? 'bg-info text-dark' : 'bg-success'}`}>{dealLabel(item.dealType)}</span>
                    </td>
                    <td>{formatPrice(item?.price, item?.listingType)}</td>
                    <td>{item?.bedrooms || '–'}</td>
                    <td>{item?.area ? `${item.area.toLocaleString('en-US')} sq ft` : '–'}</td>
                    <td>{item?.location}</td>
                    <td><img height="60" width="100" src={getImageUrl(item?.pic)} alt={item?.title} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list?.length == 0 && <p className='text-center'>You haven't bought or rented anything yet.</p>}
        </div>
        <div className="col-sm-1"></div>
      </div>
    </>
  )
}

export default UserBoughtList

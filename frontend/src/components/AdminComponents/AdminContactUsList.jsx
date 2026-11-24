import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import NavBar from '../landingComponents/NavBar'
import { api } from '../../config/api'

const formatDate = (value) => new Date(value).toLocaleDateString()

const AdminContactUsList = () => {
  const [list, setList] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const response = await api.get('/api/admin-contact-list')
    if (response?.data?.code == 200) {
      setList(response.data.data)
    }
  }

  const toggleRead = async (item) => {
    const response = await api.post('/api/admin-contact-read', { _id: item._id, isRead: !item.isRead })
    if (response?.data?.code == 200) {
      fetchData()
    } else {
      Swal.fire({ title: 'Enquiries', text: response?.data?.message, icon: 'error' })
    }
  }

  const handleDelete = (item) => {
    Swal.fire({
      title: 'Are you sure ?',
      text: `Delete the message from ${item.name}? You won't be able to revert this!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (!result.isConfirmed) return
      const response = await api.post('/api/delete-contact', { _id: item._id })
      Swal.fire({
        title: 'Enquiries',
        text: response?.data?.message,
        icon: response?.data?.code == 200 ? 'success' : 'error'
      })
      fetchData()
    })
  }

  return (
    <div>
      <NavBar />
      <div className="row">
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <h1 className='text-center text-danger'>Contact Enquiries</h1>
          <div className="table-responsive">
            <table className='table align-middle'>
              <thead className='table table-dark'>
                <tr>
                  <th>Sr.No.</th>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Property</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, index) => (
                  <tr key={item._id} className={item.isRead ? '' : 'fw-semibold'}>
                    <td>{index + 1}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.name}</td>
                    <td><a href={`mailto:${item.email}`}>{item.email}</a></td>
                    <td>
                      {item.propertyTitle && item.propertyTitle !== 'Deleted property'
                        ? <Link to={`/property/${item.propertyId}`}>{item.propertyTitle}</Link>
                        : (item.propertyTitle ?? '–')}
                    </td>
                    <td className="message-cell">{item.message}</td>
                    <td>
                      {item.isRead
                        ? <span className="badge bg-secondary">Read</span>
                        : <span className="badge bg-danger">New</span>}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button onClick={() => toggleRead(item)} className='btn btn-sm btn-outline-primary text-nowrap'>
                          {item.isRead ? 'Mark unread' : 'Mark read'}
                        </button>
                        <button onClick={() => handleDelete(item)} className='btn btn-sm btn-outline-danger'>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length == 0 && <p className='text-center'>No Record Found!</p>}
        </div>
        <div className="col-sm-1"></div>
      </div>
    </div>
  )
}

export default AdminContactUsList

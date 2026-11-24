import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar'
import { api, getImageUrl } from '../../config/api';
const UserList = () => {
  const [data, setData] = useState([])
  useEffect(() => {
    fetchData();
  }, [])
  const fetchData = async () => {
    const response = await api.get('/api/admin-user-list');
    if (response?.data?.code == 200) {
      setData(response?.data?.data)
    }
  }

  const handleToggleBlock = (user) => {
    const block = !user.isBlocked;
    Swal.fire({
      title: block ? 'Block user?' : 'Unblock user?',
      text: block
        ? `${user.name} will be logged out and won't be able to log in.`
        : `${user.name} will be able to log in again.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: block ? 'Yes, block' : 'Yes, unblock'
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      const response = await api.post('/api/admin-toggle-block', { _id: user._id, isBlocked: block });
      Swal.fire({
        title: 'Users',
        text: response?.data?.message,
        icon: response?.data?.code == 200 ? 'success' : 'error'
      });
      fetchData();
    });
  }

  return (
    <div>
      <NavBar />
      <div className="row">
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <h1 className='text-center text-danger'>AdminUserList</h1>
          <div className="table-responsive">
            <table className='table align-middle'>
              <thead className='table table-dark'>
                <tr>
                  <th>Sr.No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Profile</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((item, index) => (
                  <tr key={item?._id}>
                    <td>{index + 1}</td>
                    <td>{item?.name}</td>
                    <td>{item?.email}</td>
                    <td>{item?.contact}</td>
                    <td>{item?.address}</td>
                    <td><img height="60" width="100" src={getImageUrl(item?.profile)} alt='' /></td>
                    <td>
                      {item?.isBlocked
                        ? <span className="badge bg-danger">Blocked</span>
                        : <span className="badge bg-success">Active</span>}
                    </td>
                    <td>
                      <button onClick={() => handleToggleBlock(item)} className='btn btn-sm btn-outline-danger'>
                        {item?.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.length == 0 && <p className='text-center'>No Record Found!</p>}
        </div>
        <div className="col-sm-1"></div>
      </div>
    </div>
  )
}

export default UserList

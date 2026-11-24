import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar';
import { api } from '../../config/api';
import { formatPrice, REQUEST_STATUS, requestTypeLabel } from '../../config/property';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '–');

// The user's buy and rent requests and what the admin decided.
const UserRequests = () => {
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get('/api/my-requests');
    if (response?.data?.code == 200) setList(response.data.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (item) => {
    const confirm = await Swal.fire({
      title: 'Cancel request?',
      text: `Cancel your request to ${requestTypeLabel(item.dealType).toLowerCase()} "${item.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'Keep it',
    });
    if (!confirm.isConfirmed) return;
    const response = await api.post('/api/cancel-request', { _id: item._id });
    Swal.fire({ title: 'Requests', text: response?.data?.message, icon: response?.data?.code == 200 ? 'success' : 'error' });
    load();
  };

  return (
    <>
      <NavBar />
      <div className="row">
        <h1 className='text-danger text-center'>My Requests</h1>
        <p className="text-center featuredp">When you click Buy or Rent, your request appears here until the admin approves or rejects it.</p>
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className='table table-dark'>
                <tr>
                  <th>#</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td>{item.propertyExists ? <Link to={`/property/${item.propertyId}`}>{item.title}</Link> : item.title}</td>
                    <td>{requestTypeLabel(item.dealType)}</td>
                    <td>{formatPrice(item.price, item.listingType)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><span className={`badge ${REQUEST_STATUS[item.status]?.badge}`}>{REQUEST_STATUS[item.status]?.label}</span></td>
                    <td className="message-cell">{item.note || '–'}</td>
                    <td>
                      {item.status === 'pending' && (
                        <button type="button" onClick={() => cancel(item)} className="btn btn-sm btn-outline-danger">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loaded && list.length == 0 && <p className='text-center'>You haven't sent any requests yet.</p>}
        </div>
        <div className="col-sm-1"></div>
      </div>
    </>
  );
};

export default UserRequests;

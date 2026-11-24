import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar';
import { api } from '../../config/api';
import { formatPrice, REQUEST_STATUS, STATUS_LABELS, requestTypeLabel } from '../../config/property';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '–');

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All' },
];

// Buy and rent requests from users. Approving one sells or rents the property
// and rejects the other pending requests for it.
const AdminRequests = () => {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get(`/api/admin-request-list${status ? `?status=${status}` : ''}`);
    if (response?.data?.code == 200) setList(response.data.data);
    setLoaded(true);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (item) => {
    const action = item.dealType === 'rent' ? 'rent' : 'buy';
    const confirm = await Swal.fire({
      title: 'Approve request?',
      text: `${item.name} will ${action} "${item.title}". Other pending requests for this property will be rejected.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, approve',
    });
    if (!confirm.isConfirmed) return;
    const response = await api.post('/api/admin-approve-request', { _id: item._id });
    Swal.fire({ title: 'Requests', text: response?.data?.message, icon: response?.data?.code == 200 ? 'success' : 'error' });
    load();
  };

  const reject = async (item) => {
    const result = await Swal.fire({
      title: 'Reject request?',
      text: `${item.name}'s request for "${item.title}".`,
      input: 'textarea',
      inputLabel: 'Reason (optional, shown to the user)',
      inputAttributes: { maxlength: '500', 'aria-label': 'Reason for rejecting' },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Reject',
    });
    if (!result.isConfirmed) return;
    const response = await api.post('/api/admin-reject-request', { _id: item._id, note: result.value || '' });
    Swal.fire({ title: 'Requests', text: response?.data?.message, icon: response?.data?.code == 200 ? 'success' : 'error' });
    load();
  };

  return (
    <div>
      <NavBar />
      <div className="row">
        <div className="col-sm-1"></div>
        <div className="col-sm-10">
          <h1 className='text-center text-danger'>Buy &amp; Rent Requests</h1>

          <div className="d-flex flex-wrap justify-content-center gap-2 my-3" role="group" aria-label="Filter requests">
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={`btn btn-sm px-3 ${status === filter.value ? 'btn1' : 'btn-outline-secondary'}`}
                aria-pressed={status === filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="table-responsive">
            <table className='table align-middle'>
              <thead className='table table-dark'>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Requested By</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div className="fw-semibold">{item.name}</div>
                      <div className="small featuredp">{item.email}{item.contact ? ` · ${item.contact}` : ''}</div>
                    </td>
                    <td>
                      {item.propertyExists ? <Link to={`/property/${item.propertyId}`}>{item.title}</Link> : item.title}
                      {item.propertyExists && item.propertyStatus !== 'available' && (
                        <span className="badge bg-dark ms-2">{STATUS_LABELS[item.propertyStatus]}</span>
                      )}
                    </td>
                    <td>{requestTypeLabel(item.dealType)}</td>
                    <td>{formatPrice(item.price, item.listingType)}</td>
                    <td>
                      <span className={`badge ${REQUEST_STATUS[item.status]?.badge}`}>{REQUEST_STATUS[item.status]?.label}</span>
                      {item.note && <div className="small featuredp message-cell mt-1">{item.note}</div>}
                    </td>
                    <td>
                      {item.status === 'pending' && (
                        <div className="d-flex gap-2">
                          <button type="button" onClick={() => approve(item)} className="btn btn-sm btn-outline-primary">Approve</button>
                          <button type="button" onClick={() => reject(item)} className="btn btn-sm btn-outline-danger">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loaded && list.length == 0 && <p className='text-center'>No requests here.</p>}
        </div>
        <div className="col-sm-1"></div>
      </div>
    </div>
  );
};

export default AdminRequests;

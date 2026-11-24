import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBuilding, FaCheckCircle, FaTags, FaUsers, FaEnvelopeOpenText } from 'react-icons/fa';
import NavBar from '../landingComponents/NavBar';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';

const formatDate = (value) => new Date(value).toLocaleDateString();

const AdminDashboard = () => {
  const user = getUser();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/admin-dashboard').then((response) => {
      if (response?.data?.code == 200) setData(response.data.data);
    });
  }, []);

  const counts = data?.counts;
  const cards = [
    { label: 'Total Properties', value: counts?.totalProperties, icon: <FaBuilding />, to: '/admin-list' },
    { label: 'Available', value: counts?.availableProperties, icon: <FaCheckCircle />, to: '/admin-list' },
    { label: 'Sold', value: counts?.soldProperties, icon: <FaTags />, to: '/admin-sold' },
    {
      label: 'Users',
      value: counts?.totalUsers,
      note: counts?.blockedUsers ? `${counts.blockedUsers} blocked` : null,
      icon: <FaUsers />,
      to: '/admin-user',
    },
    {
      label: 'Enquiries',
      value: counts?.totalEnquiries,
      note: counts?.unreadEnquiries ? `${counts.unreadEnquiries} new` : null,
      icon: <FaEnvelopeOpenText />,
      to: '/admin-contact',
    },
  ];

  return (
    <>
      <NavBar />
      <div className="container my-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="mb-1">Dashboard</h2>
            <p className="featuredp mb-0">Welcome back, {user?.name}</p>
          </div>
          <Link to="/admin-add" className="btn btn1 px-4">+ Add Property</Link>
        </div>

        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-4">
          {cards.map((card) => (
            <div key={card.label} className="col">
              <Link to={card.to} className="text-decoration-none">
                <div className="amenity-card h-100">
                  <div className="ic mb-2">{card.icon}</div>
                  <p className="counter-number">{card.value ?? '–'}</p>
                  <p className="counter-text">{card.label}</p>
                  {card.note && <span className="badge bg-danger mt-2">{card.note}</span>}
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="row g-4 mt-2">
          <div className="col-lg-6">
            <div className="form-box h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Recent Sales</h5>
                <Link to="/admin-sold" className="text-decoration-none">View all</Link>
              </div>
              {data?.recentSales?.length ? (
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr><th>Property</th><th>Buyer</th><th>Price</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((sale) => (
                      <tr key={sale._id}>
                        <td>{sale.title}</td>
                        <td>{sale.buyer}</td>
                        <td>{sale.price ? `$${sale.price}` : '–'}</td>
                        <td>{formatDate(sale.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="featuredp mb-0">No sales yet.</p>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="form-box h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Recent Enquiries</h5>
                <Link to="/admin-contact" className="text-decoration-none">View all</Link>
              </div>
              {data?.recentEnquiries?.length ? (
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr><th>Name</th><th>Message</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {data.recentEnquiries.map((enquiry) => (
                      <tr key={enquiry._id} className={enquiry.isRead ? '' : 'fw-semibold'}>
                        <td>
                          {enquiry.name}
                          {!enquiry.isRead && <span className="badge bg-danger ms-2">New</span>}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '220px' }}>{enquiry.message}</td>
                        <td>{formatDate(enquiry.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="featuredp mb-0">No enquiries yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

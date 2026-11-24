import React, { useEffect, useState } from 'react'
import { IoBedOutline } from "react-icons/io5";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from './NavBar';
import Swal from 'sweetalert2';
import { api, getImageUrl } from '../../config/api';
import { getUser } from '../../config/auth';
const Property = () => {
  const [listData, setListData] = useState([])
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const response = await api.get('/api/property-list');
    if (response?.data?.code == 200) {
      setListData(response?.data?.data)
    }
  }

  const handleBuy = async (propertyId) => {
    const response = await api.post('/api/buy', { propertyId });
    Swal.fire({
      title: "Buy Property",
      text: response?.data?.message,
      icon: response?.data?.code == 200 ? 'success' : 'error'
    })
    // Refresh so the card switches to "Sold".
    fetchData();
  }

  // Sold properties can't be bought; visitors are asked to log in first;
  // admins don't buy, so they get no button.
  const renderAction = (item) => {
    if (item?.isSold) {
      return <button className='btn btn-secondary' disabled>Sold</button>;
    }
    if (!user) {
      return <button onClick={() => navigate('/login')} className='btn btn-outline-danger'>Login to Buy</button>;
    }
    if (user.userType !== 'user') return null;
    return <button onClick={() => handleBuy(item?._id)} className='btn btn-outline-danger'>Buy</button>;
  }

  return (
    <>
      {location?.pathname != "/" && <NavBar />}
      <div className='row property py-5'>
        <div className="text-center ">
          <div className="tagline ">Properties </div>
          <h2 className="section-title">Featured Listings</h2>
        </div>
        <div className='col-sm-1'></div>
        <div className='col-sm-10'>
          <div className='row py-3 px-3 '>
            {listData?.map((item) => (
              <div key={item?._id} className='col-sm-3  px-3 mb-4'>
                <div className="card  mx-auto shadow-lg border border-0">
                  <img src={getImageUrl(item?.pic)} className="card-img-top img-fluid featuredimg" alt={item?.title} />
                  <div className="card-body">
                    <p className='mycolor1'><b>${item?.price}</b>/Month</p>
                    <h5 className="card-title"><b className='mycolor2'>{item?.title}</b></h5>
                    <p className="card-text featuredp ">{item?.description}</p>
                    <div className='row'>
                      <div className='col-4 featureddiv featuredp'>
                        <p className='m-0 ps-2'>{item?.area}<IoBedOutline /></p>
                        <span className='ps-2'>Bedroom</span>
                      </div>
                      {renderAction(item)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {listData?.length == 0 && <h1 className='text-center'>No Record Found</h1>}
          </div>
        </div>
        <div className='col-sm-1'></div>
      </div>
    </>
  )
}

export default Property

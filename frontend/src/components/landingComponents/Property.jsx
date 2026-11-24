import React, { useEffect, useState } from 'react'
import { IoBedOutline } from "react-icons/io5";
import { Link, useLocation } from "react-router-dom";
import NavBar from './NavBar';
import BuyButton from '../common/BuyButton';
import { api, getImageUrl } from '../../config/api';
const Property = () => {
  const [listData, setListData] = useState([])
  const location = useLocation();

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const response = await api.get('/api/property-list');
    if (response?.data?.code == 200) {
      setListData(response?.data?.data)
    }
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
                  <Link to={`/property/${item?._id}`}>
                    <img src={getImageUrl(item?.pic)} className="card-img-top img-fluid featuredimg" alt={item?.title} />
                  </Link>
                  <div className="card-body">
                    <p className='mycolor1'><b>${item?.price}</b></p>
                    <h5 className="card-title">
                      <Link to={`/property/${item?._id}`} className='text-decoration-none'><b className='mycolor2'>{item?.title}</b></Link>
                    </h5>
                    <p className="card-text featuredp ">{item?.description}</p>
                    <div className='row'>
                      <div className='col-4 featureddiv featuredp'>
                        <p className='m-0 ps-2'>{item?.area}<IoBedOutline /></p>
                        <span className='ps-2'>Bedroom</span>
                      </div>
                      <BuyButton property={item} onBought={fetchData} />
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

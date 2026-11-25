import React from 'react'
import { Link } from 'react-router-dom';
import { CiLocationOn } from "react-icons/ci";
import { LuPhoneCall } from "react-icons/lu";
import { BsEnvelope } from "react-icons/bs";
import SocialLinks from '../common/SocialLinks';
import { SITE } from '../../config/site';

const Footer = () => {
  return (
    <>
      <div className="footer">
        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="d-flex align-items-center mb-3 logo">
              <img src='/img/favicon.png' alt='' /> {SITE.name}
            </div>
            <p>{SITE.description}</p>
            <p><CiLocationOn className='me-2' />{SITE.address}</p>
            <p><LuPhoneCall className='me-2' /><a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`} className="d-inline p-0">{SITE.phone}</a></p>
            <p><BsEnvelope className='me-2' /><a href={`mailto:${SITE.email}`} className="d-inline p-0">{SITE.email}</a></p>
            <SocialLinks className="mt-2" linkClassName="text-white" />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <h5 className='text-light'>Company</h5>
            <Link to="/about">About</Link>
            <Link to="/property">Properties</Link>
            <Link to="/services">Services</Link>
            <Link to="/contact">Contact us</Link>
          </div>

          <div className="col-6 col-md-3 col-lg-3">
            <h5 className='text-light'>Explore</h5>
            <Link to="/property?listingType=sale">Homes for Sale</Link>
            <Link to="/property?listingType=rent">Homes for Rent</Link>
            <Link to="/property?propertyType=flat">Flats</Link>
            <Link to="/property?propertyType=shop">Shops</Link>
            <Link to="/property?propertyType=land">Land</Link>
          </div>

          <div className="col-6 col-md-3 col-lg-3">
            <h5 className='text-light'>My Account</h5>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/user-profile">My account</Link>
            <Link to="/user-wishlist">Wish List</Link>
            <Link to="/user-requests">My Requests</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom text-center">
        &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </>
  )
}

export default Footer

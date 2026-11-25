import React from 'react'
import { FaRegEnvelope } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import SocialLinks from '../common/SocialLinks';
import { SITE } from '../../config/site';

const TopNavbar = () => {
  return (
    <div className="row mycolor sticky-top">
      <div className="col-sm-6 py-1 mycolor">
        <div className="row">
          <div className="col-6 py-1 text-end">
            <FaRegEnvelope className="btncolor" />
            &nbsp; <a href={`mailto:${SITE.email}`} className="text-light fw-bold text-decoration-none">{SITE.email}</a>
          </div>
          <div className="col-6 py-1">
            <FaLocationDot className="btncolor" />
            &nbsp; <b className="text-light">{SITE.address}</b>
          </div>
        </div>
      </div>
      <div className="col-sm-6 py-1 mycolor d-flex justify-content-center align-items-center">
        <SocialLinks linkClassName="text-light" />
      </div>
    </div>
  )
}

export default TopNavbar

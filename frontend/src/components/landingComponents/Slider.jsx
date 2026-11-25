import React from 'react'
import { FaHome } from "react-icons/fa";
import Typewriter from 'typewriter-effect';
import { Link } from 'react-router-dom';
const Slider = () => {
  return (
    <>
      <div className="row bg py-5" style={{ minHeight: "400px" }}>
        <div className="col-10 mx-auto">
          <div className="row d-flex align-items-center">
            {/* Text Content */}
            <div className="col-sm-6  mb-4 ">
              <p className="fs-5">
                <FaHome className="me-2 ic" />
                Real Estate Agency
              </p>
              <b className="typewriter"> 
                <Typewriter
                  options={{
                    strings: ['Find the exciting Dream House.'],
                    autoStart: true,
                    loop: true,
                  }}
                />
              </b>
              <p className='mt-3'>
                Houses, flats, shops and land for sale or rent, with clear prices,
                real photos and reviews from other buyers. Search, save your
                favourites and send a request in minutes.
              </p>
              <Link to="/contact" className="btn btn1">Make An Enquiry</Link>
            </div>

            {/* Image Content */}
            <div className="col-sm-6  text-center">
              <img
                src="/img/21_1.png"
                alt="Real Estate"
                className="img-fluid rounded "
                style={{ maxHeight: "550px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Slider

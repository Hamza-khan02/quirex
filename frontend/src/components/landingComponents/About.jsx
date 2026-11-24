import React from 'react'
import { Link } from 'react-router-dom'
import { FaTag, FaRegImages, FaHandshake, FaHeadset } from 'react-icons/fa'
import NavBar from './NavBar'

const REASONS = [
  { icon: <FaTag />, title: 'Clear Pricing', text: 'Every listing shows its price up front, with no hidden charges.' },
  { icon: <FaRegImages />, title: 'Detailed Listings', text: 'Photos, location, size and a full description for every property.' },
  { icon: <FaHandshake />, title: 'Simple Buying', text: 'Log in and buy a property in a few clicks, then find it under Bought.' },
  { icon: <FaHeadset />, title: 'Here To Help', text: 'Have a question? Send us a message and our team will reply.' },
];

const About = () => {
  return (
    <>
      <NavBar />

      <div className="row bg py-5">
        <div className="col-10 mx-auto">
          <div className="row g-5 align-items-center">
            <div className="col-lg-6" data-aos="fade-right">
              <div className="tagline">About Us</div>
              <h2 className="section-title mb-3">Making Property Simple For Everyone</h2>
              <p>
                Quirex is a user-friendly platform that makes buying property simple and
                convenient. Whether you are looking for your dream home or your next
                investment, Quirex brings clear prices, real photos and complete details
                together in one place.
              </p>
              <p>
                Every property is listed by our team with its price, location, size and
                photos, so you know exactly what you are looking at. Create an account,
                buy a property in a few clicks and keep track of everything you have
                bought from your profile.
              </p>
              <div className="d-flex flex-wrap gap-2 mt-4">
                <Link to="/property" className="btn btn1 px-4">Browse Properties</Link>
                <Link to="/contact" className="btn btn1 px-4">Contact Us</Link>
              </div>
            </div>
            <div className="col-lg-6 text-center" data-aos="fade-left">
              <img src="/img/9.png" alt="Homes listed on Quirex" className="img-fluid rounded" style={{ maxHeight: '520px' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="row py-5">
        <div className="text-center mb-4">
          <div className="tagline">Why Choose Us</div>
          <h2 className="section-title">What Makes Quirex Different</h2>
        </div>
        <div className="col-10 mx-auto">
          <div className="row g-4">
            {REASONS.map((reason) => (
              <div key={reason.title} className="col-sm-6 col-lg-3" data-aos="zoom-in-up">
                <div className="amenity-card h-100">
                  <div className="amenity-icon mx-auto mb-3"><span className="icons">{reason.icon}</span></div>
                  <h5 className="fw-bold">{reason.title}</h5>
                  <p className="featuredp mb-0">{reason.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row bg py-5">
        <div className="col-10 mx-auto">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="amenity-card h-100 text-start">
                <h4 className="fw-bold mycolor1">Our Mission</h4>
                <p className="featuredp mb-0">
                  To make finding and buying a home straightforward, with honest
                  information and no surprises along the way.
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="amenity-card h-100 text-start">
                <h4 className="fw-bold mycolor1">Our Vision</h4>
                <p className="featuredp mb-0">
                  A property market where everyone can compare homes easily and make
                  decisions with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mycolor py-5 text-center text-light">
        <div className="col-10 mx-auto">
          <h2 className="fw-bold">Ready to find your next home?</h2>
          <p className="mb-4">Browse our latest listings or get in touch with our team.</p>
          <Link to="/property" className="btn btn1 px-4">View Properties</Link>
        </div>
      </div>
    </>
  )
}

export default About

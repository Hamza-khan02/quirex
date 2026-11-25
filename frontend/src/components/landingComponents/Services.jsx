//services
import React from "react";

import NavBar from "./NavBar";
import { Link, useLocation } from "react-router-dom";
const Services = () => {
 const location=useLocation(); 
 
  return (
    <>
    {location?.pathname!="/" &&   <NavBar/>}
    <div  className="row py-5 bg servicesh">
      <div className="text-center ">
      <div className="tagline ">Our Services </div>
      <h2 className="section-title">Our Main Focus</h2>
    </div>
      <div className="col-sm-10 card1 mx-auto">
        <div  className="row py-3">
          <div data-aos="fade-right" className="col-sm-4">
            <div className="card mx-auto shadow-lg p-4 border border-0">
              <img src="/img/home.png" className="img-fluid w-50 mx-auto"/>
              <h3 className="text-center py-2"><b>Buy a home</b></h3>
              <p className="text-center">Browse houses, flats, shops and land for sale with clear prices, photos and full details. Found the one? Send a request to buy it in a few clicks.</p>
              <p className="text-center py-3"><Link to="/property?listingType=sale" className="text-success text-decoration-none bg-light rounded-2 p-2">Find A Home &rarr;</Link></p>

            </div>
          </div>
          <div data-aos="zoom-in-up" className="col-sm-4">
            <div className="card mx-auto shadow-lg p-4 border border-0">
              <img src="/img/22.png" className="img-fluid w-50 mx-auto"/>
              <h3 className="text-center py-2"><b>Rent a home</b></h3>
              <p className="text-center">Looking for a place to rent? Filter rentals by location, monthly budget and bedrooms, save favourites to your wishlist and request the one you like.</p>
              <p className="text-center py-3"><Link to="/property?listingType=rent" className="text-success text-decoration-none bg-light rounded-2 p-2">Find A Rental &rarr;</Link></p>

            </div>
          </div>
          <div data-aos="fade-left" className="col-sm-4 ">
            <div className="card mx-auto shadow-lg p-4 border border-0">
              <img src="/img/23.png" className="img-fluid w-50 mx-auto"/>
              <h3 className="text-center py-2"><b>Sell a home</b></h3>
              <p className="text-center">Want to sell or let your property? Tell us about it through the contact form and our team will get in touch to list it on Quirex.</p>
              <p className="text-center py-3"><Link to="/contact" className="text-success text-decoration-none bg-light rounded-2 p-2">Contact Us &rarr;</Link></p>

            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default Services;

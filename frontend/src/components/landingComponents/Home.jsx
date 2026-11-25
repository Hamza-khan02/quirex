import React, { useEffect, useState } from 'react'
import Slider from './Slider';
import Counter from './Counter';
import Services from './Services';
import Property from './Property';
import BrowseByType from './BrowseByType';
import Testimonial from './Testimonial';
import NavBar from './NavBar';
import { api } from '../../config/api';

const Home = () => {
  // Live numbers for the counters and the property-type cards.
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/api/site-stats').then((response) => {
      if (response?.data?.code == 200) setStats(response.data.data);
    });
  }, []);

  return (
    <>
      <NavBar />
      <Slider />
      <Counter stats={stats} />
      <Services />
      <Property featured />
      <BrowseByType stats={stats} />
      <Testimonial />
    </>
  )
}

export default Home

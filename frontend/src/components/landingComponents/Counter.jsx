import React from 'react'
import CountUp from 'react-countup';

// Live numbers from /api/site-stats (loaded by the home page).
const Counter = ({ stats }) => {
  const items = [
    { img: '/img/c11.png', value: stats?.totalProperties, label: 'Properties Listed' },
    { img: '/img/c2.png', value: stats?.availableProperties, label: 'Available Now' },
    { img: '/img/c3.png', value: stats?.dealsCompleted, label: 'Sold & Rented' },
    { img: '/img/c4.png', value: stats?.locations, label: 'Locations' },
  ];

  return (
    <div className="row">
      <div className="col-8 mx-auto">
        <div className="row text-center py-5">
          {items.map((item) => (
            <div key={item.label} className="col-6 col-sm-3 mb-4">
              <img src={item.img} className="counter-img" alt="" />
              <p className="counter-number">
                {stats ? <CountUp start={0} duration={2} end={item.value ?? 0} /> : '–'}
              </p>
              <p className="counter-text">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Counter

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopNavbar from './components/landingComponents/TopNavbar';
import Home from './components/landingComponents/Home';
import About from './components/landingComponents/About';
import ContactUs from './components/landingComponents/ContactUs';
import PropertyDetail from './components/landingComponents/PropertyDetail';
import Services from './components/landingComponents/Services';
import Property from './components/landingComponents/Property';
import UserRegister from './components/landingComponents/UserRegister';
import Footer from './components/landingComponents/Footer'
import Login from './components/landingComponents/Login';
import AdminDashboard from './components/AdminComponents/AdminDashboard';
import AddProperty from './components/AdminComponents/AddProperty';
import EditProperty from './components/AdminComponents/EditProperty';
import AdminRequests from './components/AdminComponents/AdminRequests';
import AdminPropertyList from './components/AdminComponents/AdminPropertyList';
import AdminSoldProperty from './components/AdminComponents/AdminSoldProperty';
import UserList from './components/AdminComponents/UserList';
import AdminProfile from './components/AdminComponents/AdminProfile';
import AdminContactUsList from './components/AdminComponents/AdminContactUsList';
import UserBoughtList from './components/userComponents/UserBoughtList';
import UserProfile from './components/userComponents/UserProfile';
import UserWishlist from './components/userComponents/UserWishlist';
import UserRequests from './components/userComponents/UserRequests';
import ProtectedRoute from './components/ProtectedRoute';
import Aos from 'aos';
import { useEffect } from 'react';
import 'aos/dist/aos.css'

const adminOnly = (page) => <ProtectedRoute role="admin">{page}</ProtectedRoute>;
const userOnly = (page) => <ProtectedRoute role="user">{page}</ProtectedRoute>;

function App() {

useEffect(()=>{
   Aos.init({
      offset: 200,
      duration: 600,
      easing: 'ease-in-sine',
      delay: 100,
    });
}, [])
  return (
    <>
      <BrowserRouter>
        <TopNavbar />
        <Routes>
          {/* landing page router */}
          <Route path='/' element={<Home />} />
          <Route path='/about' element={<About />} />
          <Route path='/services' element={<Services />} />
          <Route path='/property' element={<Property />} />
          <Route path='/property/:id' element={<PropertyDetail />} />
          <Route path='/contact' element={<ContactUs />} />
          <Route path='/register' element={<UserRegister />} />
          <Route path='/login' element={<Login />} />
          {/* admin Section  */}
          <Route path='/admin-dashboard' element={adminOnly(<AdminDashboard />)} />
          <Route path='/admin-add' element={adminOnly(<AddProperty />)} />
          <Route path='/admin-edit/:id' element={adminOnly(<EditProperty />)} />
          <Route path='/admin-list' element={adminOnly(<AdminPropertyList />)} />
          <Route path='/admin-requests' element={adminOnly(<AdminRequests />)} />
          <Route path='/admin-sold' element={adminOnly(<AdminSoldProperty />)} />
          <Route path='/admin-user' element={adminOnly(<UserList />)} />
          <Route path='/admin-profile' element={adminOnly(<AdminProfile />)} />
          <Route path='/admin-contact' element={adminOnly(<AdminContactUsList />)} />
          {/* User Route */}
          <Route path='/user-property' element={userOnly(<Property />)} />
          <Route path='/user-wishlist' element={userOnly(<UserWishlist />)} />
          <Route path='/user-requests' element={userOnly(<UserRequests />)} />
          <Route path='/user-bought' element={userOnly(<UserBoughtList />)} />
          <Route path='/user-profile' element={userOnly(<UserProfile />)} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App

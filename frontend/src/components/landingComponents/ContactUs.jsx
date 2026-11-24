import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Swal from 'sweetalert2';
import { FaUser, FaEnvelope, FaRegEnvelope } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { LuPhoneCall } from 'react-icons/lu';
import NavBar from './NavBar';
import { api } from '../../config/api';
import { getUser } from '../../config/auth';

const schema = yup.object().shape({
  name: yup.string().trim().required().max(100),
  email: yup.string().trim().required().email(),
  message: yup.string().trim().required().min(10).max(2000),
});

const CONTACT_DETAILS = [
  { icon: <FaLocationDot />, label: 'Visit Us', value: '15/A, NestTower, NYC' },
  { icon: <LuPhoneCall />, label: 'Call Us', value: '+0123-456789' },
  { icon: <FaRegEnvelope />, label: 'Email Us', value: 'Info@webmail.com' },
];

const ContactUs = () => {
  // Opened from a property page as /contact?property=<id>.
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const [property, setProperty] = useState(null);
  const user = getUser();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', message: '' },
  });

  useEffect(() => {
    if (!propertyId) {
      setProperty(null);
      return;
    }
    api.get(`/api/property/${propertyId}`).then((response) => {
      setProperty(response?.data?.code == 200 ? response.data.data : null);
    });
  }, [propertyId]);

  const handleSend = async (data) => {
    const response = await api.post('/api/contact', { ...data, propertyId: property?._id });
    if (response?.data?.code == 200) {
      Swal.fire({ title: 'Contact Us', text: response.data.message, icon: 'success' });
      reset({ name: data.name, email: data.email, message: '' });
    } else {
      Swal.fire({ title: 'Contact Us', text: response?.data?.message, icon: 'error' });
    }
  };

  return (
    <>
      <NavBar />
      <div className="container my-5">
        <div className="text-center mb-4">
          <div className="tagline">Contact Us</div>
          <h2 className="section-title">Get In Touch</h2>
          <p className="featuredp">Have a question about a property or need help? Send us a message and our team will get back to you.</p>
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-lg-4">
            {CONTACT_DETAILS.map((item) => (
              <div key={item.label} className="amenity-card d-flex align-items-center gap-3 text-start mb-3">
                <div className="amenity-icon flex-shrink-0"><span className="icons">{item.icon}</span></div>
                <div>
                  <h6 className="mb-1 fw-bold">{item.label}</h6>
                  <p className="featuredp mb-0">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="col-lg-7">
            <div className="form-box">
              {property && (
                <div className="alert alert-light border">
                  Enquiry about: <b>{property.title}</b> ({property.location})
                </div>
              )}
              <form onSubmit={handleSubmit(handleSend)}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Your Name</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaUser /></span>
                      <input type="text" {...register('name')} className="form-control" placeholder="Enter your name" />
                    </div>
                    {errors.name && <p className="text-danger">{errors.name.message}</p>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Your Email</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaEnvelope /></span>
                      <input type="email" {...register('email')} className="form-control" placeholder="Enter your email" />
                    </div>
                    {errors.email && <p className="text-danger">{errors.email.message}</p>}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Message</label>
                    <textarea rows="5" {...register('message')} className="form-control" placeholder="How can we help you?" />
                    {errors.message && <p className="text-danger">{errors.message.message}</p>}
                  </div>

                  <div className="text-center mt-4">
                    <input type="submit" className="btn px-5 btn-login" value={isSubmitting ? 'Sending...' : 'Send Message'} disabled={isSubmitting} />
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactUs;

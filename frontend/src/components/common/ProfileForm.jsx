import React from 'react';
import { FaUser, FaEnvelope, FaKey } from "react-icons/fa";
import { IoMdCall } from "react-icons/io";
import { MdAddPhotoAlternate } from "react-icons/md";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Swal from 'sweetalert2';
import { api } from '../../config/api';
import { getUser, updateStoredUser } from '../../config/auth';

const schema = yup.object().shape({
  name: yup.string().required(),
  contact: yup.string().required(),
  // Optional: an empty field keeps the current password.
  password: yup
    .string()
    .transform((value) => (value === '' ? undefined : value))
    .min(8)
    .max(20),
  address: yup.string().required(),
  // Optional: no file keeps the current picture.
  profile: yup.mixed(),
});

// Shared by the admin and user profile pages.
const ProfileForm = ({ title }) => {
  const user = getUser();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      contact: user?.contact ?? '',
      address: user?.address ?? '',
      password: '',
    },
  });

  const handleUpdate = async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('contact', data.contact);
    formData.append('address', data.address);
    if (data.password) formData.append('password', data.password);
    if (data.profile?.[0]) formData.append('profile', data.profile[0]);

    const response = await api.put('/api/user-update', formData);
    if (response?.data?.code === 200) {
      updateStoredUser(response.data.data);
      reset({ name: data.name, contact: data.contact, address: data.address, password: '' });
      Swal.fire({ title: "Profile Update", text: response.data.message, icon: "success" });
    } else {
      Swal.fire({ title: "Profile Update", text: response?.data?.message, icon: "error" });
    }
  };

  return (
    <div className="container my-5">
      <h2 className="text-center">{title}</h2>
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8">
          <div className="form-box">
            <form onSubmit={handleSubmit(handleUpdate)}>
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
                    <input type="email" value={user?.email ?? ''} readOnly className="form-control" />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text"><IoMdCall /></span>
                    <input type="tel" {...register('contact')} className="form-control" placeholder="Enter phone number" />
                  </div>
                  {errors.contact && <p className="text-danger">{errors.contact.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">New Password</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaKey /></span>
                    <input type="password" {...register('password')} className="form-control" placeholder="Leave blank to keep current" autoComplete="new-password" />
                  </div>
                  {errors.password && <p className="text-danger">{errors.password.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Address</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaKey /></span>
                    <input type="text" {...register('address')} className="form-control" placeholder="Enter Your Address" />
                  </div>
                  {errors.address && <p className="text-danger">{errors.address.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Profile Picture (optional)</label>
                  <div className="input-group">
                    <span className="input-group-text"><MdAddPhotoAlternate /></span>
                    <input type="file" accept="image/*" {...register('profile')} className="form-control" />
                  </div>
                </div>

                <div className="text-center mt-4">
                  <input type="submit" className="btn px-5 btn-login" value="Update" />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;

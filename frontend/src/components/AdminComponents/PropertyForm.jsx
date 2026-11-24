import React from 'react';
import { FaHome, FaDollarSign, FaAlignLeft } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { IoBedOutline } from 'react-icons/io5';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getImageUrl } from '../../config/api';

const buildSchema = (imageRequired) => yup.object().shape({
  title: yup.string().trim().required().min(2).max(60),
  price: yup.string().trim().required(),
  area: yup.string().trim().required().max(20),
  location: yup.string().trim().required().min(2).max(60),
  description: yup.string().trim().required().min(2).max(500),
  pic: imageRequired
    ? yup.mixed().test('required', 'Image is required', (files) => files?.length > 0)
    : yup.mixed(),
});

// Shared by Add Property and Edit Property. `onSubmit` receives FormData and
// returns true when the save worked.
const PropertyForm = ({
  title,
  submitLabel,
  onSubmit,
  defaultValues,
  currentImage,
  imageRequired = false,
  resetOnSuccess = false,
}) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(buildSchema(imageRequired)),
    defaultValues: {
      title: defaultValues?.title ?? '',
      price: defaultValues?.price ?? '',
      area: defaultValues?.area ?? '',
      location: defaultValues?.location ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  const submit = async (data) => {
    const formData = new FormData();
    for (const field of ['title', 'price', 'area', 'location', 'description']) {
      formData.append(field, data[field]);
    }
    if (data.pic?.[0]) formData.append('pic', data.pic[0]);

    const saved = await onSubmit(formData);
    if (saved && resetOnSuccess) reset();
  };

  return (
    <div className="container my-5">
      <h2 className="text-center">{title}</h2>
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8">
          <div className="form-box">
            <form onSubmit={handleSubmit(submit)}>
              <div className="row g-3">

                <div className="col-md-6">
                  <label className="form-label">Title</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaHome /></span>
                    <input {...register('title')} type="text" className="form-control" placeholder="Enter title" />
                  </div>
                  {errors?.title && <p className='text-danger'>{errors.title.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Price</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaDollarSign /></span>
                    <input {...register('price')} type="text" className="form-control" placeholder="Enter price" />
                  </div>
                  {errors?.price && <p className='text-danger'>{errors.price.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Bedrooms</label>
                  <div className="input-group">
                    <span className="input-group-text"><IoBedOutline /></span>
                    <input {...register('area')} type="text" className="form-control" placeholder="Number of bedrooms" />
                  </div>
                  {errors?.area && <p className='text-danger'>{errors.area.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Location</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaLocationDot /></span>
                    <input {...register('location')} type="text" className="form-control" placeholder="Location" />
                  </div>
                  {errors?.location && <p className='text-danger'>{errors.location.message}</p>}
                </div>

                <div className="col-12">
                  <label className="form-label">Description</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaAlignLeft /></span>
                    <textarea {...register('description')} rows="3" className="form-control" placeholder="Description" />
                  </div>
                  {errors?.description && <p className='text-danger'>{errors.description.message}</p>}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Image{imageRequired ? '' : ' (leave empty to keep the current one)'}</label>
                  <input {...register('pic')} type="file" accept="image/*" className="form-control" />
                  {errors?.pic && <p className='text-danger'>{errors.pic.message}</p>}
                </div>

                {currentImage && (
                  <div className="col-md-6">
                    <label className="form-label">Current Image</label>
                    <div><img src={getImageUrl(currentImage)} alt="Current" height="80" className="rounded" /></div>
                  </div>
                )}

                <div className="text-center mt-4">
                  <input type="submit" className="btn  px-5 btn-login" value={isSubmitting ? 'Saving...' : submitLabel} disabled={isSubmitting} />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyForm;

import React from 'react';
import { FaHome, FaDollarSign, FaAlignLeft } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { IoBedOutline } from 'react-icons/io5';
import { BiArea } from 'react-icons/bi';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getImageUrl } from '../../config/api';
import { PROPERTY_TYPES, LISTING_TYPES } from '../../config/property';

// Number inputs give '' when empty; turn that into a default (or undefined).
const emptyTo = (fallback) => (value, original) => (original === '' ? fallback : value);

const buildSchema = (imageRequired) => yup.object().shape({
  title: yup.string().trim().required().min(2).max(60),
  listingType: yup.string().oneOf(LISTING_TYPES.map((t) => t.value)).required(),
  propertyType: yup.string().oneOf(PROPERTY_TYPES.map((t) => t.value)).required(),
  price: yup.number().typeError('Price must be a number').required().positive(),
  bedrooms: yup.number().transform(emptyTo(0)).typeError('Bedrooms must be a number').integer().min(0).max(50),
  area: yup.number().transform(emptyTo(undefined)).typeError('Area must be a number').min(0),
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
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(buildSchema(imageRequired)),
    defaultValues: {
      title: defaultValues?.title ?? '',
      listingType: defaultValues?.listingType ?? 'sale',
      propertyType: defaultValues?.propertyType ?? 'house',
      price: defaultValues?.price ?? '',
      bedrooms: defaultValues?.bedrooms ?? '',
      area: defaultValues?.area ?? '',
      location: defaultValues?.location ?? '',
      description: defaultValues?.description ?? '',
    },
  });
  const isRent = watch('listingType') === 'rent';

  const submit = async (data) => {
    const formData = new FormData();
    for (const field of ['title', 'listingType', 'propertyType', 'price', 'bedrooms', 'location', 'description']) {
      formData.append(field, String(data[field]));
    }
    // An empty area clears it.
    formData.append('area', data.area === undefined ? '' : String(data.area));
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
                  <label htmlFor="pf-title" className="form-label">Title</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaHome /></span>
                    <input id="pf-title" {...register('title')} type="text" className="form-control" placeholder="Enter title" />
                  </div>
                  {errors?.title && <p className='text-danger'>{errors.title.message}</p>}
                </div>

                <div className="col-md-3 col-6">
                  <label htmlFor="pf-listingType" className="form-label">Listing</label>
                  <select id="pf-listingType" {...register('listingType')} className="form-select">
                    {LISTING_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>

                <div className="col-md-3 col-6">
                  <label htmlFor="pf-propertyType" className="form-label">Type</label>
                  <select id="pf-propertyType" {...register('propertyType')} className="form-select">
                    {PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>

                <div className="col-md-6">
                  <label htmlFor="pf-price" className="form-label">{isRent ? 'Monthly Rent ($)' : 'Price ($)'}</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaDollarSign /></span>
                    <input id="pf-price" {...register('price')} type="number" min="0" step="any" className="form-control" placeholder={isRent ? 'Rent per month' : 'Sale price'} />
                  </div>
                  {errors?.price && <p className='text-danger'>{errors.price.message}</p>}
                </div>

                <div className="col-md-3 col-6">
                  <label htmlFor="pf-bedrooms" className="form-label">Bedrooms</label>
                  <div className="input-group">
                    <span className="input-group-text"><IoBedOutline /></span>
                    <input id="pf-bedrooms" {...register('bedrooms')} type="number" min="0" step="1" className="form-control" placeholder="0" />
                  </div>
                  {errors?.bedrooms && <p className='text-danger'>{errors.bedrooms.message}</p>}
                </div>

                <div className="col-md-3 col-6">
                  <label htmlFor="pf-area" className="form-label">Area (sq ft)</label>
                  <div className="input-group">
                    <span className="input-group-text"><BiArea /></span>
                    <input id="pf-area" {...register('area')} type="number" min="0" step="any" className="form-control" placeholder="Optional" />
                  </div>
                  {errors?.area && <p className='text-danger'>{errors.area.message}</p>}
                </div>

                <div className="col-12">
                  <label htmlFor="pf-location" className="form-label">Location</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaLocationDot /></span>
                    <input id="pf-location" {...register('location')} type="text" className="form-control" placeholder="City or area" />
                  </div>
                  {errors?.location && <p className='text-danger'>{errors.location.message}</p>}
                </div>

                <div className="col-12">
                  <label htmlFor="pf-description" className="form-label">Description</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaAlignLeft /></span>
                    <textarea id="pf-description" {...register('description')} rows="3" className="form-control" placeholder="Description" />
                  </div>
                  {errors?.description && <p className='text-danger'>{errors.description.message}</p>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="pf-pic" className="form-label">Image{imageRequired ? '' : ' (leave empty to keep the current one)'}</label>
                  <input id="pf-pic" {...register('pic')} type="file" accept="image/*" className="form-control" />
                  {errors?.pic && <p className='text-danger'>{errors.pic.message}</p>}
                </div>

                {currentImage && (
                  <div className="col-md-6">
                    <span className="form-label d-block">Current Image</span>
                    <img src={getImageUrl(currentImage)} alt="Current" height="80" className="rounded" />
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

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar';
import PropertyForm from './PropertyForm';
import { api } from '../../config/api';

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/api/property/${id}`).then((response) => {
      if (response?.data?.code == 200) setProperty(response.data.data);
      else setNotFound(true);
    });
  }, [id]);

  const updateProperty = async (formData) => {
    formData.append('_id', id);
    const response = await api.put('/api/update-property', formData);
    const saved = response?.data?.code == 200;
    Swal.fire({
      title: "Edit Property",
      text: response?.data?.message,
      icon: saved ? "success" : "error"
    });
    if (saved) navigate('/admin-list');
    return saved;
  };

  return (
    <>
      <NavBar />
      {notFound && (
        <div className="text-center py-5">
          <h2>Property not found</h2>
          <Link to="/admin-list" className="btn btn1 px-4 mt-3">Back to list</Link>
        </div>
      )}
      {!notFound && !property && <p className="text-center py-5">Loading...</p>}
      {property && (
        <PropertyForm
          title="Edit Property"
          submitLabel="Save Changes"
          defaultValues={property}
          currentImage={property.pic}
          onSubmit={updateProperty}
        />
      )}
    </>
  );
};

export default EditProperty;

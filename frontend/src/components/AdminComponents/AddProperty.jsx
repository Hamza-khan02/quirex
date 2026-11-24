import React from 'react'
import Swal from 'sweetalert2';
import NavBar from '../landingComponents/NavBar';
import PropertyForm from './PropertyForm';
import { api } from '../../config/api';

const AddProperty = () => {
  const addProperty = async (formData) => {
    const response = await api.post('/api/add-property', formData);
    const saved = response?.data?.code == 200;
    Swal.fire({
      title: "Add Property",
      text: response?.data?.message,
      icon: saved ? "success" : "error"
    });
    return saved;
  }

  return (
    <>
      <NavBar />
      <PropertyForm title="Add Property" submitLabel="Add" imageRequired resetOnSuccess onSubmit={addProperty} />
    </>
  )
}

export default AddProperty

// This file would normally make actual API calls to your Django backend
// For now, we'll simulate the API responses
import axios from 'axios';



export const calculateRoute = async (tripData) => {
  try {
    const response = await axios.post('http://localhost:8000/calculate-route/', tripData);
    console.log('API Response:', response.data); // Add this for debugging
    return response.data;
  } catch (error) {
    console.error('Error calculating route:', error.response?.data || error);
    throw error;
  }
};
  
  
  
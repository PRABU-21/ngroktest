import axios from 'axios';

// Define API base URL as a constant that can be imported where needed
export const API_BASE_URL = 'http://localhost:5000/api';

// Create an axios instance with defaults
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Function to test the API connection
export const testApiConnection = async () => {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('API connection error:', error);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || 'No response details available'
    };
  }
};

// Utility function to handle API errors consistently
export const handleApiError = (error) => {
  const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
  const statusCode = error.response?.status || 500;
  
  console.error(`API Error (${statusCode}):`, errorMessage);
  
  // Return a consistent error object that can be used by components
  return {
    message: errorMessage,
    statusCode,
    isApiError: true,
  };
};
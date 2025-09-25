import React from 'react';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
      <span className="text-gray-600">{text}</span>
    </div>
  );
};

export default LoadingSpinner;
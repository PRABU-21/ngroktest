import React from 'react';

const Tag = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded',
    skill: 'px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded',
    count: 'px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded'
  };

  return (
    <span className={variants[variant]}>
      {children}
    </span>
  );
};

export default Tag;
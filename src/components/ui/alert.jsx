import React from 'react';

export const Alert = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-50 border-gray-200 text-gray-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  return (
    <div className={`border rounded-lg p-4 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ children, className = '' }) => (
  <div className={`text-sm ${className}`}>
    {children}
  </div>
);
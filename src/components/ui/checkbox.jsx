import React from 'react';

export const Checkbox = ({ 
  checked, 
  onCheckedChange, 
  className = '',
  disabled = false,
  ...props 
}) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
    disabled={disabled}
    className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

Checkbox.displayName = "Checkbox";
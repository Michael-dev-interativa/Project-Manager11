export const Label = ({ children, className = '', htmlFor, ...props }) => (
  <label
    htmlFor={htmlFor}
    className={`block mb-1 text-sm font-medium text-gray-700 ${className}`}
    {...props}
  >
    {children}
  </label>
);
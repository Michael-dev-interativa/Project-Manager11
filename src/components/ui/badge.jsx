import React from 'react';

export const Badge = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default function AlertaAtrasosEntrega({ planejamentos, isLoading }) {
  console.log('🔍 AlertaAtrasoEntrega - planejamentos:', planejamentos);
  console.log('🔍 AlertaAtrasoEntrega - isLoading:', isLoading);
  
  return (
    <div>
      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div>
          {planejamentos.map(planejamento => (
            <div key={planejamento.id}>
              <h3>{planejamento.descricao}</h3>
              <Badge variant="success">
                {planejamento.atatraso}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
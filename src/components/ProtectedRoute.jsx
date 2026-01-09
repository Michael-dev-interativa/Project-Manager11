import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getApiBase } from '../utils/apiBase'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const apiBase = getApiBase().replace(/\/$/, '');
    fetch(`${apiBase}/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setAuthenticated(!!(data && data.nome));
        setLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const origin = window.location.origin || '';
    const isLocal = /localhost:(3000|3002)/.test(origin);
    const serverDirect = (process.env.REACT_APP_SERVER_URL || '').replace(/\/$/, '');
    const envApi = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    const apiBase = envApi || (serverDirect ? `${serverDirect}/api` : (isLocal ? 'http://localhost:3001/api' : origin.replace(/\/$/, '') + '/api'));

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
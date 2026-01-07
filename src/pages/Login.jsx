import React, { useEffect, useState } from 'react';
import GoogleLoginButton from '../components/ui/GoogleLoginButton';

export default function Login() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const origin = window.location.origin || '';
    const apiBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
      : (/localhost:(3000|3002)/.test(origin) ? 'http://localhost:3001/api' : origin.replace(/\/$/, '') + '/api');
    fetch(`${apiBase}/me`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  if (user && user.nome) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-2">Bem-vindo, {user.nome}!</h2>
        <p className="mb-4">Você já está autenticado.</p>
        <a href="/" className="text-blue-600 underline">Ir para o sistema</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <GoogleLoginButton />
    </div>
  );
}

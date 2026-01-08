import React from 'react';

export default function GoogleLoginButton() {
  const handleLogin = () => {
    const origin = window.location.origin || '';
    const isLocal = /localhost:(3000|3002)/.test(origin);

    // Preferir backend direto em dev; em produção usar gateway /api para respeitar rewrites
    const serverDirect = (process.env.REACT_APP_SERVER_URL || '').replace(/\/$/, '') || (isLocal ? 'http://localhost:3001' : '');
    const apiBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || (isLocal ? 'http://localhost:3001/api' : origin.replace(/\/$/, '') + '/api');

    const loginUrl = isLocal
      ? `${serverDirect || 'http://localhost:3001'}/auth/google`
      : `${apiBase}/auth/google`;

    window.location.href = loginUrl;
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-800 font-semibold"
    >
      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-5 h-5" />
      Entrar com Google
    </button>
  );
}

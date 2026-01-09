import React from 'react';
import { getApiBase } from '../../utils/apiBase'

export default function GoogleLoginButton() {
  const handleLogin = () => {
    const origin = window.location.origin || '';
    const isLocal = /localhost:(3000|3002)/.test(origin);

    const apiBase = getApiBase().replace(/\/$/, '');
    const serverDirect = (process.env.REACT_APP_SERVER_URL || '').replace(/\/$/, '');

    // Se estivermos usando rewrites (apiBase começa com '/api' ou mesmo domínio), ir via /api/auth/google
    const usingRewrites = !isLocal && (apiBase === '/api' || apiBase.startsWith(origin + '/api') || apiBase.startsWith('/api'));
    const loginUrl = isLocal
      ? `${serverDirect || 'http://localhost:3001'}/auth/google`
      : usingRewrites
        ? `${origin.replace(/\/$/, '')}/api/auth/google`
        : `${(serverDirect || apiBase.replace(/\/api$/, ''))}/auth/google`;

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

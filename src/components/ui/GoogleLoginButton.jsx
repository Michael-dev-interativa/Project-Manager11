import React from 'react';

export default function GoogleLoginButton() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/google';
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

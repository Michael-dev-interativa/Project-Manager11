import React, { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const origin = window.location.origin || '';
        const isLocal = /localhost:(3000|3002)/.test(origin);
        const apiBase = (process.env.REACT_APP_API_URL || '')
          .replace(/\/$/, '')
          || (isLocal ? 'http://localhost:3001/api' : origin.replace(/\/$/, '') + '/api');
        // Backend expõe /api/me para usuário autenticado
        const res = await fetch(`${apiBase}/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) return null;

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

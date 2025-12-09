import React, { useState, useEffect } from 'react';
import { Usuario } from '../../entities/all';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await Usuario.me();
        setUser(userData);
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <div>Erro ao carregar perfil do usuário.</div>;
  }

  return (
    <div className="user-profile">
      <div className="user-avatar">
        <div className="avatar-circle">{user.nome.charAt(0)}</div>
      </div>
      <div className="user-info">
        <h3>{user.nome}</h3>
        <p>{user.cargo}</p>
        <p>{user.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;
import React, { useEffect, useState } from 'react';
import { getApiBase } from '../utils/apiBase'

const EmpreendimentosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const API_BASE = getApiBase();
        const response = await fetch(`${API_BASE}/Usuario`, { credentials: 'include' });
        const data = await response.json();
        setUsuarios(data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <h1>Empreendimentos</h1>
      <h2>Usuários Cadastrados</h2>
      <ul>
        {usuarios.map((usuario) => (
          <li key={usuario.id}>{usuario.nome}</li>
        ))}
      </ul>
    </div>
  );
};

export default EmpreendimentosPage;

export const Empreendimento = {
  name: "Empreendimento",
  type: "object",
  properties: {
    id: { type: "string", description: "ID do empreendimento" },
    nome: { type: "string", description: "Nome do empreendimento" },
  },
};

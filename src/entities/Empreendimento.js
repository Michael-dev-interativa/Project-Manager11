import React, { useEffect, useState } from 'react';

const EmpreendimentosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await fetch('http://localhost:3000/usuarios'); // Endpoint do backend
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

// Configuração da conexão
const pool = new Pool({
  user: 'Interativa', // Substitua pelo seu usuário do PostgreSQL
  host: 'localhost', // Substitua pelo host do seu banco de dados
  database: 'Interativa', // Substitua pelo nome do seu banco de dados
  password: 'IntEng#@2025', // Substitua pela sua senha
  port: 5433, // Porta padrão do PostgreSQL
});

export const AtividadeGenerica = {
  name: "AtividadeGenerica",
  type: "object",
  properties: {
    nome: {
      type: "string",
      description: "Nome da atividade genérica (Ex: Reunião Interna)"
    }
  },
  required: ["nome"],
  rls: {
    write: {
      created_by: "{{user.email}}"
    }
  },

  // Função para listar atividades genéricas
  list: async function () {
    try {
      const response = await fetch('http://localhost:3001/api/atividades-genericas'); // Endpoint do backend
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar atividades genéricas:', error);
      return [];
    }
  },

  // Função para criar uma nova atividade genérica
  create: async function (nome) {
    try {
      const response = await fetch('http://localhost:3001/api/atividades-genericas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome }),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Erro ao criar atividade genérica:', error);
    }
  },
};
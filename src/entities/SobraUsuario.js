// Configuração da conexão
const pool = new Pool({
  user: 'Interativa', // Substitua pelo seu usuário do PostgreSQL
  host: 'localhost', // Substitua pelo host do seu banco de dados
  database: 'Interativa', // Substitua pelo nome do seu banco de dados
  password: 'IntEng#@2025', // Substitua pela sua senha
  port: 5433, // Porta padrão do PostgreSQL
});

export const SobraUsuario = {
  name: "SobraUsuario",
  type: "object",
  properties: {
    usuario: {
      type: "string",
      description: "Email do usuário"
    },
    empreendimento_id: {
      type: "string",
      description: "ID do empreendimento"
    },
    horas_sobra: {
      type: "number",
      description: "Horas de sobra acumuladas"
    }
  },
  required: ["usuario", "empreendimento_id", "horas_sobra"],
  rls: {
    read: {
      user_condition: {
        role: "admin"
      }
    },
    write: {
      user_condition: {
        role: "admin"
      }
    }
  },

  // Função para listar sobras de usuários
  list: async function () {
    try {
      const response = await fetch('http://localhost:3001/api/sobras-usuarios'); // Endpoint do backend
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar sobras de usuários:', error);
      return [];
    }
  },

  // Função para atualizar uma sobra de usuário
  update: async function (id, updateData) {
    try {
      const response = await fetch(`http://localhost:3001/api/sobras-usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Erro ao atualizar sobra de usuário:', error);
    }
  },
};
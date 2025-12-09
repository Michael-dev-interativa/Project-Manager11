// Configuração da conexão
const pool = new Pool({
  user: 'Interativa', // Substitua pelo seu usuário do PostgreSQL
  host: 'localhost', // Substitua pelo host do seu banco de dados
  database: 'Interativa', // Substitua pelo nome do seu banco de dados
  password: 'IntEng#@2025', // Substitua pela sua senha
  port: 5433, // Porta padrão do PostgreSQL
});

export const Pavimento = {
  name: "Pavimento",
  type: "object",
  properties: {
    nome: {
      type: "string",
      description: "Nome do Pavimento"
    },
    area: {
      type: "number",
      description: "Área do Pavimento em m²"
    },
    empreendimento_id: {
      type: "string",
      description: "ID do empreendimento relacionado"
    }
  },
  required: ["nome", "area", "empreendimento_id"],
  rls: {
    read: {
      $or: [
        {
          user_condition: {
            role: "admin"
          }
        },
        {
          user_condition: {
            role: "lider"
          }
        },
        {
          user_condition: {
            role: "user"
          }
        }
      ]
    },
    write: {
      $or: [
        {
          created_by: "{{user.email}}"
        },
        {
          user_condition: {
            role: "admin"
          }
        },
        {
          user_condition: {
            role: "lider"
          }
        }
      ]
    }
  },

  // Função para listar pavimentos
  list: async function () {
    try {
      const response = await fetch('http://localhost:3001/api/pavimentos'); // Endpoint do backend
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar pavimentos:', error);
      return [];
    }
  },

  // Função para atualizar um pavimento
  update: async function (id, updateData) {
    try {
      const response = await fetch(`http://localhost:3001/api/pavimentos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Erro ao atualizar pavimento:', error);
    }
  },
};
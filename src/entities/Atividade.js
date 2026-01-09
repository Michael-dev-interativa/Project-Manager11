import { getApiBase } from '../utils/apiBase'
import { Pool } from 'pg';
const API_BASE = getApiBase();

const pool = new Pool({
  user: 'Interativa', // Substitua pelo seu usuário do PostgreSQL
  host: 'localhost', // Substitua pelo host do seu banco de dados
  database: 'Interativa', // Substitua pelo nome do seu banco de dados
  password: 'IntEng#@2025', // Substitua pela sua senha
  port: 5433, // Porta padrão do PostgreSQL
});

export const Atividade = {
  name: "Atividade",
  type: "object",
  properties: {
    id_atividade: {
      type: "string",
      description: "ID customizado da atividade"
    },
    etapa: {
      type: "string",
      description: "Etapa do projeto (Ex: Planejamento, Concepção)"
    },
    disciplina: {
      type: "string",
      description: "Disciplina da atividade (Ex: Geral, Elétrica)"
    },
    subdisciplina: {
      type: "string",
      description: "Subdisciplina da atividade (Ex: Compat, BIM)"
    },
    atividade: {
      type: "string",
      description: "Descrição da atividade"
    },
    predecessora: {
      type: "string",
      description: "ID da atividade predecessora"
    },
    tempo: {
      type: "number",
      description: "Tempo estimado para a atividade"
    },
    funcao: {
      type: "string",
      description: "Função responsável pela atividade (Ex: Projetista, Coordenador)"
    },
    empreendimento_id: {
      type: "string",
      description: "ID do empreendimento, se for uma atividade específica do projeto"
    },
    documento_id: {
      type: "string",
      description: "ID do documento ao qual a atividade está vinculada"
    }
  },
  required: ["etapa", "disciplina", "subdisciplina", "atividade"],

  // Função para listar atividades
  list: async function () {
    try {
      const result = await pool.query('SELECT * FROM atividades');
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      return [];
    }
  },

  // Função para atualizar uma atividade
  update: async function (id, updateData) {
    try {
      const response = await fetch(`${API_BASE}/atividades/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  },
};

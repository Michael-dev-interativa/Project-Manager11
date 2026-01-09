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

export const Documento = {
  name: "Documento",
  type: "object",
  properties: {
    id: { type: "string", description: "ID do documento" },
    titulo: { type: "string", description: "Título do documento" },
    numero: {
      type: "string",
      description: "Número do documento"
    },
    arquivo: {
      type: "string",
      description: "Nome do arquivo do documento"
    },
    area: {
      type: "string",
      description: "Área ou pavimento relacionado"
    },
    disciplina: {
      type: "string",
      description: "Disciplina do documento"
    },
    escala: {
      type: "number",
      description: "Escala do documento"
    },
    fator_dificuldade: {
      type: "number",
      description: "Fator de dificuldade"
    },
    empreendimento_id: {
      type: "string",
      description: "ID do empreendimento relacionado"
    }
  },
  required: ["id", "titulo", "numero", "arquivo", "disciplina", "empreendimento_id"],

  // Função para listar documentos
  list: async function () {
    try {
      const result = await pool.query('SELECT * FROM documentos');
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      return [];
    }
  },

  // Função para atualizar um documento
  update: async function (id, updateData) {
    try {
      const response = await fetch(`${API_BASE}/documentos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
    }
  },
};
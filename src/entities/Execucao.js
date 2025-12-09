import { Pool } from 'pg';

const pool = new Pool({
  user: 'interativa',
  host: 'localhost',
  database: 'interativa',
  password: 'IntEng#@2025',
  port: 5433,
});

export const Execucao = {
  name: "Execucao",
  
  list: async function (limit = null) {
    try {
      const query = limit ? 
        'SELECT * FROM execucoes ORDER BY inicio DESC LIMIT $1' : 
        'SELECT * FROM execucoes ORDER BY inicio DESC';
      
      const result = limit ? 
        await pool.query(query, [limit]) : 
        await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar execuções:', error);
      throw error;
    }
  },

  get: async function (id) {
    try {
      const result = await pool.query('SELECT * FROM execucoes WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar execução específica:', error);
      throw error;
    }
  },

  create: async function (data) {
    try {
      const result = await pool.query(
        `INSERT INTO execucoes (planejamento_id, inicio, fim, tempo_executado, descricao)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          data.planejamento_id,
          data.inicio || new Date(),
          data.fim,
          data.tempo_executado || 0,
          data.descricao
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar execução:', error);
      throw error;
    }
  },

  update: async function (id, data) {
    try {
      const result = await pool.query(
        `UPDATE execucoes 
         SET planejamento_id = $1, inicio = $2, fim = $3, tempo_executado = $4, descricao = $5
         WHERE id = $6 RETURNING *`,
        [
          data.planejamento_id,
          data.inicio,
          data.fim,
          data.tempo_executado,
          data.descricao,
          id
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao atualizar execução:', error);
      throw error;
    }
  },

  delete: async function (id) {
    try {
      const result = await pool.query('DELETE FROM execucoes WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao deletar execução:', error);
      throw error;
    }
  }
};
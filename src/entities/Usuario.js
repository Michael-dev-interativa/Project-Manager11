import { Pool } from 'pg';

const pool = new Pool({
  user: 'interativa',
  host: 'localhost',
  database: 'interativa',
  password: 'IntEng#@2025',
  port: 5433,
});

export const Usuario = {
  name: "Usuario",
  
  list: async function (limit = null) {
    try {
      const query = limit ? 
        'SELECT * FROM usuarios ORDER BY nome LIMIT $1' : 
        'SELECT * FROM usuarios ORDER BY nome';
      
      const result = limit ? 
        await pool.query(query, [limit]) : 
        await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  },

  get: async function (id) {
    try {
      const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário específico:', error);
      throw error;
    }
  },

  create: async function (data) {
    try {
      const result = await pool.query(
        `INSERT INTO usuarios (nome, email, cargo, role, ativo)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.nome, data.email, data.cargo, data.role || 'user', data.ativo !== undefined ? data.ativo : true]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  update: async function (id, data) {
    try {
      const result = await pool.query(
        `UPDATE usuarios 
         SET nome = $1, email = $2, cargo = $3, role = $4, ativo = $5
         WHERE id = $6 RETURNING *`,
        [data.nome, data.email, data.cargo, data.role, data.ativo, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  delete: async function (id) {
    try {
      const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }
};

module.exports = Usuario;

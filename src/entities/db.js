const { Pool } = require('pg');

const pool = new Pool({
  user: 'Interativa',      // Substitua pelos seus dados
  host: 'localhost',
  database: 'Interativa',    // Substitua pelo nome do seu banco
  password: 'IntEng@2025',    // Substitua pela sua senha
  port: 5432,
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('Erro na query:', err);
    throw err;
  }
};

module.exports = { query };

// Endpoint para atualizar uma atividade
router.put('/Atividade/:id', async (req, res) => {
  const { id } = req.params;
  const { etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao, empreendimento_id } = req.body;

  try {
    await query(
      'UPDATE Atividade SET etapa = $1, disciplina = $2, subdisciplina = $3, atividade = $4, predecessora = $5, tempo = $6, funcao = $7, empreendimento_id = $8 WHERE id = $9',
      [etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao, empreendimento_id, id]
    );
    res.send('Atividade atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).send('Erro no servidor');
  }
});
const express = require('express');
const { query } = require('./db');
const router = express.Router();

// Endpoint para listar disciplinas
router.get('/Disciplinas', async (req, res) => {
  try {
    const disciplinas = await query('SELECT * FROM Disciplinas');
    res.json(disciplinas);
  } catch (error) {
    console.error('Erro ao buscar disciplinas:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para atualizar uma disciplina
router.put('/Disciplinas/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cor, icone } = req.body;

  try {
    await query(
      'UPDATE Disciplinas SET nome = $1, cor = $2, icone = $3 WHERE id = $4',
      [nome, cor, icone, id]
    );
    res.send('Disciplina atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar disciplina:', error);
    res.status(500).send('Erro no servidor');
  }
});

module.exports = router;

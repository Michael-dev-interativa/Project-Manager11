const express = require('express');
const { query } = require('./db');
const router = express.Router();

// Endpoint para buscar usuários
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await query('SELECT * FROM usuarios ORDER BY nome');
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Endpoint para criar usuário
router.post('/usuarios', async (req, res) => {
  const { nome, email, cargo, role, ativo } = req.body;
  try {
    const result = await query(
      'INSERT INTO usuarios (nome, email, cargo, role, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, email, cargo, role, ativo]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Endpoint para atualizar usuário
router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, cargo, role, ativo } = req.body;
  try {
    const result = await query(
      'UPDATE usuarios SET nome = $1, email = $2, cargo = $3, role = $4, ativo = $5 WHERE id = $6 RETURNING *',
      [nome, email, cargo, role, ativo, id]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Endpoint para deletar usuário
router.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Endpoint para autenticação
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query('SELECT * FROM usuarios WHERE email = $1 AND senha = $2', [email, password]);
    if (result.length > 0) {
      res.json({ token: 'seu-token-aqui' }); // Retorne um token JWT ou similar
    } else {
      res.status(401).send('Credenciais inválidas');
    }
  } catch (error) {
    console.error('Erro ao autenticar:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar empreendimentos
router.get('/Empreendimentos', async (req, res) => {
  try {
    const empreendimentos = await query('SELECT * FROM Empreendimentos');
    res.json(empreendimentos);
  } catch (error) {
    console.error('Erro ao buscar empreendimentos:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar atividades
router.get('/Atividade', async (req, res) => {
  try {
    const atividades = await query('SELECT * FROM Atividade');
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar atividades genéricas
router.get('/AtividadeGenerica', async (req, res) => {
  try {
    const atividadesGenericas = await query('SELECT * FROM AtividadeGenerica');
    res.json(atividadesGenericas);
  } catch (error) {
    console.error('Erro ao buscar atividades genéricas:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para criar uma nova atividade genérica
router.post('/AtividadeGenerica', async (req, res) => {
  const { nome } = req.body;

  try {
    await query('INSERT INTO AtividadeGenerica (nome) VALUES ($1)', [nome]);
    res.send('Atividade genérica criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar atividade genérica:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para atualizar uma atividade
router.put('/Atividade/:id', async (req, res) => {
  const { id } = req.params;
  const { etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao, empreendimento_id } = req.body;

  try {
    await query(
      'UPDATE Atividade SET etapa = $1, disciplina = $2, subdisciplina = $3, atividade = $4, predecessora = $5, tempo = $6, funcao = $7, id_atividade = $8 WHERE id = $9',
      [etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao, id_atividade, id]
    );
    res.send('Atividade atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar documentos
router.get('/Documento', async (req, res) => {
  try {
    const Documento = await query('SELECT * FROM Documento');
    res.json(Documento);
  } catch (error) {
    console.error('Erro ao buscar Documento:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar analíticos
router.get('/Analitico', async (req, res) => {
  try {
    const Analitico = await query('SELECT * FROM Analitico');
    res.json(Analitico);
  } catch (error) {
    console.error('Erro ao buscar analíticos:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar atividades
router.get('/Atividade', async (req, res) => {
  try {
    const Atividade = await query('SELECT * FROM Atividade');
    res.json(Atividade);
  } catch (error) {
    console.error('Erro ao buscar Atividade:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar execuções
router.get('/Execucao', async (req, res) => {
  try {
    const Execuccao = await query('SELECT * FROM Execucao');
    res.json(Execucao);
  } catch (error) {
    console.error('Erro ao buscar execuções:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para listar empreendimentos
router.get('/Empreendimento', async (req, res) => {
  try {
    const Empreendimento = await query('SELECT * FROM Empreendimento');
    res.json(Empreendimento);
  } catch (error) {
    console.error('Erro ao buscar Empreendimento:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Endpoint para buscar informações do usuário
router.get('/Usuario/me', async (req, res) => {
  const userEmail = req.query.email; // Supondo que o email do usuário seja enviado na requisição

  try {
    const Usuario = await query('SELECT * FROM Usuario WHERE email = $1', [userEmail]);
    if (Usuario.length > 0) {
      res.json(Usuario[0]);
    } else {
      res.status(404).send('Usuário não encontrado');
    }
  } catch (error) {
    console.error('Erro ao buscar informações do usuário:', error);
    res.status(500).send('Erro no servidor');
  }
});

module.exports = router;
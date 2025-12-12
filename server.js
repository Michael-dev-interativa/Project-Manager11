require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
// Middleware para interpretar JSON
app.use(express.json());
// Libera CORS para o frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
// Middleware para responder OPTIONS automaticamente
app.options('/api/planejamento-atividades/:id', (req, res) => {
  res.sendStatus(204);
});

// PUT: atualiza um PlanejamentoAtividade por ID
app.put('/api/planejamento-atividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    // Processa ação de iniciar/finalizar
    if (data.acao === 'iniciar') {
      data.status = 'em_andamento';
      const now = new Date();
      const brasiliaDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      data.inicio_real = brasiliaDate.toISOString();
      data.tempo_executado = 0;
    }

    if (data.acao === 'finalizar') {
      data.status = 'concluido';
      const now = new Date();
      const brasiliaDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      data.termino_real = brasiliaDate.toISOString();

      // Buscar registro atual para calcular sobra
      const atual = await pool.query('SELECT * FROM public."PlanejamentoAtividade" WHERE id = $1', [parseInt(id)]);
      if (atual.rows.length > 0) {
        const total_planejado = Number(atual.rows[0].tempo_planejado || 0);
        // Frontend envia horas; não converter de segundos aqui
        const tempo_executado_horas = Number(data.tempo_executado ?? atual.rows[0].tempo_executado ?? 0);
        data.tempo_executado = tempo_executado_horas;
        data.sobra_real = total_planejado - tempo_executado_horas;
      }
    }

    // Fallback: se marcou concluído sem ação 'finalizar', calcular tempo_executado pela diferença de datas
    if (!data.acao && (data.status === 'concluido' || data.status === 'finalizado')) {
      try {
        const atual = await pool.query('SELECT * FROM public."PlanejamentoAtividade" WHERE id = $1', [parseInt(id)]);
        if (atual.rows.length > 0) {
          const row = atual.rows[0];
          const inicio = row.inicio_real ? new Date(row.inicio_real) : null;
          const termino = row.termino_real ? new Date(row.termino_real) : new Date();
          if (inicio) {
            const diffHoras = (termino - inicio) / 3600000; // ms -> horas
            const horas = Math.max(0, diffHoras);
            const total_planejado = Number(row.tempo_planejado || 0);
            data.tempo_executado = Number(horas.toFixed(4));
            data.sobra_real = total_planejado - data.tempo_executado;
            data.termino_real = termino.toISOString();
            data.status = 'concluido';
          }
        }
      } catch (e) {
        console.warn('[BACKEND][FALLBACK Atividade] Erro ao calcular tempo_executado por datas:', e.message);
      }
    }

    // Monta campos permitidos para atualização
    const allowedFields = [
      'descritivo', 'atividade_id', 'empreendimento_id', 'etapa', 'executores', 'executor_principal', 'predecessora_id',
      'tempo_planejado', 'inicio_planejado', 'termino_planejado', 'sobra_planejada',
      'inicio_ajustado', 'termino_ajustado', 'sobra_ajustada',
      'inicio_real', 'termino_real', 'sobra_real', 'tempo_executado', 'status', 'horas_por_dia'
    ];
    const setParts = [];
    const values = [];
    let idx = 1;
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        setParts.push(`"${field}" = $${idx}`);
        // Serializa executores se for array
        if (field === 'executores' && Array.isArray(data[field])) {
          values.push(JSON.stringify(data[field]));
        } else if (field === 'atividade_id' || field === 'empreendimento_id' || field === 'predecessora_id') {
          values.push(data[field] !== null ? parseInt(data[field]) : null);
        } else if (field === 'tempo_planejado' || field === 'sobra_planejada' || field === 'sobra_ajustada' || field === 'sobra_real' || field === 'tempo_executado') {
          values.push(data[field] !== null ? parseFloat(data[field]) : null);
        } else {
          values.push(data[field]);
        }
        idx++;
      }
    }
    if (setParts.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }
    // Corrige status para 'concluido' se vier 'finalizado'
    const statusIdx = allowedFields.indexOf('status');
    if (data.status === 'finalizado') {
      const statusFieldIdx = setParts.findIndex(p => p.includes('status'));
      if (statusFieldIdx !== -1) {
        values[statusFieldIdx] = 'concluido';
      }
    }
    const sql = `UPDATE public."PlanejamentoAtividade" SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
    values.push(parseInt(id));
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PlanejamentoAtividade não encontrado' });
    }
    const updated = result.rows[0];

    // Registro de execução: cria um log em Execucao ao iniciar/finalizar
    try {
      if (data.acao === 'iniciar') {
        const inicio = updated.inicio_real || new Date().toISOString();
        const usuario = (updated.executor_principal && String(updated.executor_principal).trim())
          || (Array.isArray(updated.executores) && updated.executores.length > 0 ? updated.executores[0] : '')
          || (req.user && req.user.email) || '';
        const usuario_ajudado = data.usuario_ajudado || '';
        const payload = {
          empreendimento_id: parseInt(updated.empreendimento_id),
          usuario,
          usuario_ajudado,
          observacao: '',
          status: 'em_andamento',
          inicio,
          termino: null,
          tempo_total: 0,
          atividade_nome: updated.descritivo || 'Atividade',
          planejamento_id: parseInt(id)
        };
        // Upsert rígido: tenta atualizar a última linha por planejamento_id; se não existir, insere
        const updatedExec = await updateExecucaoByPlanejamentoLatest(pool, id, {
          status: 'em_andamento',
          inicio,
          termino: null,
          tempo_total: 0,
          observacao: '',
          usuario,
          executor_principal: usuario,
          usuario_ajudado,
          atividade_nome: payload.atividade_nome,
          empreendimento_id: payload.empreendimento_id
        });
        if (updatedExec) {
          console.log('[Execucao][UPSERT][UPDATE OK] atividade iniciar', { execucao_id: updatedExec.id });
        } else {
          console.log('[Execucao][INSERT]', payload);
          await insertExecucaoRobust(pool, payload);
          console.log('[Execucao][INSERT][OK] atividade iniciar');
        }
      }
      if (data.acao === 'finalizar' || data.status === 'concluido' || data.status === 'finalizado') {
        const termino = updated.termino_real || new Date().toISOString();
        const tempoHoras = Number(updated.tempo_executado || 0);
        const tempoHorasStr = Math.max(0, tempoHoras).toFixed(4);
        const usuario = (updated.executor_principal && String(updated.executor_principal).trim())
          || (Array.isArray(updated.executores) && updated.executores.length > 0 ? updated.executores[0] : '')
          || (req.user && req.user.email) || '';
        const usuario_ajudado = data.usuario_ajudado || '';
        const updates = {
          status: 'concluido',
          termino,
          tempo_total: tempoHorasStr,
          usuario,
          executor_principal: usuario,
          usuario_ajudado,
          observacao: (data.observacao ?? updated.observacao ?? '')
        };
        const updatedExec = await updateExecucaoByPlanejamentoLatest(pool, id, updates);
        if (updatedExec) {
          console.log('[Execucao][UPDATE BY PLANEJAMENTO][OK] atividade finalizar', { execucao_id: updatedExec.id });
        } else {
          console.warn('[Execucao][UPDATE BY PLANEJAMENTO][MISS] nenhuma linha encontrada; evitando INSERT para não duplicar');
        }
      }
    } catch (logErr) {
      console.warn('[Execucao] Falha ao registrar execução de PlanejamentoAtividade:', logErr.message);
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar PlanejamentoAtividade:', error);
    res.status(500).json({ error: 'Erro ao atualizar PlanejamentoAtividade', details: error.message });
  }
});
const port = 3001;



// Configuração do PostgreSQL
const pool = new Pool({
  user: 'postgres', // Substituir pelo usuário correto
  host: 'localhost',
  database: 'interativa',
  password: 'IntEng@2025', // Substituir pela senha correta
  port: 5433,
});

// Log global de todas as requisições HTTP
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
// Middlewares
app.use(cors({
  origin: 'http://localhost:3000', // ajuste conforme seu frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo_super_secreto',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true se usar https
}));
app.use(passport.initialize());
app.use(passport.session());

// Serialização do usuário na sessão
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM "Usuario" WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Configuração do Google OAuth2
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'SUA_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'SUA_CLIENT_SECRET',
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Busca usuário pelo email
    const email = profile.emails[0].value;
    let result = await pool.query('SELECT * FROM "Usuario" WHERE email = $1', [email]);
    let user = result.rows[0];
    if (!user) {
      // Cria usuário se não existir
      const nome = profile.displayName;
      const cargo = 'Google';
      // perfil = papel do usuário, status = ativo
      result = await pool.query(
        'INSERT INTO "Usuario" (nome, email, cargo, perfil, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [nome, email, cargo, 'user', 'ativo']
      );
      user = result.rows[0];
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Rotas de autenticação Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: true
  }),
  (req, res) => {
    // Redireciona para o frontend após login
    res.redirect('http://localhost:3001');
  }
);

// Rota para obter usuário autenticado
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Não autenticado' });
  }
});

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Teste de conexão
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Conexão com PostgreSQL estabelecida!',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Erro na conexão:', error);
    res.status(500).json({ error: 'Erro na conexão com banco de dados' });
  }
});

// Helper: detectar tabela Execucao real e executar SELECT com fallback
async function selectExecucaoWithFallback(pool, filters = {}) {
  const { dia, planejamento_id, usuario } = filters;

  const table = 'public."Execucao"';
  const values = [];
  const where = [];
  let available = [];
  try {
    const colsRes = await pool.query(
      `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = lower('Execucao')`
    );
    available = colsRes.rows.map(r => r.c);
  } catch (_) {
    available = [];
  }

  let sql = `SELECT * FROM ${table}`;

  // Filtro por planejamento (suporta colunas alternativas; null/vazio/'0')
  const planColsCandidates = ['planejamento_id', 'planejamento_atividade_id', 'planejamento_documento_id'];
  const planCols = planColsCandidates.filter(c => available.includes(c));
  if (planejamento_id !== undefined && planCols.length > 0) {
    if (String(planejamento_id).toLowerCase() === 'null' || planejamento_id === null) {
      const parts = planCols.map(c => `(${c} IS NULL OR NULLIF(CAST(${c} AS TEXT), '') IS NULL OR CAST(${c} AS TEXT) = '0')`);
      where.push(`(${parts.join(' OR ')})`);
    } else {
      const idx = values.length + 1;
      values.push(parseInt(planejamento_id));
      const parts = planCols.map(c => `${c} = $${idx}`);
      where.push(`(${parts.join(' OR ')})`);
    }
  }

  // Filtro por usuário (somente colunas existentes)
  if (usuario) {
    const userColsCandidates = ['usuario', 'usuario_email', 'usuario_nome', 'executor', 'executor_principal'];
    const userCols = userColsCandidates.filter(c => available.includes(c));
    if (userCols.length > 0) {
      const idx = values.length + 1;
      values.push(String(usuario));
      const parts = userCols.map(c => `${c} = $${idx}`);
      where.push(`(${parts.join(' OR ')})`);
    }
  }

  // Filtro por dia
  if (dia && available.includes('inicio')) {
    where.push(`CAST(inicio AS TEXT) LIKE $${values.length + 1}`);
    values.push(`${dia}%`);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY inicio DESC NULLS LAST';
  const result = await pool.query(sql, values);
  return result.rows;
}

// Helper: listar AtividadeGenerica com fallback de tabela/nomes
async function selectAtividadeGenericaWithFallback(pool) {
  const candidates = [
    'public."AtividadeGenerica"',
    'public.atividadegenerica',
    'public.atividade_generica',
    'public.atividades_genericas'
  ];
  let lastErr = null;
  for (const table of candidates) {
    try {
      const sql = `SELECT * FROM ${table} ORDER BY nome`;
      const result = await pool.query(sql);
      return result.rows;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Tabela AtividadeGenerica não encontrada');
}

// Helper: inserir AtividadeGenerica com fallback de tabela/coluna
async function insertAtividadeGenericaWithFallback(pool, payload = {}) {
  const { nome } = payload;
  if (!nome || String(nome).trim().length === 0) {
    throw new Error('Nome é obrigatório');
  }
  const candidates = [
    'public."AtividadeGenerica"',
    'public.atividadegenerica',
    'public.atividade_generica',
    'public.atividades_genericas'
  ];
  const columnOptions = ['nome', 'titulo', 'descricao'];
  let lastErr = null;
  for (const table of candidates) {
    for (const col of columnOptions) {
      try {
        const sql = `INSERT INTO ${table} (${col}) VALUES ($1) RETURNING *`;
        const result = await pool.query(sql, [String(nome).trim()]);
        const row = result.rows[0];
        // Normaliza o campo nome na resposta
        const normalized = { ...row, nome: row.nome || row.titulo || row.descricao };
        return normalized;
      } catch (err) {
        lastErr = err;
      }
    }
  }
  throw lastErr || new Error('Falha ao inserir AtividadeGenerica');
}

// Rotas Execucao: listar registros de execução (com fallback de tabela)
app.get('/api/Execucao', async (req, res) => {
  try {
    const rows = await selectExecucaoWithFallback(pool, req.query || {});
    // Normalizar campo de usuário para a resposta, cobrindo variações de coluna
    const norm = rows.map(r => {
      const usuario = r.usuario || r.usuario_email || r.usuario_nome || r.executor || r.executor_principal || '';
      const atividade_nome = r.atividade_nome || r.documento_nome || r.descricao || r.titulo || null;
      return { ...r, usuario, atividade_nome };
    });
    res.json(norm);
  } catch (error) {
    console.error('Erro ao buscar execuções (fallback):', error);
    res.status(500).json({ error: 'Erro ao buscar execuções', details: error.message });
  }
});

// Debug: listar rotas registradas (somente para desenvolvimento)
app.get('/api/_debug/routes', (req, res) => {
  try {
    const routes = [];
    app._router.stack.forEach((m) => {
      if (m.route) {
        const methods = Object.keys(m.route.methods).filter(k => m.route.methods[k]);
        routes.push({ methods, path: m.route.path });
      } else if (m.name === 'router' && m.handle && m.handle.stack) {
        m.handle.stack.forEach((h) => {
          if (h.route) {
            const methods = Object.keys(h.route.methods).filter(k => h.route.methods[k]);
            routes.push({ methods, path: h.route.path });
          }
        });
      }
    });
    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: 'debug_failed', details: e.message });
  }
});

// Rota: listar atividades genéricas
app.get('/api/AtividadeGenerica', async (req, res) => {
  try {
    const rows = await selectAtividadeGenericaWithFallback(pool);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar AtividadeGenerica:', error);
    res.status(500).json({ error: 'Erro ao buscar AtividadeGenerica', details: error.message });
  }
});
// Alias minúsculo
app.get('/api/atividadegenerica', async (req, res) => {
  try {
    const rows = await selectAtividadeGenericaWithFallback(pool);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar atividadegenerica:', error);
    res.status(500).json({ error: 'Erro ao buscar atividadegenerica', details: error.message });
  }
});

// Criar atividade genérica
app.post('/api/AtividadeGenerica', async (req, res) => {
  try {
    const { nome } = req.body || {};
    if (!nome || String(nome).trim().length === 0) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const row = await insertAtividadeGenericaWithFallback(pool, { nome });
    res.status(201).json(row);
  } catch (error) {
    console.error('Erro ao criar AtividadeGenerica:', error);
    res.status(500).json({ error: 'Erro ao criar AtividadeGenerica', details: error.message });
  }
});
// Alias minúsculo
app.post('/api/atividadegenerica', async (req, res) => {
  try {
    const { nome } = req.body || {};
    if (!nome || String(nome).trim().length === 0) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const row = await insertAtividadeGenericaWithFallback(pool, { nome });
    res.status(201).json(row);
  } catch (error) {
    console.error('Erro ao criar atividadegenerica:', error);
    res.status(500).json({ error: 'Erro ao criar atividadegenerica', details: error.message });
  }
});

// Preflight explícito (ajuda em ambientes que não tratam OPTIONS por padrão)
app.options('/api/AtividadeGenerica', (req, res) => res.sendStatus(204));
app.options('/api/atividadegenerica', (req, res) => res.sendStatus(204));

// Atualiza status da Execução mais recente por planejamento (ex.: Pausar)
app.post('/api/Execucao/pause', async (req, res) => {
  try {
    const { planejamento_id, status, tempo_total } = req.body || {};
    if (!planejamento_id) {
      return res.status(400).json({ error: 'planejamento_id é obrigatório' });
    }
    const desiredStatus = (status || 'paralisado').toLowerCase() === 'pausado' ? 'paralisado' : (status || 'paralisado');

    const candidates = ['public."Execucao"', 'public.execucao', 'public.execucoes'];
    let lastErr = null;
    for (const table of candidates) {
      try {
        // Normaliza tempo_total para horas com decimais fixos (texto)
        const tempoHoras = (() => {
          if (tempo_total === null || tempo_total === undefined) return null;
          const n = Number(tempo_total);
          if (Number.isNaN(n)) return null;
          const horas = Math.max(0, n / 3600);
          return horas.toFixed(4);
        })();
        const values = [desiredStatus, tempoHoras, parseInt(planejamento_id)];
        const sql = `UPDATE ${table}
          SET status = $1,
              tempo_total = COALESCE($2, tempo_total)
          WHERE ctid IN (
            SELECT ctid FROM ${table}
            WHERE planejamento_id = $3 AND (termino IS NULL OR termino = '')
            ORDER BY inicio DESC NULLS LAST
            LIMIT 1
          )
          RETURNING *`;
        const result = await pool.query(sql, values);
        if (result.rows.length === 0) {
          // Nenhuma linha aberta; tenta atualizar a mais recente (mesmo com termino) como fallback
          const altSql = `UPDATE ${table}
            SET status = $1,
                tempo_total = COALESCE($2, tempo_total)
            WHERE ctid IN (
              SELECT ctid FROM ${table}
              WHERE planejamento_id = $3
              ORDER BY inicio DESC NULLS LAST
              LIMIT 1
            )
            RETURNING *`;
          const alt = await pool.query(altSql, values);
          if (alt.rows.length === 0) {
            continue; // tenta próxima tabela
          } else {
            return res.json(alt.rows[0]);
          }
        } else {
          return res.json(result.rows[0]);
        }
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) {
      console.error('[Execucao/pause] Falha ao atualizar status:', lastErr.message);
    }
    return res.status(404).json({ error: 'Execução não encontrada para o planejamento informado' });
  } catch (error) {
    console.error('Erro ao pausar execução:', error);
    res.status(500).json({ error: 'Erro ao pausar execução', details: error.message });
  }
});

// Finalizar última execução rápida (sem planejamento) por usuário
app.post('/api/Execucao/finish-quick', async (req, res) => {
  try {
    const { usuario, tempo_total } = req.body || {};
    if (!usuario) {
      return res.status(400).json({ error: 'usuario é obrigatório' });
    }
    const candidates = ['public."Execucao"'];
    let lastErr = null;
    for (const table of candidates) {
      try {
        // Converter segundos do timer para horas e manter casas decimais como texto
        // Armazenar como string garante visibilidade das casas (ex.: 0.00, 0.0400)
        const tempoHoras = (() => {
          if (tempo_total === null || tempo_total === undefined) return null;
          const n = Number(tempo_total);
          if (Number.isNaN(n)) return null;
          const horas = Math.max(0, n / 3600);
          // Use 4 casas para precisão; se preferir 2, troque para toFixed(2)
          return horas.toFixed(4);
        })();
        const values = [
          'finalizado',
          new Date().toISOString(),
          tempoHoras,
          String(usuario)
        ];
        const sql = `UPDATE ${table}
          SET status = $1,
              termino = $2,
              tempo_total = $3
          WHERE ctid IN (
            SELECT ctid FROM ${table}
            WHERE (
              planejamento_id IS NULL
              OR NULLIF(CAST(planejamento_id AS TEXT), '') IS NULL
              OR CAST(planejamento_id AS TEXT) = '0'
            )
              AND usuario = $4
            ORDER BY inicio DESC NULLS LAST
            LIMIT 1
          )
          RETURNING *`;
        const result = await pool.query(sql, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Nenhuma execução rápida encontrada para o usuário' });
        }
        return res.json(result.rows[0]);
      } catch (err) {
        lastErr = err;
      }
    }
    console.error('[Execucao/finish-quick] Falha ao finalizar execução rápida:', lastErr?.message || lastErr);
    res.status(500).json({ error: 'Erro ao finalizar execução rápida', details: lastErr?.message || 'unknown' });
  } catch (error) {
    console.error('Erro ao finalizar execução rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Preflight explícito para finish-quick
app.options('/api/Execucao/finish-quick', (req, res) => res.sendStatus(204));

// Endpoint de manutenção: normalizar planejamento_id vazio para NULL
app.post('/api/_maintenance/normalize-execucao-planejamento', async (req, res) => {
  try {
    const table = 'public."Execucao"';
    const sql = `UPDATE ${table}
      SET planejamento_id = NULL
      WHERE NULLIF(CAST(planejamento_id AS TEXT), '') IS NULL`;
    const result = await pool.query(sql);
    res.json({ updated: result.rowCount });
  } catch (e) {
    console.error('Manutenção Execucao planejamento_id:', e.message);
    res.status(500).json({ error: 'maintenance_failed', details: e.message });
  }
});

// Rotas para PlanejamentoAtividade
app.get('/api/planejamento-atividades', async (req, res) => {
  try {
    const { empreendimento_id, executor_principal, limit, horas_por_dia } = req.query;

    let query = 'SELECT * FROM public."PlanejamentoAtividade" WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (empreendimento_id) {
      query += ` AND empreendimento_id = $${paramCount}`;
      values.push(parseInt(empreendimento_id));
      paramCount++;
    }

    if (executor_principal) {
      query += ` AND executor_principal = $${paramCount}`;
      values.push(executor_principal);
      paramCount++;
    }

    // Filtro por horas_por_dia (pode ser número ou JSON/texto)
    if (horas_por_dia) {
      // Se for um número, filtra por igualdade simples
      // Se for string JSON, pode ser necessário adaptar para o formato do banco
      query += ` AND (
        (CAST(horas_por_dia AS TEXT) = $${paramCount})
        OR (CAST(horas_por_dia AS FLOAT) = $${paramCount})
      )`;
      values.push(horas_por_dia);
      paramCount++;
    }

    query += ' ORDER BY inicio_planejado DESC';

    if (limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(limit));
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar planejamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


app.get('/api/planejamento-atividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM public."PlanejamentoAtividade" WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar planejamento específico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Corrigindo rota POST
const { DateTime } = require('luxon');
// Helper: inserir execução em tabela existente (tentando variações de esquema/colunas)
async function insertExecucaoFlexible(pool, payload) {
  // payload: { atividade_nome, observacao, status, tempo_total, inicio, termino, planejamento_atividade_id, planejamento_documento_id }
  // Tentativa 1: tabela public."Execucao" com colunas ricas
  try {
    const cols = ['atividade_nome', 'observacao', 'status', 'tempo_total', 'inicio'];
    const tempoHorasStr = (() => {
      const n = Number(payload.tempo_total ?? 0);
      if (Number.isNaN(n)) return payload.tempo_total ?? 0;
      const horas = Math.max(0, n / 3600);
      return horas.toFixed(4);
    })();
    const vals = [payload.atividade_nome || 'Atividade', payload.observacao || '', payload.status || 'em_andamento', tempoHorasStr, payload.inicio || new Date().toISOString()];
    let sql = 'INSERT INTO public."Execucao" (atividade_nome, observacao, status, tempo_total, inicio';
    if (payload.termino) { sql += ', termino'; cols.push('termino'); vals.push(payload.termino); }
    if (payload.planejamento_atividade_id) { sql += ', planejamento_atividade_id'; cols.push('planejamento_atividade_id'); vals.push(parseInt(payload.planejamento_atividade_id)); }
    if (payload.planejamento_documento_id) { sql += ', planejamento_documento_id'; cols.push('planejamento_documento_id'); vals.push(parseInt(payload.planejamento_documento_id)); }
    sql += ') VALUES (' + cols.map((_, i) => `$${i + 1}`).join(',') + ')';
    await pool.query(sql, vals);
    return true;
  } catch (err1) {
    console.warn('[Execucao] Falha ao inserir em public."Execucao" via caminho flexível:', err1.message);
    return false;
  }
}

// Helper robusto: tenta inserir preenchendo todas as colunas pedidas; se falhar, detecta colunas existentes e monta INSERT dinâmico
async function insertExecucaoRobust(pool, payload) {
  const fullCols = [
    'empreendimento_id', 'usuario', 'usuario_ajudado', 'observacao', 'status', 'inicio', 'termino', 'tempo_total', 'atividade_nome', 'planejamento_id'
  ];
  const fullVals = [
    payload.empreendimento_id ?? null,
    payload.usuario ?? '',
    payload.usuario_ajudado ?? '',
    payload.observacao ?? '',
    payload.status ?? 'em_andamento',
    payload.inicio || new Date().toISOString(),
    payload.termino ?? null,
    (() => { const n = Number(payload.tempo_total ?? 0); if (Number.isNaN(n)) return payload.tempo_total ?? 0; const horas = Math.max(0, n / 3600); return horas.toFixed(4); })(),
    payload.atividade_nome || 'Atividade',
    payload.planejamento_id ?? null
  ];
  const tableCandidates = ['public."Execucao"'];
  // Tentativa 1: insert completo
  for (const table of tableCandidates) {
    try {
      const sql = `INSERT INTO ${table} (${fullCols.join(',')}) VALUES (${fullCols.map((_, i) => '$' + (i + 1)).join(',')})`;
      await pool.query(sql, fullVals);
      return true;
    } catch (err) {
      // continua para fallback
    }
  }
  // Tentativa 2: descobrir colunas disponíveis e montar INSERT dinâmico
  const infoCandidates = [
    { schema: 'public', table: 'Execucao' }
  ];
  for (const cand of infoCandidates) {
    try {
      const colsRes = await pool.query(
        `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = $1 AND lower(table_name) = lower($2)`,
        [cand.schema, cand.table]
      );
      if (colsRes.rows.length === 0) continue;
      const available = colsRes.rows.map(r => r.c);
      console.log('[Execucao][INSERT][cols disponíveis]', { table: `${cand.schema}.${cand.table}`, available });
      const useCols = [];
      const useVals = [];
      let idx = 1;
      const mapping = {
        empreendimento_id: payload.empreendimento_id ?? null,
        usuario: payload.usuario ?? '',
        usuario_email: payload.usuario ?? '',
        usuario_nome: payload.usuario ?? '',
        executor: payload.usuario ?? '',
        executor_principal: payload.executor_principal ?? payload.usuario ?? '',
        usuario_ajudado: payload.usuario_ajudado ?? '',
        observacao: payload.observacao ?? '',
        observacoes: payload.observacao ?? '',
        observacao_texto: payload.observacao ?? '',
        observacao_execucao: payload.observacao ?? '',
        observacao_finalizacao: payload.observacao ?? '',
        comentario: payload.observacao ?? '',
        comentarios: payload.observacao ?? '',
        descricao: payload.observacao ?? '',
        status: payload.status ?? 'em_andamento',
        inicio: payload.inicio || new Date().toISOString(),
        termino: payload.termino ?? null,
        tempo_total: (() => { const n = Number(payload.tempo_total ?? 0); if (Number.isNaN(n)) return payload.tempo_total ?? 0; const horas = Math.max(0, n / 3600); return horas.toFixed(4); })(),
        atividade_nome: payload.atividade_nome || 'Atividade',
        documento_nome: payload.documento_nome || payload.atividade_nome || null,
        planejamento_id: payload.planejamento_id ?? null,
        // Fallbacks comuns
        planejamento_atividade_id: payload.planejamento_id ?? null,
        planejamento_documento_id: payload.planejamento_id ?? null
      };
      for (const [col, val] of Object.entries(mapping)) {
        if (available.includes(col)) {
          useCols.push(col);
          useVals.push(val);
          idx++;
        }
      }
      if (useCols.length === 0) continue;
      const sql = `INSERT INTO ${cand.schema}."${cand.table}" (${useCols.join(',')}) VALUES (${useCols.map((_, i) => '$' + (i + 1)).join(',')})`;
      console.log('[Execucao][INSERT][dinâmico]', { table: `${cand.schema}.${cand.table}`, useCols });
      await pool.query(sql, useVals);
      console.warn('[Execucao] Inserção realizada via fallback dinâmico em', `${cand.schema}.${cand.table}`);
      return true;
    } catch (err) {
      // tenta próximo
    }
  }
  throw new Error('Falha ao inserir Execucao em quaisquer variações de tabela/colunas');
}

// Helper: atualizar execução existente (finalização) com fallback de tabela/colunas
async function updateExecucaoRobust(pool, filtro, updates) {
  const candidates = [
    { schema: 'public', table: 'Execucao' }
  ];
  let lastErr = null;
  for (const cand of candidates) {
    try {
      const colsRes = await pool.query(
        `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = $1 AND lower(table_name) = lower($2)`,
        [cand.schema, cand.table]
      );
      const available = colsRes.rows.map(r => r.c);
      // Monta WHERE por planejamento_id (ou colunas alternativas) e status em_andamento
      let whereCol = 'planejamento_id';
      if (!available.includes(whereCol)) {
        if (available.includes('planejamento_atividade_id')) whereCol = 'planejamento_atividade_id';
        else if (available.includes('planejamento_documento_id')) whereCol = 'planejamento_documento_id';
      }
      if (!available.includes(whereCol)) continue;
      const whereParts = [`${whereCol} = $1`];
      const whereVals = [parseInt(filtro.planejamento_id)];
      if (filtro.status) {
        if (available.includes('status')) { whereParts.push(`status = $2`); whereVals.push(filtro.status); }
      }
      // Seleciona a última execução em andamento para este planejamento
      const selSql = `SELECT * FROM ${cand.schema}."${cand.table}" WHERE ${whereParts.join(' AND ')} ORDER BY inicio DESC NULLS LAST LIMIT 1`;
      const selRes = await pool.query(selSql, whereVals);
      if (selRes.rows.length === 0) { lastErr = new Error('Nenhum registro de execução em andamento encontrado'); continue; }
      const row = selRes.rows[0];
      // Monta SET dinâmico com colunas existentes
      const setCols = [];
      const setVals = [];
      let idx = 1;
      const mapping = {
        status: updates.status,
        termino: updates.termino,
        tempo_total: (() => { if (updates.tempo_total === undefined) return undefined; const n = Number(updates.tempo_total); if (Number.isNaN(n)) return updates.tempo_total; const horas = Math.max(0, n); return horas.toFixed(4); })(),
        observacao: updates.observacao,
        observacoes: updates.observacao,
        observacao_texto: updates.observacao,
        observacao_execucao: updates.observacao,
        observacao_finalizacao: updates.observacao,
        comentario: updates.observacao,
        comentarios: updates.observacao,
        descricao: updates.observacao,
        usuario: updates.usuario,
        usuario_ajudado: updates.usuario_ajudado,
        usuario_email: updates.usuario,
        usuario_nome: updates.usuario,
        executor: updates.usuario,
        executor_principal: updates.usuario,
        atividade_nome: updates.atividade_nome,
        documento_nome: updates.documento_nome,
        empreendimento_id: updates.empreendimento_id
      };
      for (const [col, val] of Object.entries(mapping)) {
        if (val !== undefined && available.includes(col)) {
          setCols.push(`${col} = $${idx}`);
          setVals.push(val);
          idx++;
        }
      }
      if (setCols.length === 0) { lastErr = new Error('Nenhum campo válido para atualizar'); continue; }
      const updSql = `UPDATE ${cand.schema}."${cand.table}" SET ${setCols.join(', ')} WHERE id = $${idx}`;
      setVals.push(row.id);
      await pool.query(updSql, setVals);
      return true;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Falha ao atualizar Execucao');
}
// Helper: localizar execução já em andamento para um planejamento (evitar duplicidade)
async function findExecucaoEmAndamento(pool, planejamentoId) {
  const candidates = ['public."Execucao"'];
  for (const table of candidates) {
    try {
      const res = await pool.query(
        `SELECT * FROM ${table} WHERE planejamento_id = $1 AND (status = 'em_andamento' OR termino IS NULL) ORDER BY inicio DESC NULLS LAST LIMIT 1`,
        [parseInt(planejamentoId)]
      );
      if (res.rows.length > 0) return { table, row: res.rows[0] };
    } catch (_) { }
  }
  return null;
}
// Helper: localizar última execução por planejamento (qualquer status)
async function findLatestExecucaoByPlanejamento(pool, planejamentoId) {
  const candidates = ['public."Execucao"'];
  for (const table of candidates) {
    try {
      const res = await pool.query(
        `SELECT * FROM ${table} WHERE planejamento_id = $1 ORDER BY inicio DESC NULLS LAST LIMIT 1`,
        [parseInt(planejamentoId)]
      );
      if (res.rows.length > 0) return { table, row: res.rows[0] };
    } catch (_) { }
  }
  return null;
}

// Helper: atualiza diretamente por planejamento_id usando a última linha encontrada
async function updateExecucaoByPlanejamentoLatest(pool, planejamentoId, updates) {
  const latest = await findLatestExecucaoByPlanejamento(pool, planejamentoId);
  if (!latest) return null;
  // Descobrir colunas disponíveis na tabela alvo
  const [schema, tableName] = latest.table.includes('.') ? latest.table.split('.') : ['public', latest.table.replace(/"/g, '')];
  const colsRes = await pool.query(
    `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = $1 AND lower(table_name) = lower($2)`,
    [schema.replace(/"/g, ''), tableName.replace(/"/g, '')]
  );
  const available = colsRes.rows.map(r => r.c);
  console.log('[Execucao][UPDATE][cols disponíveis]', { table: latest.table, available });
  // Mapear updates incluindo alternativas para usuário
  const mapping = {
    status: updates.status,
    termino: updates.termino,
    tempo_total: (() => { if (updates.tempo_total === undefined) return undefined; const n = Number(updates.tempo_total); if (Number.isNaN(n)) return updates.tempo_total; const horas = Math.max(0, n); return horas.toFixed(4); })(),
    observacao: updates.observacao,
    observacoes: updates.observacao,
    observacao_texto: updates.observacao,
    observacao_execucao: updates.observacao,
    observacao_finalizacao: updates.observacao,
    comentario: updates.observacao,
    comentarios: updates.observacao,
    descricao: updates.observacao,
    usuario: updates.usuario,
    usuario_ajudado: updates.usuario_ajudado,
    usuario_email: updates.usuario,
    usuario_nome: updates.usuario,
    executor: updates.usuario,
    executor_principal: updates.executor_principal ?? updates.usuario,
    atividade_nome: updates.atividade_nome,
    documento_nome: updates.documento_nome,
    empreendimento_id: updates.empreendimento_id
  };
  const setCols = [];
  const setVals = [];
  let idx = 1;
  for (const [col, val] of Object.entries(mapping)) {
    if (val !== undefined && available.includes(col)) {
      setCols.push(`${col} = $${idx}`);
      setVals.push(val);
      idx++;
    }
  }
  console.log('[Execucao][UPDATE][dinâmico setCols]', { table: latest.table, setCols });
  if (setCols.length === 0) return null;
  const sql = `UPDATE ${latest.table} SET ${setCols.join(', ')} WHERE id = $${idx} RETURNING *`;
  const res = await pool.query(sql, [...setVals, latest.row.id]);
  return res.rows[0] || null;
}
app.post('/api/planejamento-atividades', async (req, res) => {
  try {
    console.log('[DEBUG BACKEND] Payload recebido:', req.body);
    const data = req.body;
    // Ajusta created_at para horário de Brasília usando Luxon
    const brasiliaDate = DateTime.now().setZone('America/Sao_Paulo');
    data.created_at = brasiliaDate.toISO();
    // Converter tempo_executado de segundos para horas
    if (data.tempo_executado && typeof data.tempo_executado === 'number') {
      data.tempo_executado = data.tempo_executado / 3600;
    }
    const result = await pool.query(
      `INSERT INTO public."PlanejamentoAtividade" (
        descritivo, atividade_id, empreendimento_id, etapa, executores, executor_principal, predecessora_id,
        tempo_planejado, inicio_planejado, termino_planejado, sobra_planejada,
        inicio_ajustado, termino_ajustado, sobra_ajustada,
        inicio_real, termino_real, sobra_real, tempo_executado, status, horas_por_dia, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        data.descritivo || data.titulo || 'Atividade sem título',
        data.atividade_id ? parseInt(data.atividade_id) : null,
        parseInt(data.empreendimento_id),
        data.etapa || 'Geral',
        JSON.stringify(data.executores || []),
        data.executor_principal || '',
        data.predecessora_id ? parseInt(data.predecessora_id) : null,
        parseFloat(data.tempo_planejado) || 8.0,
        data.inicio_planejado || data.data_inicio || null,
        data.termino_planejado || data.data_fim || null,
        parseFloat(data.sobra_planejada) || 0.0,
        data.inicio_ajustado || null,
        data.termino_ajustado || null,
        parseFloat(data.sobra_ajustada) || 0.0,
        data.inicio_real || null,
        data.termino_real || null,
        parseFloat(data.sobra_real) || 0.0,
        data.tempo_executado || 0.0,
        data.status || 'nao_iniciado',
        data.horas_por_dia || null,
        data.created_at
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DEBUG BACKEND] Erro ao criar planejamento:', error, error.stack);
    if (req && req.body) {
      console.error('[DEBUG BACKEND] Payload problemático:', req.body);
    }
    // Retorna mensagem detalhada do erro do banco para o frontend
    let details = '';
    if (error && typeof error === 'object') {
      details = error.message || JSON.stringify(error);
    } else {
      details = String(error);
    }
    res.status(500).json({ error: 'Erro ao criar planejamento', details, stack: error.stack });
  }
});

// Rota DELETE para PlanejamentoAtividade
app.delete('/api/planejamento-atividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM public."PlanejamentoAtividade" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }
    res.json({ message: 'Planejamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar planejamento:', error);
    res.status(500).json({ error: 'Erro ao deletar planejamento' });
  }
});

// ==========================
// Usuário e Disciplina APIs
// ==========================

// GET atual do usuário autenticado ou fallback
app.get('/api/Usuario/me', async (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return res.json(req.user);
    }
    // Fallback: retorna um usuário padrão do banco, ou um mock simples
    try {
      const result = await pool.query('SELECT * FROM public."Usuario" ORDER BY id ASC LIMIT 1');
      if (result.rows && result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
    } catch (e) {
      // ignora, tenta tabela alternativa abaixo
    }
    try {
      const alt = await pool.query('SELECT * FROM usuarios ORDER BY id ASC LIMIT 1');
      if (alt.rows && alt.rows.length > 0) {
        return res.json(alt.rows[0]);
      }
    } catch (e2) {
      // ignora
    }
    // Se nada encontrado, retorna um mock simples
    return res.json({ id: 0, nome: 'Usuário padrão', email: '' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário logado', details: error.message });
  }
});

// Rotas para PlanejamentoDocumento
// GET: lista planejamentos de documentos com filtros opcionais
app.get('/api/planejamento-documentos', async (req, res) => {
  try {
    const { empreendimento_id, executor_principal, limit } = req.query;

    let query = 'SELECT * FROM public."PlanejamentoDocumento" WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (empreendimento_id) {
      query += ` AND empreendimento_id = $${paramCount}`;
      values.push(parseInt(empreendimento_id));
      paramCount++;
    }

    if (executor_principal) {
      query += ` AND executor_principal = $${paramCount}`;
      values.push(executor_principal);
      paramCount++;
    }

    query += ' ORDER BY id DESC';

    if (limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(limit));
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar planejamentos de documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST: cria um novo planejamento de documento/folha
app.post('/api/planejamento-documentos', async (req, res) => {
  try {
    const data = req.body;
    let subdisciplinasObj = null;
    if (Array.isArray(data.subdisciplinas) && data.subdisciplinas.length > 0) {
      // Se vier array de objetos, pega o campo subdisciplina de cada um
      subdisciplinasObj = data.subdisciplinas.map(sub => sub.subdisciplina || sub);
    } else {
      try {
        const atividadesQuery = await pool.query(
          'SELECT subdisciplina FROM atividades WHERE etapa = $1 AND documento_id = $2',
          [data.etapa, data.documento_id]
        );
        const subdisciplinas = atividadesQuery.rows
          .map(row => row.subdisciplina)
          .filter(s => !!s)
          .map(s => s.split(',').map(x => x.trim()))
          .flat();
        subdisciplinasObj = subdisciplinas.length > 0 ? subdisciplinas : null;
      } catch (err) {
        console.error('Erro ao buscar subdisciplinas:', err);
      }
    }
    const insertResult = await pool.query(
      `INSERT INTO public."PlanejamentoDocumento" (
        arquivo, documento_id, empreendimento_id, etapa, executores, executor_principal, predecessora_id,
        tempo_planejado, inicio_planejado, termino_planejado, sobra_planejada,
        inicio_ajustado, termino_ajustado, sobra_ajustada,
        inicio_real, termino_real, sobra_real, tempo_executado, status, semana_ano, prioridade, horas_por_dia, subdisciplinas
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id`,
      [
        data.arquivo || '',
        parseInt(data.documento_id),
        parseInt(data.empreendimento_id),
        data.etapa || 'Planejamento',
        JSON.stringify(data.executores || []),
        data.executor_principal || '',
        data.predecessora_id ? parseInt(data.predecessora_id) : null,
        parseFloat(data.tempo_planejado) || 0,
        data.inicio_planejado || null,
        data.termino_planejado || null,
        parseFloat(data.sobra_planejada) || 0,
        data.inicio_ajustado || null,
        data.termino_ajustado || null,
        parseFloat(data.sobra_ajustada) || 0,
        data.inicio_real || null,
        data.termino_real || null,
        parseFloat(data.sobra_real) || 0,
        parseFloat(data.tempo_executado) || 0,
        data.status || 'nao_iniciado',
        data.semana_ano || null,
        data.prioridade ? parseInt(data.prioridade) : 0,
        data.horas_por_dia ? JSON.parse(data.horas_por_dia) : JSON.stringify({}),
        JSON.stringify(subdisciplinasObj)
      ]
    );
    const id = insertResult.rows[0].id;
    const selectResult = await pool.query('SELECT * FROM public."PlanejamentoDocumento" WHERE id = $1', [id]);
    const registro = selectResult.rows[0];
    if (registro && typeof registro.subdisciplinas === 'string') {
      try {
        registro.subdisciplinas = JSON.parse(registro.subdisciplinas);
      } catch { }
    }
    res.status(201).json(registro);
  } catch (error) {
    let details = '';
    if (error && typeof error === 'object') {
      details = error.message || JSON.stringify(error);
    } else {
      details = String(error);
    }
    console.error('❌ [ERRO] ao criar planejamento de documento:', error);
    console.error('❌ [ERRO] Payload problemático:', req.body);
    if (error && error.stack) {
      console.error('❌ [ERRO] Stack:', error.stack);
    }
    res.status(500).json({ error: 'Erro ao criar planejamento de documento', details, stack: error.stack });
  }
});

// DELETE: exclui um planejamento de documento por ID
app.delete('/api/planejamento-documentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM public."PlanejamentoDocumento" WHERE id = $1 RETURNING *', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PlanejamentoDocumento não encontrado' });
    }
    res.json({ message: 'PlanejamentoDocumento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir PlanejamentoDocumento:', error);
    res.status(500).json({ error: 'Erro ao excluir PlanejamentoDocumento', details: error.message });
  }
});

// Rota DELETE para PlanejamentoDocumento
app.delete('/api/planejamento-documentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM public."PlanejamentoDocumento" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PlanejamentoDocumento não encontrado' });
    }
    res.json({ message: 'PlanejamentoDocumento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar PlanejamentoDocumento:', error);
    res.status(500).json({ error: 'Erro ao deletar PlanejamentoDocumento' });
  }
});

// PUT: atualiza um PlanejamentoDocumento por ID e registra Execucao
app.put('/api/planejamento-documentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    // Normaliza ações
    if (data.acao === 'iniciar') {
      data.status = 'em_andamento';
      const now = new Date();
      const brasiliaDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      data.inicio_real = brasiliaDate.toISOString();
      data.tempo_executado = data.tempo_executado ?? 0;
    }
    if (data.acao === 'finalizar') {
      data.status = 'concluido';
      const now = new Date();
      const brasiliaDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      data.termino_real = brasiliaDate.toISOString();
      const atual = await pool.query('SELECT * FROM public."PlanejamentoDocumento" WHERE id = $1', [parseInt(id)]);
      if (atual.rows.length > 0) {
        const total_planejado = Number(atual.rows[0].tempo_planejado || 0);
        const tempo_executado_horas = Number(data.tempo_executado ?? atual.rows[0].tempo_executado ?? 0);
        data.tempo_executado = tempo_executado_horas;
        data.sobra_real = total_planejado - tempo_executado_horas;
      }
    }

    // Fallback de conclusão sem ação
    if (!data.acao && (data.status === 'concluido' || data.status === 'finalizado')) {
      try {
        const atual = await pool.query('SELECT * FROM public."PlanejamentoDocumento" WHERE id = $1', [parseInt(id)]);
        if (atual.rows.length > 0) {
          const row = atual.rows[0];
          const inicio = row.inicio_real ? new Date(row.inicio_real) : null;
          const termino = row.termino_real ? new Date(row.termino_real) : new Date();
          if (inicio) {
            const diffHoras = (termino - inicio) / 3600000;
            const horas = Math.max(0, diffHoras);
            const total_planejado = Number(row.tempo_planejado || 0);
            data.tempo_executado = Number(horas.toFixed(4));
            data.sobra_real = total_planejado - data.tempo_executado;
            data.termino_real = termino.toISOString();
            data.status = 'concluido';
          }
        }
      } catch (e) {
        console.warn('[BACKEND][FALLBACK Documento] Erro ao calcular tempo_executado por datas:', e.message);
      }
    }

    // Update
    const allowedFields = [
      'arquivo', 'documento_id', 'empreendimento_id', 'etapa', 'executores', 'executor_principal', 'predecessora_id',
      'tempo_planejado', 'inicio_planejado', 'termino_planejado', 'sobra_planejada',
      'inicio_ajustado', 'termino_ajustado', 'sobra_ajustada',
      'inicio_real', 'termino_real', 'sobra_real', 'tempo_executado', 'status', 'semana_ano', 'prioridade', 'horas_por_dia', 'subdisciplinas'
    ];
    const setParts = [];
    const values = [];
    let idx = 1;
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        setParts.push(`"${field}" = $${idx}`);
        if (field === 'executores' || field === 'subdisciplinas') {
          values.push(JSON.stringify(data[field]));
        } else if (field === 'documento_id' || field === 'empreendimento_id' || field === 'predecessora_id' || field === 'prioridade') {
          values.push(data[field] !== null ? parseInt(data[field]) : null);
        } else if (field === 'tempo_planejado' || field === 'sobra_planejada' || field === 'sobra_ajustada' || field === 'sobra_real' || field === 'tempo_executado') {
          values.push(data[field] !== null ? parseFloat(data[field]) : null);
        } else {
          values.push(data[field]);
        }
        idx++;
      }
    }
    if (setParts.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }
    const sql = `UPDATE public."PlanejamentoDocumento" SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
    values.push(parseInt(id));
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PlanejamentoDocumento não encontrado' });
    }
    const updated = result.rows[0];

    // Registro de Execucao
    try {
      const usuario = (updated.executor_principal && String(updated.executor_principal).trim())
        || (Array.isArray(updated.executores) && updated.executores.length > 0 ? updated.executores[0] : '')
        || (req.user && req.user.email) || '';
      const usuario_ajudado = data.usuario_ajudado || '';
      if (data.acao === 'iniciar') {
        const inicio = updated.inicio_real || new Date().toISOString();
        const payload = {
          empreendimento_id: parseInt(updated.empreendimento_id),
          usuario,
          usuario_ajudado,
          observacao: '',
          status: 'em_andamento',
          inicio,
          termino: null,
          tempo_total: 0,
          atividade_nome: updated.arquivo || `Documento ${updated.documento_id}`,
          planejamento_id: parseInt(id)
        };
        const updatedExec = await updateExecucaoByPlanejamentoLatest(pool, id, {
          status: 'em_andamento',
          inicio,
          termino: null,
          tempo_total: 0,
          observacao: '',
          usuario,
          executor_principal: usuario,
          usuario_ajudado,
          atividade_nome: payload.atividade_nome,
          empreendimento_id: payload.empreendimento_id
        });
        if (updatedExec) {
          console.log('[Execucao][UPSERT][UPDATE OK] documento iniciar', { execucao_id: updatedExec.id });
        } else {
          console.log('[Execucao][INSERT]', payload);
          await insertExecucaoRobust(pool, payload);
          console.log('[Execucao][INSERT][OK] documento iniciar');
        }
      }
      if (data.acao === 'finalizar' || data.status === 'concluido' || data.status === 'finalizado') {
        const tempoHoras = Number(updated.tempo_executado || 0);
        const tempoHorasStr = Math.max(0, tempoHoras).toFixed(4);
        const updates = {
          status: 'concluido',
          termino: updated.termino_real || new Date().toISOString(),
          tempo_total: tempoHorasStr,
          usuario,
          executor_principal: usuario,
          usuario_ajudado,
          observacao: (data.observacao ?? updated.observacao ?? '')
        };
        const updatedExec = await updateExecucaoByPlanejamentoLatest(pool, id, updates);
        if (updatedExec) {
          console.log('[Execucao][UPDATE BY PLANEJAMENTO][OK] documento finalizar', { execucao_id: updatedExec.id });
        } else {
          console.warn('[Execucao][UPDATE BY PLANEJAMENTO][MISS] nenhuma linha encontrada; evitando INSERT para não duplicar');
        }
      }
    } catch (logErr) {
      console.warn('[Execucao] Falha ao registrar execução de PlanejamentoDocumento:', logErr.message);
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar PlanejamentoDocumento:', error);
    res.status(500).json({ error: 'Erro ao atualizar PlanejamentoDocumento', details: error.message });
  }
});

// Adicionando logs para verificar inicialização do servidor e execução da rota
console.log('🔄 Inicializando servidor...');

// Rota para buscar um empreendimento específico por ID
app.get('/api/Empreendimento/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`✅ GET /api/Empreendimento/${id} - Buscando empreendimento específico`);
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM public."Empreendimento" WHERE id = $1;', [id]);
    client.release();
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar empreendimento específico:', error);
    res.status(500).json({ error: 'Erro ao buscar empreendimento', details: error.message });
  }
});

app.get('/api/Empreendimento', async (req, res) => {
  console.log('✅ Rota /api/Empreendimento chamada');

  try {
    const client = await pool.connect();
    console.log('✅ Conexão com o banco estabelecida');

    const result = await client.query('SELECT * FROM public."Empreendimento" ORDER BY nome;');
    console.log(`📦 Dados retornados: ${result.rows.length} empreendimentos encontrados`);

    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar empreendimentos:', error);
    res.status(500).json({
      error: 'Erro ao buscar empreendimentos',
      details: error.message
    });
  }
});

// Rota para buscar documentos de um empreendimento
app.get('/api/documentos-empreendimento/:empreendimento_id', async (req, res) => {
  const empreendimento_id = parseInt(req.params.empreendimento_id);
  console.log(`✅ GET /api/documentos-empreendimento/${empreendimento_id} - Buscando documentos`);

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM public."Documento" WHERE empreendimento_id = $1 ORDER BY inicio_planejado DESC NULLS LAST;',
      [empreendimento_id]
    );

    console.log(`📦 Encontrados ${result.rows.length} documentos para empreendimento ${empreendimento_id}`);

    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    res.status(500).json({
      error: 'Erro ao buscar documentos',
      details: error.message
    });
  }
});

// Rota para buscar documentos por empreendimento_id via query string
app.get('/api/documentos', async (req, res) => {
  const empreendimento_id = parseInt(req.query.empreendimento_id);
  console.log(`✅ GET /api/documentos?empreendimento_id=${empreendimento_id} - Buscando documentos`);

  try {
    const client = await pool.connect();
    let result;
    if (empreendimento_id) {
      result = await client.query(
        'SELECT * FROM public."Documento" WHERE empreendimento_id = $1 ORDER BY inicio_planejado DESC NULLS LAST;',
        [empreendimento_id]
      );
    } else {
      result = await client.query(
        'SELECT * FROM public."Documento" ORDER BY inicio_planejado DESC NULLS LAST;'
      );
    }
    console.log(`📦 Encontrados ${result.rows.length} documentos`);
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    res.status(500).json({
      error: 'Erro ao buscar documentos',
      details: error.message
    });
  }
});

// Rota para atualizar documento por ID (aceita campos nulos)
app.put('/api/documentos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`✅ PUT /api/documentos/${id} - Atualizando documento`);
  console.log('📦 Dados recebidos:', req.body);

  try {
    const {
      numero, arquivo, area, disciplina, subdisciplina, escala, fator_dificuldade, tempo_total,
      tempo_estudo_preliminar, tempo_ante_projeto, tempo_projeto_basico, tempo_projeto_executivo,
      tempo_liberado_obra, tempo_concepcao, tempo_planejamento, tempo_execucao_total,
      predecessora_id, inicio_planejado, termino_planejado, multiplos_executores, executor_principal
    } = req.body;

    // Trata multiplos_executores para string
    const multiplosExecutoresFinal = (typeof multiplos_executores === 'boolean') ? String(multiplos_executores) : (multiplos_executores ?? 'false');

    // Trata subdisciplinas (array) para subdisciplina (string)
    let subdisciplinaFinal = subdisciplina;
    if (Array.isArray(req.body.subdisciplinas)) {
      subdisciplinaFinal = req.body.subdisciplinas.join(', ');
    }
    if (subdisciplinaFinal === null || subdisciplinaFinal === undefined) {
      subdisciplinaFinal = '';
    }

    // Garante que executor_principal nunca seja null ou undefined
    const executorPrincipalFinal = (req.body.executor_principal === null || req.body.executor_principal === undefined) ? '' : req.body.executor_principal;

    const client = await pool.connect();
    const result = await client.query(
      `UPDATE public."Documento" SET
        numero = $1, arquivo = $2, area = $3, disciplina = $4, subdisciplina = $5, escala = $6, fator_dificuldade = $7,
        tempo_total = $8, tempo_estudo_preliminar = $9, tempo_ante_projeto = $10, tempo_projeto_basico = $11,
        tempo_projeto_executivo = $12, tempo_liberado_obra = $13, tempo_concepcao = $14, tempo_planejamento = $15,
        tempo_execucao_total = $16, predecessora_id = $17, inicio_planejado = $18, termino_planejado = $19,
        multiplos_executores = $20, executor_principal = $21
       WHERE id = $22 RETURNING *;`,
      [
        numero ?? '',
        arquivo ?? '',
        area ?? '',
        disciplina ?? '',
        subdisciplinaFinal,
        escala ?? '',
        fator_dificuldade ?? 1,
        tempo_total ?? 0,
        tempo_estudo_preliminar ?? 0,
        tempo_ante_projeto ?? 0,
        tempo_projeto_basico ?? 0,
        tempo_projeto_executivo ?? 0,
        tempo_liberado_obra ?? 0,
        tempo_concepcao ?? 0,
        tempo_planejamento ?? 0,
        tempo_execucao_total ?? 0,
        predecessora_id ?? null,
        inicio_planejado ?? null,
        termino_planejado ?? null,
        multiplosExecutoresFinal,
        executorPrincipalFinal,
        id
      ]
    );

    console.log('Parâmetros enviados para o update:', [
      numero ?? '',
      arquivo ?? '',
      area ?? '',
      disciplina ?? '',
      subdisciplinaFinal,
      escala ?? '',
      fator_dificuldade ?? 1,
      tempo_total ?? 0,
      tempo_estudo_preliminar ?? 0,
      tempo_ante_projeto ?? 0,
      tempo_projeto_basico ?? 0,
      tempo_projeto_executivo ?? 0,
      tempo_liberado_obra ?? 0,
      tempo_concepcao ?? 0,
      tempo_planejamento ?? 0,
      tempo_execucao_total ?? 0,
      predecessora_id ?? null,
      inicio_planejado ?? null,
      termino_planejado ?? null,
      multiplosExecutoresFinal,
      executorPrincipalFinal,
      id
    ]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar documento:', error);
    res.status(500).json({ error: 'Erro ao atualizar documento', details: error.message });
  }
});

// Rota para deletar documento por ID
app.delete('/api/documentos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`🗑️ DELETE /api/documentos/${id} - Solicitando exclusão do documento`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Loga todos os IDs de documentos existentes antes de deletar
    const allDocs = await client.query('SELECT id FROM public."Documento" ORDER BY id');
    console.log('IDs de documentos existentes no momento:', allDocs.rows.map(r => r.id));
    // Remove vínculos em DocumentoAtividade antes de deletar o documento (considerando tipos string/int)
    const delVinculos = await client.query('DELETE FROM public."DocumentoAtividade" WHERE documento_id = $1::integer', [id]);
    console.log(`Vínculos removidos em DocumentoAtividade: ${delVinculos.rowCount}`);
    const result = await client.query('DELETE FROM public."Documento" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      console.warn(`⚠️ Documento com id ${id} não encontrado para exclusão.`);
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    await client.query('COMMIT');
    client.release();
    console.log(`✅ Documento ${id} excluído com sucesso.`);
    res.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('❌ Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro ao excluir documento', details: error.message });
  }
});
// Log ao iniciar o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  console.log(`📊 API disponível em http://localhost:${port}/api`);
  console.log(`🧪 Teste a conexão em http://localhost:${port}/api/test`);
});

// Tratamento graceful de encerramento
process.on('SIGINT', async () => {
  console.log('\n⏹️ Encerrando servidor...');
  await pool.end();
  process.exit(0);
});

// Fim do arquivo



// Rotas para Atividades (CRUD)

// ------------------------
// Helper: detectar chave primária e colunas de tabela
// ------------------------
const tablePrimaryKeyCache = {};
async function getPrimaryKeyColumn(tableName) {
  if (tablePrimaryKeyCache[tableName]) return tablePrimaryKeyCache[tableName];
  try {
    const result = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = $1 AND tc.table_schema = 'public'`,
      [tableName]
    );
    if (result.rows.length > 0) {
      tablePrimaryKeyCache[tableName] = result.rows[0].column_name;
      console.log(`🔎 Primary key for ${tableName} detected: ${tablePrimaryKeyCache[tableName]}`);
      return tablePrimaryKeyCache[tableName];
    }
  } catch (error) {
    console.warn('Erro ao obter chave primária:', error.message);
  }
  // Fallback padrão: 'id'
  tablePrimaryKeyCache[tableName] = 'id';
  console.warn(`🔎 No primary key detected for ${tableName}, falling back to 'id'`);
  return 'id';
}

async function hasColumn(tableName, columnName) {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = lower($1) AND lower(column_name) = lower($2)`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.warn('Erro ao verificar coluna:', error.message);
    return false;
  }
}

async function getColumnDataType(tableName, columnName) {
  try {
    const result = await pool.query(
      `SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = lower($1) AND lower(column_name) = lower($2)`,
      [tableName, columnName]
    );
    if (result.rows.length > 0) return result.rows[0].data_type;
    return null;
  } catch (error) {
    console.warn('Erro ao verificar tipo de coluna:', error.message);
    return null;
  }
}
app.get('/api/Atividades', async (req, res) => {
  try {
    const { empreendimento_id } = req.query;
    // Flag opcional: quando true, retorna somente atividades "do projeto"
    // isto é, criadas para o empreendimento e SEM vínculo em DocumentoAtividade
    const somenteProjetoFlag = String(req.query.somenteProjeto || req.query.somente_projeto || '').toLowerCase();
    const somenteProjeto = ['1', 'true', 'yes', 'y'].includes(somenteProjetoFlag);

    // Catálogo: só mostra atividades globais (empreendimento_id IS NULL ou 0) se NÃO houver filtro de empreendimento_id
    let query = 'SELECT a.* FROM public."Atividade" a WHERE ';
    const values = [];
    let paramCount = 1;
    let disciplinaFiltro = req.query.disciplina;
    // Verifica se coluna 'origem' existe; se não, cria automaticamente
    let hasOrigem = false;
    try {
      hasOrigem = await hasColumn('Atividade', 'origem');
      if (!hasOrigem) {
        try {
          await pool.query('ALTER TABLE public."Atividade" ADD COLUMN IF NOT EXISTS origem TEXT');
          await pool.query('CREATE INDEX IF NOT EXISTS idx_atividade_origem ON public."Atividade" (origem)');
          hasOrigem = true;
        } catch (e) {
          console.warn('Não foi possível criar coluna origem automaticamente:', e.message);
        }
      }
    } catch (e) {
      hasOrigem = false;
    }

    if (empreendimento_id) {
      // Filtro por empreendimento: só mostra as atividades daquele empreendimento
      query += 'a.empreendimento_id = $1';
      values.push(parseInt(empreendimento_id));
      if (somenteProjeto) {
        // Atividades do Projeto
        // Se existir coluna 'origem', exige origem='projeto'; caso contrário, recorre à heurística de id_atividade vazio
        if (hasOrigem) {
          query += ' AND a.origem = \"projeto\"';
        } else {
          query += ' AND (COALESCE(a.id_atividade, \'\') = \'\')';
        }
        // Sempre sem vínculo com documentos
        query += ' AND NOT EXISTS (SELECT 1 FROM public."DocumentoAtividade" da WHERE da.atividade_id = a.id)';
      }
      if (disciplinaFiltro) {
        query += ` AND lower(trim(a.disciplina)) = lower(trim($${values.length + 1}))`;
        values.push(disciplinaFiltro);
      }
    } else {
      // Catálogo: só atividades globais (nunca inclui atividades com empreendimento_id > 0 ou string '0')
      query += '((a.empreendimento_id IS NULL) OR (CAST(a.empreendimento_id AS TEXT) = \'0\'))';
      if (disciplinaFiltro) {
        query += ` AND lower(trim(a.disciplina)) = lower(trim($${values.length + 1}))`;
        values.push(disciplinaFiltro);
      }
    }
    // Impede qualquer atividade com empreendimento_id > 0 de aparecer no catálogo
    // Determine primary key to use for ordering
    const pk = await getPrimaryKeyColumn('Atividade');
    query += ` ORDER BY a."${pk}" DESC`;
    let result;
    try {
      result = await pool.query(query, values);
    } catch (err) {
      // Atenção: coluna inexistente no banco causa erro 42703. Nesse caso, retornamos todas as Atividades sem filtro.
      if (err && err.code === '42703') {
        console.warn(`Coluna 'empreendimento_id' não existe na tabela public."Atividade". Retornando todos os registros sem filtro.`);
        const fallback = await pool.query(`SELECT * FROM public."Atividade" ORDER BY "${pk}" DESC`);
        return res.json(fallback.rows);
      }
    }
    // Mapeia o campo de tempo/duração para 'duracao_padrao' (compatível com frontend)
    const atividades = result.rows.map(a => ({
      ...a,
      duracao_padrao: a.tempo ?? a.duracao_padrao ?? 0 // usa 'tempo' se existir, senão 'duracao_padrao', senão 0
    }));
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/Atividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pk = await getPrimaryKeyColumn('Atividade');
    const searchValue = (pk === 'id') ? parseInt(id) : id;
    const result = await pool.query(`SELECT * FROM public."Atividade" WHERE "${pk}" = $1`, [searchValue]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Atividade não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/Atividades', async (req, res) => {
  try {
    const data = req.body;
    const {
      id_atividade, etapa, disciplina, subdisciplina, atividade: descricao, predecessora, tempo, funcao, empreendimento_id, origem
    } = data;
    const client = await pool.connect();
    try {
      const fieldMap = {
        id_atividade: id_atividade || null,
        etapa: etapa || '',
        disciplina: disciplina || '',
        subdisciplina: subdisciplina || '',
        atividade: descricao || '',
        predecessora: predecessora || null,
        tempo: tempo ?? 0,
        funcao: funcao || '',
        empreendimento_id: empreendimento_id ? parseInt(empreendimento_id) : null,
        origem: origem ?? null
      };
      const columns = [];
      const placeholders = [];
      const values = [];
      let idx = 1;
      for (const col of Object.keys(fieldMap)) {
        if (await hasColumn('Atividade', col)) {
          columns.push(`"${col}"`);
          placeholders.push(`$${idx}`);
          values.push(fieldMap[col]);
          idx++;
        }
      }
      if (columns.length === 0) {
        throw new Error('Nenhuma coluna válida encontrada na tabela Atividade para inserção');
      }
      const sql = `INSERT INTO public."Atividade" (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;
      const result = await client.query(sql, values);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/Atividades/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const fieldMap = {
      etapa: body.etapa ?? '',
      disciplina: body.disciplina ?? '',
      subdisciplina: body.subdisciplina ?? '',
      atividade: body.atividade ?? body.descricao ?? '',
      predecessora: body.predecessora ?? null,
      tempo: body.tempo ?? 0,
      funcao: body.funcao ?? '',
      empreendimento_id: body.empreendimento_id ? parseInt(body.empreendimento_id) : null,
      origem: body.origem ?? null
    };
    const setParts = [];
    const values = [];
    let idx = 1;
    for (const col of Object.keys(fieldMap)) {
      if (await hasColumn('Atividade', col) && fieldMap[col] !== undefined) {
        setParts.push(`"${col}" = $${idx}`);
        values.push(fieldMap[col]);
        idx++;
      }
    }
    if (setParts.length === 0) {
      return res.status(400).json({ error: 'Nenhuma coluna válida para atualizar' });
    }
    const pk = await getPrimaryKeyColumn('Atividade');
    const searchValue = (pk === 'id') ? parseInt(id) : id;
    values.push(searchValue);
    const sql = `UPDATE public."Atividade" SET ${setParts.join(', ')} WHERE "${pk}" = $${idx} RETURNING *`;
    const result = await client.query(sql, values);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Atividade não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

app.delete('/api/Atividades/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const pk = await getPrimaryKeyColumn('Atividade');
    const searchValue = (pk === 'id') ? parseInt(id) : id;
    await client.query('BEGIN');
    const delLinks = await client.query('DELETE FROM public."DocumentoAtividade" WHERE atividade_id = $1::integer', [searchValue]);
    const result = await client.query(`DELETE FROM public."Atividade" WHERE "${pk}" = $1 RETURNING *`, [searchValue]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }
    await client.query('COMMIT');
    return res.json({ message: 'Atividade excluída com sucesso', linksRemovidos: delLinks.rowCount });
  } catch (error) {
    console.error('Erro ao deletar atividade (inner):', error);
    try { await client.query('ROLLBACK'); } catch { }
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Endpoint para inspeção de colunas da tabela Atividade (debug)
app.get('/api/Atividades/columns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = lower('Atividade') ORDER BY ordinal_position;
    `);
    res.json(result.rows.map(r => r.column_name));
  } catch (error) {
    console.error('Erro ao listar colunas de Atividade:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Debug: List Pavimento columns
const pavimentoColumnsHandler = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = lower('Pavimento') ORDER BY ordinal_position;
    `);
    res.json(result.rows.map(r => ({ column: r.column_name, type: r.data_type })));
  } catch (error) {
    console.error('Erro ao listar colunas de Pavimento:', error.message, error.stack);
    res.status(500).json({ error: 'Erro interno' });
  }
};
app.get('/api/Pavimento/columns', pavimentoColumnsHandler);
app.get('/api/pavimentos/columns', pavimentoColumnsHandler);

// Rotas para Pavimentos
const pavimentosHandler = async (req, res) => {
  try {
    const empreendimentoQuery = req.query.empreendimento_id;
    let query = 'SELECT * FROM public."Pavimento" WHERE 1=1';
    const values = [];
    let pc = 1;
    if (empreendimentoQuery !== undefined && empreendimentoQuery !== null && empreendimentoQuery !== '') {
      const columnExists = await hasColumn('Pavimento', 'empreendimento_id');
      if (columnExists) {
        const type = await getColumnDataType('Pavimento', 'empreendimento_id');
        // Allow common numeric and text types only
        const allowedNumeric = ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision'];
        const allowedText = ['character varying', 'text', 'varchar', 'char'];
        if (allowedNumeric.includes(type)) {
          const empreendimento_id = parseInt(empreendimentoQuery);
          query += ` AND empreendimento_id = $${pc}`;
          values.push(empreendimento_id);
          pc++;
        } else if (allowedText.includes(type)) {
          query += ` AND empreendimento_id = $${pc}`;
          values.push(String(empreendimentoQuery));
          pc++;
        } else {
          console.warn(`Coluna empreendimento_id detectada em Pavimento, mas tipo '${type}' não é compatível para filtro por empreedimento_id. Pulando filtro.`);
        }
      }
    }
    // determine primary key for ordering and safe search
    const pk = await getPrimaryKeyColumn('Pavimento');
    query += ` ORDER BY "${pk}" DESC`;
    let result;
    try {
      result = await pool.query(query, values);
    } catch (err) {
      if (err && err.code === '42703') {
        console.warn(`Coluna inexistente na tabela public."Pavimento". Retornando todos os registros sem filtro.`);
        const fallback = await pool.query(`SELECT * FROM public."Pavimento" ORDER BY "${pk}" DESC`);
        return res.json(fallback.rows);
      }
      throw err;
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar pavimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

app.get('/api/pavimentos', pavimentosHandler);
app.get('/api/Pavimento', pavimentosHandler);

const pavimentoGetByIdHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const pk = await getPrimaryKeyColumn('Pavimento');
    const searchValue = (pk === 'id') ? parseInt(id) : id;
    const result = await pool.query(`SELECT * FROM public."Pavimento" WHERE "${pk}" = $1`, [searchValue]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pavimento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar pavimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

app.get('/api/pavimentos/:id', pavimentoGetByIdHandler);
app.get('/api/Pavimento/:id', pavimentoGetByIdHandler);

const pavimentoPostHandler = async (req, res) => {
  try {
    const data = req.body;
    console.log('📨 POST /api/Pavimento payload:', data, 'headers:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
    });
    const client = await pool.connect();
    try {
      const fieldMap = {
        nome: data.nome || '',
        area: data.area ?? 0,
        escala: data.escala || null,
        empreendimento_id: data.empreendimento_id ? parseInt(data.empreendimento_id) : null
      };
      const cols = [];
      const placeholders = [];
      const values = [];
      let idx = 1;
      for (const col of Object.keys(fieldMap)) {
        if (await hasColumn('Pavimento', col)) {
          cols.push(`"${col}"`);
          placeholders.push(`$${idx}`);
          values.push(fieldMap[col]);
          idx++;
        }
      }
      if (cols.length === 0) throw new Error('Nenhuma coluna válida para inserir');
      const sql = `INSERT INTO public."Pavimento" (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;
      const result = await client.query(sql, values);
      console.log('✅ Pavimento criado:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar pavimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

app.post('/api/pavimentos', pavimentoPostHandler);
app.post('/api/Pavimento', pavimentoPostHandler);

const pavimentoPutHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const client = await pool.connect();
    try {
      const fieldMap = {
        nome: data.nome || '',
        area: data.area ?? 0,
        escala: data.escala || null,
        empreendimento_id: data.empreendimento_id ? parseInt(data.empreendimento_id) : null
      };
      const setParts = [];
      const values = [];
      let idx = 1;
      for (const col of Object.keys(fieldMap)) {
        if (await hasColumn('Pavimento', col)) {
          setParts.push(`"${col}" = $${idx}`);
          values.push(fieldMap[col]);
          idx++;
        }
      }
      if (setParts.length === 0) throw new Error('Nenhuma coluna válida para atualização');
      const pk = await getPrimaryKeyColumn('Pavimento');
      const searchValue = (pk === 'id') ? parseInt(id) : id;
      values.push(searchValue);
      const sql = `UPDATE public."Pavimento" SET ${setParts.join(', ')} WHERE "${pk}" = $${idx} RETURNING *`;
      const result = await client.query(sql, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pavimento não encontrado' });
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao atualizar pavimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

app.put('/api/pavimentos/:id', pavimentoPutHandler);
app.put('/api/Pavimento/:id', pavimentoPutHandler);

const pavimentoDeleteHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    try {
      const pk = await getPrimaryKeyColumn('Pavimento');
      const searchValue = (pk === 'id') ? parseInt(id) : id;
      const result = await client.query(`DELETE FROM public."Pavimento" WHERE "${pk}" = $1 RETURNING *`, [searchValue]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pavimento não encontrado' });
      res.json({ message: 'Pavimento excluído com sucesso' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao deletar pavimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

app.delete('/api/pavimentos/:id', pavimentoDeleteHandler);
app.delete('/api/Pavimento/:id', pavimentoDeleteHandler);
// alias route for /api/Pavimento/:id removed (handled by pavimentoGetByIdHandler)

// Rotas REST para Usuario

// Rota para obter usuário logado comparando email
app.get('/api/Usuario/me', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const email = req.user.email;
    const result = await pool.query('SELECT * FROM "Usuario" WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário logado', details: error.message });
  }
});

app.get('/api/Usuario', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Usuario" ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários', details: error.message });
  }
});

app.get('/api/Usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Usuario" WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário', details: error.message });
  }
});

app.post('/api/Usuario', async (req, res) => {
  try {
    const {
      nome = '',
      email = '',
      cargo = '',
      departamento = '',
      telefone = '',
      data_admissao = null,
      status = 'ativo',
      perfil = 'user',
      senha = ''
    } = req.body;
    const result = await pool.query(
      'INSERT INTO "Usuario" (nome, email, cargo, departamento, telefone, data_admissao, status, perfil, senha) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [nome, email, cargo, departamento, telefone, data_admissao, status, perfil, senha]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: error.message });
  }
});

app.put('/api/Usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, cargo, departamento, telefone, data_admissao, status, perfil, senha } = req.body;
    const result = await pool.query(
      'UPDATE "Usuario" SET nome=$1, email=$2, cargo=$3, departamento=$4, telefone=$5, data_admissao=$6, status=$7, perfil=$8, senha=$9 WHERE id=$10 RETURNING *',
      [nome, email, cargo, departamento, telefone, data_admissao, status, perfil, senha, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: error.message });
  }
});

app.delete('/api/Usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM "Usuario" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar usuário', details: error.message });
  }
});

app.get('/api/Disciplina', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Disciplina" ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar disciplinas', details: error.message });
  }
});

app.get('/api/Disciplina/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Disciplina" WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Disciplina não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar disciplina', details: error.message });
  }
});


app.post('/api/Disciplina', async (req, res) => {
  try {
    const { nome = '', cor = null } = req.body;
    const result = await pool.query(
      'INSERT INTO "Disciplina" (nome, cor) VALUES ($1, $2) RETURNING *',
      [nome, cor]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar disciplina', details: error.message });
  }
});


app.put('/api/Disciplina/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cor = null } = req.body;
    const result = await pool.query(
      'UPDATE "Disciplina" SET nome=$1, cor=$2 WHERE id=$3 RETURNING *',
      [nome, cor, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Disciplina não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar disciplina', details: error.message });
  }
});

app.delete('/api/Disciplina/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM "Disciplina" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Disciplina não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar disciplina', details: error.message });
  }
});
// ...existing code...
// (depois dos middlewares, antes das rotas de documentos)
// Rota para criar novo documento
app.post('/api/documentos', async (req, res) => {
  console.log('✅ POST /api/documentos - Criando documento');
  console.log('📦 Dados recebidos:', req.body);
  try {
    const {
      empreendimento_id,
      numero,
      arquivo,
      area,
      disciplina,
      subdisciplina,
      subdisciplinas,
      escala,
      fator_dificuldade,
      tempo_total,
      tempo_estudo_preliminar,
      tempo_ante_projeto,
      tempo_projeto_basico,
      tempo_projeto_executivo,
      tempo_liberado_obra,
      tempo_concepcao,
      tempo_planejamento,
      tempo_execucao_total,
      predecessora_id,
      inicio_planejado,
      termino_planejado,
      multiplos_executores,
      executor_principal
    } = req.body;

    // Validações obrigatórias
    if (!empreendimento_id) {
      return res.status(400).json({ error: 'Empreendimento ID é obrigatório' });
    }
    if (!numero || numero.trim() === '') {
      return res.status(400).json({ error: 'Número do documento é obrigatório' });
    }
    if (!arquivo || arquivo.trim() === '') {
      return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
    }

    const client = await pool.connect();

    // ✅ Verificar se o empreendimento existe
    const empResult = await client.query(
      'SELECT id FROM public."Empreendimento" WHERE id = $1;',
      [parseInt(empreendimento_id)]
    );

    if (empResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    // ✅ Preparar subdisciplinas
    let subdisciplinaFinal = subdisciplina;
    if (subdisciplinas && Array.isArray(subdisciplinas)) {
      subdisciplinaFinal = subdisciplinas.join(', ');
    }

    // ✅ Preparar datas - usar data atual se não fornecida (para campos NOT NULL)
    const dataAtual = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
    const inicioFinal = inicio_planejado || dataAtual;
    const terminoFinal = termino_planejado || dataAtual;

    console.log('🔄 Preparando dados para inserção...');
    console.log('📅 Data início:', inicioFinal);
    console.log('📅 Data término:', terminoFinal);

    // ✅ INSERT com tipos corretos
    // 1. Criar o documento normalmente
    const result = await client.query(
      `INSERT INTO public."Documento" (
        empreendimento_id, numero, arquivo, area, disciplina, subdisciplina, 
        escala, fator_dificuldade, tempo_total, tempo_estudo_preliminar, 
        tempo_ante_projeto, tempo_projeto_basico, tempo_projeto_executivo, 
        tempo_liberado_obra, tempo_concepcao, tempo_planejamento, 
        tempo_execucao_total, predecessora_id, inicio_planejado, 
        termino_planejado, multiplos_executores, executor_principal
       ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, $19, 
        $20, $21, $22
       ) RETURNING *;`,
      [
        parseInt(empreendimento_id),                      // $1 - integer
        String(numero?.trim() || ''),                     // $2 - char
        String(arquivo?.trim() || ''),                    // $3 - char
        String(area?.trim() || ''),                       // $4 - varchar
        String(disciplina?.trim() || ''),                 // $5 - char
        String(subdisciplinaFinal?.trim() || ''),         // $6 - char
        String(escala?.trim() || ''),                     // $7 - char
        parseFloat(fator_dificuldade) || 1,               // $8 - numeric
        parseFloat(tempo_total) || 0,                     // $9 - numeric
        parseFloat(tempo_estudo_preliminar) || 0,         // $10 - numeric
        parseFloat(tempo_ante_projeto) || 0,              // $11 - numeric
        parseFloat(tempo_projeto_basico) || 0,            // $12 - numeric
        parseFloat(tempo_projeto_executivo) || 0,         // $13 - numeric
        parseFloat(tempo_liberado_obra) || 0,             // $14 - numeric
        parseFloat(tempo_concepcao) || 0,                 // $15 - numeric
        parseFloat(tempo_planejamento) || 0,              // $16 - numeric
        parseFloat(tempo_execucao_total) || 0,            // $17 - numeric
        predecessora_id ? parseInt(predecessora_id) : null, // $18 - integer
        inicioFinal,                                      // $19 - date (NOT NULL)
        terminoFinal,                                     // $20 - date (NOT NULL)
        String(multiplos_executores || 'false'),          // $21 - char
        String(executor_principal?.trim() || '')          // $22 - char
      ]
    );

    const novoDocumento = result.rows[0];
    console.log(`✅ Documento criado no PostgreSQL:`, novoDocumento);

    // 2. Associar atividades existentes à folha/documento via DocumentoAtividade
    let atividadesIds = [];
    let subdisciplinasFiltro = [];
    if (subdisciplinas && Array.isArray(subdisciplinas) && subdisciplinas.length > 0) {
      subdisciplinasFiltro = subdisciplinas;
    } else if (subdisciplina && typeof subdisciplina === 'string' && subdisciplina.trim() !== '') {
      subdisciplinasFiltro = [subdisciplina.trim()];
    }
    if (disciplina && subdisciplinasFiltro.length > 0) {
      console.log('🔍 Debug vínculo: disciplina recebida:', disciplina);
      console.log('🔍 Debug vínculo: subdisciplinasFiltro:', subdisciplinasFiltro);
      // Log detalhado dos valores, length e códigos ASCII de cada subdisciplina
      console.log('🔍 subdisciplinasFiltro detalhado:', subdisciplinasFiltro.map(s => ({
        valor: s,
        length: s.length,
        ascii: s.split('').map(c => c.charCodeAt(0))
      })));
      // Buscar atividades modelo para disciplina e subdisciplinas (ignorando maiúsculas/minúsculas e espaços), sem filtrar por empreendimento_id
      const atividadesResult = await client.query(
        `SELECT * FROM public."Atividade"
         WHERE (empreendimento_id IS NULL OR empreendimento_id = 0)
           AND lower(trim(disciplina)) = lower(trim($1))
           AND (
             EXISTS (
               SELECT 1 FROM unnest($2::text[]) AS filtro
               WHERE lower(trim(subdisciplina)) = lower(trim(filtro))
             )
             OR EXISTS (
               SELECT 1 FROM unnest(string_to_array(subdisciplina, ',')) AS s
               JOIN unnest($2::text[]) AS filtro ON lower(trim(s)) = lower(trim(filtro))
             )
           )`,
        [disciplina, subdisciplinasFiltro]
      );
      console.log('🔎 Atividades encontradas para vínculo:', atividadesResult.rows);
      const atividadesParaVincular = atividadesResult.rows;
      for (const atv of atividadesParaVincular) {
        // Padroniza a etapa: primeira letra maiúscula, restante minúsculo, sem espaços extras
        let etapaPadronizada = (atv.etapa || '').normalize('NFD').replace(/[^\w\s]/gi, '').trim().toLowerCase();
        if (etapaPadronizada.replace(/\s+/g, '') === 'planejamento') {
          etapaPadronizada = 'Planejamento';
        } else if (etapaPadronizada.length > 0) {
          etapaPadronizada = etapaPadronizada.charAt(0).toUpperCase() + etapaPadronizada.slice(1);
        } else {
          etapaPadronizada = '';
        }
        const insertResult = await client.query(
          `INSERT INTO public."Atividade" (
            etapa, disciplina, subdisciplina, atividade, predecessora, funcao, empreendimento_id, tempo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            etapaPadronizada,
            atv.disciplina ?? disciplina,
            atv.subdisciplina ?? '',
            atv.atividade ?? 'Atividade vinculada',
            atv.predecessora ?? null,
            atv.funcao ?? '',
            parseInt(empreendimento_id),
            atv.tempo ?? 0
          ]
        );
        const novaAtividadeId = insertResult.rows[0].id;
        await client.query(
          `INSERT INTO public."DocumentoAtividade" (documento_id, atividade_id) VALUES ($1, $2)`,
          [novoDocumento.id, novaAtividadeId]
        );
        atividadesIds.push(novaAtividadeId);
      }
      novoDocumento.atividades_ids = atividadesIds;
    }

    client.release();
    res.status(201).json(novoDocumento);
  } catch (error) {
    console.error('❌ Erro ao criar documento:', error);
    res.status(500).json({
      error: 'Erro ao criar documento',
      details: error.message
    });
  }
});

// Rota para buscar um documento específico por ID
app.get('/api/documentos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM public."Documento" WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar documento por ID:', error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});


// Rota para buscar atividades vinculadas a um documento (folha) via DocumentoAtividade
app.get('/api/documentos/:id/atividades', async (req, res) => {
  const documentoId = parseInt(req.params.id);
  console.log(`✅ GET /api/documentos/${documentoId}/atividades - Buscando atividades da folha (JOIN DocumentoAtividade)`);
  try {
    const client = await pool.connect();
    // Busca atividades vinculadas ao documento via join
    const result = await client.query(
      `SELECT a.*
         FROM public."DocumentoAtividade" da
         JOIN public."Atividade" a ON da.atividade_id = a.id
        WHERE da.documento_id = $1
        ORDER BY a.id DESC;`,
      [documentoId]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar atividades da folha (JOIN):', error);
    res.status(500).json({ error: 'Erro ao buscar atividades da folha', details: error.message });
  }
});

// Rota para criar uma execução
app.post('/api/Execucao', async (req, res) => {
  try {
    console.log('Payload recebido na criação de Execucao:', req.body);
    // Forçar tipo inteiro para planejamento_id
    let planejamentoIdInt = null;
    if (req.body.planejamento_id !== undefined && req.body.planejamento_id !== null && req.body.planejamento_id !== '') {
      planejamentoIdInt = Number(req.body.planejamento_id);
      if (isNaN(planejamentoIdInt)) planejamentoIdInt = null;
    }
    // Garantir que atividade_nome seja preenchido
    let atividadeNome = null;
    if (req.body.atividade_nome && typeof req.body.atividade_nome === 'string') {
      atividadeNome = req.body.atividade_nome;
    } else if (req.body.atividade && typeof req.body.atividade === 'string') {
      atividadeNome = req.body.atividade;
    } else if (req.body.descritivo && typeof req.body.descritivo === 'string') {
      atividadeNome = req.body.descritivo;
    } else if (req.body.arquivo && typeof req.body.arquivo === 'string') {
      atividadeNome = req.body.arquivo;
    }
    const {
      empreendimento_id,
      usuario,
      usuario_ajudado,
      observacao,
      status,
      inicio,
      termino,
      tempo_total
    } = req.body;

    console.log('Valores finais para insert:', {
      empreendimento_id,
      usuario,
      usuario_ajudado,
      observacao,
      status,
      inicio,
      termino,
      tempo_total,
      atividadeNome,
      planejamentoIdInt
    });

    // Normalizar status para valores esperados na base
    let statusNorm = (status || '').toString().toLowerCase();
    if (statusNorm.includes('andamento')) statusNorm = 'em_andamento';
    else if (statusNorm.includes('final')) statusNorm = 'finalizado';
    else if (statusNorm.includes('paus') || statusNorm.includes('paral')) statusNorm = 'paralisado';
    else if (!statusNorm) statusNorm = 'em_andamento';

    // Preencher defaults amigáveis (evita 400 por campos ausentes)
    const usuarioFinal = usuario || (req.user && req.user.email) || '';
    const inicioFinal = inicio || new Date().toISOString();

    // Normaliza tempo_total para horas com 4 casas decimais (texto)
    const tempoTotalFinal = (() => {
      if (tempo_total === null || tempo_total === undefined) return null;
      const n = Number(tempo_total);
      if (Number.isNaN(n)) return null;
      const horas = Math.max(0, n / 3600);
      return horas.toFixed(4);
    })();

    const result = await pool.query(
      `INSERT INTO public."Execucao" (
        empreendimento_id, usuario, usuario_ajudado, observacao, status, inicio, termino, tempo_total, atividade_nome, planejamento_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        empreendimento_id ?? null,
        usuarioFinal,
        usuario_ajudado ?? null,
        observacao ?? null,
        statusNorm,
        inicioFinal,
        termino ?? null,
        tempoTotalFinal ?? null,
        atividadeNome,
        planejamentoIdInt
      ]
    );
    console.log('Execucao inserida:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar execução:', error);
    res.status(500).json({ error: 'Erro ao criar execução', details: error.message });
  }
});

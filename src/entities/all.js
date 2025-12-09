// ✅ LOGGER SIMPLES (sem arquivo externo)
const logger = {
  mockData: (message) => {
    console.log(`🔄 [MOCK] ${message}`);
  }
};

// Configuração da API
const API_BASE_URL = 'http://localhost:3001/api';

// Função auxiliar para requisições
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // ALERT para toda requisição
  // alert removido para evitar pop-up de requisição
  console.log(`🌐 ${config.method || 'GET'} ${url}`);

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    // Tenta extrair mensagem detalhada do backend
    const msg = (data && (data.details || data.error || data.message)) || response.statusText || `HTTP error! status: ${response.status}`;
    throw new Error(msg);
  }

  return data;
};

// ✅ DADOS MOCK CENTRALIZADOS COMPLETOS
const mockData = {
  empreendimentos: [
    {
      id: 1,
      nome: "Residencial Jardins",
      endereco: "Rua das Flores, 123",
      cidade: "São Paulo",
      uf: "SP",
      status: "ativo",
      cliente: "Construtora ABC",
      data_inicio: "2024-01-15",
      data_prevista: "2024-12-15",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      nome: "Comercial Center Plaza",
      endereco: "Av. Principal, 456",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      status: "ativo",
      cliente: "Incorporadora XYZ",
      data_inicio: "2024-02-01",
      data_prevista: "2025-01-31",
      created_at: "2024-02-01T10:00:00Z",
      updated_at: "2024-02-01T10:00:00Z"
    }
  ],

  documentos: [
    {
      id: 1,
      numero: "ARQ-001",
      arquivo: "Planta Baixa Térreo",
      area: "120.5",
      disciplina: "Arquitetura",
      subdisciplina: "Plantas, Cortes",
      escala: "1:100",
      fator_dificuldade: 1.0,
      empreendimento_id: 1,
      tempo_total: 52.0,
      tempo_estudo_preliminar: 12.0,
      tempo_ante_projeto: 16.0,
      tempo_projeto_executivo: 24.0,
      tempo_liberado_obra: 4.0,
      tempo_concepcao: 8.0,
      tempo_planejamento: 4.0,
      tempo_execucao_total: 0,
      predecessora_id: null,
      inicio_planejado: null,
      termino_planejado: null,
      multiplos_executores: false,
      executor_principal: null,
      status: "pendente",
      created_at: "2024-01-20T10:00:00Z",
      updated_at: "2024-01-20T10:00:00Z"
    }
  ],

  usuarios: [
    {
      id: 1,
      nome: "Admin Sistema",
      email: "admin@empresa.com",
      cargo: "Administrador",
      nivel: "Admin",
      ativo: true,
      horas_semana: 40,
      tipo: "admin",
      created_at: "2024-01-10T10:00:00Z"
    },
    {
      id: 2,
      nome: "João Silva",
      email: "joao@empresa.com",
      cargo: "Arquiteto",
      nivel: "Senior",
      ativo: true,
      horas_semana: 40,
      tipo: "user",
      created_at: "2024-01-10T10:00:00Z"
    },
    {
      id: 3,
      nome: "Maria Santos",
      email: "maria@empresa.com",
      cargo: "Engenheira",
      nivel: "Pleno",
      ativo: true,
      horas_semana: 40,
      tipo: "user",
      created_at: "2024-01-10T10:00:00Z"
    }
  ],

  disciplinas: [
    {
      id: 1,
      nome: "Arquitetura",
      codigo: "ARQ",
      cor: "#3B82F6",
      descricao: "Projetos arquitetônicos",
      ativo: true,
      created_at: "2024-01-10T10:00:00Z"
    },
    {
      id: 2,
      nome: "Estrutural",
      codigo: "EST",
      cor: "#EF4444",
      descricao: "Projetos estruturais",
      ativo: true,
      created_at: "2024-01-10T10:00:00Z"
    },
    {
      id: 3,
      nome: "Instalações Elétricas",
      codigo: "ELE",
      cor: "#F59E0B",
      descricao: "Projetos elétricos",
      ativo: true,
      created_at: "2024-01-10T10:00:00Z"
    }
  ],

  atividades: [
    {
      id: 1,
      nome: "Estudo Preliminar",
      descricao: "Desenvolvimento do estudo preliminar",
      tipo: "projeto",
      duracao_padrao: 40,
      ativo: true,
      created_at: "2024-01-10T10:00:00Z"
    },
    {
      id: 2,
      nome: "Ante-Projeto",
      descricao: "Desenvolvimento do ante-projeto",
      tipo: "projeto",
      duracao_padrao: 60,
      ativo: true,
      created_at: "2024-01-10T10:00:00Z"
    }
  ],

  planejamentoAtividades: [
    {
      id: 1,
      empreendimento_id: 1,
      atividade_id: 1,
      usuario_id: 1,
      data_inicio: "2024-02-01",
      data_fim: "2024-02-15",
      horas_planejadas: 80,
      horas_executadas: 0,
      status: "planejado",
      created_at: "2024-01-20T10:00:00Z"
    }
  ],

  planejamentoDocumentos: [
    {
      id: 1,
      documento_id: 1,
      planejamento_atividade_id: 1,
      ordem: 1,
      horas_estimadas: 40,
      created_at: "2024-01-20T10:00:00Z"
    }
  ],

  execucoes: [
    {
      id: 1,
      planejamento_atividade_id: 1,
      usuario_id: 1,
      data: "2024-02-01",
      horas_trabalhadas: 8,
      descricao: "Início do estudo preliminar",
      status: "concluida",
      created_at: "2024-02-01T10:00:00Z"
    }
  ],

  sobraUsuarios: [
    {
      id: 1,
      usuario_id: 1,
      data: "2024-02-01",
      horas_disponiveis: 8,
      horas_planejadas: 6,
      sobra: 2,
      created_at: "2024-02-01T10:00:00Z"
    }
  ],

  // ✅ DADOS PARA DASHBOARD
  dashboardData: {
    empreendimentos_ativos: 2,
    documentos_total: 1,
    usuarios_ativos: 3,
    atividades_pendentes: 1,
    horas_planejadas: 80,
    horas_executadas: 8
  }
};

// ✅ CLASSE GENÉRICA PARA ENTIDADES
class EntityBase {
  constructor(name, mockItems = []) {
    this.name = name;
    this.mockData = mockItems;
  }

  async list(params = {}) {
    let endpoint = `/${this.name}`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    return await apiRequest(endpoint, { method: 'GET' });
  }

  async get(id) {
    return await apiRequest(`/${this.name}/${id}`);
  }

  async create(data) {
    // Só adiciona 'cor' se a entidade for Disciplina, Atividade ou outra que use esse campo
    const payload = { ...data };
    if ((this.name === 'Disciplina' || this.name === 'Atividades' || this.name === 'Atividade') && !('cor' in payload)) {
      payload.cor = null;
    }
    // Forçar tipo correto para Execucao
    if (this.name === 'Execucao') {
      if (payload.planejamento_id) payload.planejamento_id = parseInt(payload.planejamento_id);
      if (payload.atividade_nome === undefined && payload.atividade) payload.atividade_nome = payload.atividade;
      console.log('Payload enviado para backend Execucao:', payload);
    }
    return await apiRequest(`/${this.name}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async update(id, data) {
    // Garante que o campo 'cor' sempre seja enviado (mesmo se undefined)
    const payload = { ...data };
    if (!('cor' in payload)) payload.cor = null;
    try {
      console.log('[PlanejamentoAtividade.update] Chamando PUT', id, payload);
      return await apiRequest(`/planejamento-atividades/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[PlanejamentoAtividade.update] Erro no PUT:', error);
      throw error;
    }
  }

  async delete(id) {
    return await apiRequest(`/${this.name}/${id}`, { method: 'DELETE' });
  }

  async filter(params = {}) {
    return this.list(params);
  }

  // ✅ MÉTODOS ESPECIAIS PARA DASHBOARD
  async summary() {
    return await apiRequest(`/${this.name}/summary`);
  }

  async count(params = {}) {
    const items = await this.list(params);
    return items.length;
  }
}

// ✅ ENTIDADE USUÁRIO COM MÉTODOS ESPECIAIS
export const Usuario = {
  // Métodos base
  async list(params = {}) {
    let endpoint = '/Usuario';
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    return await apiRequest(endpoint, { method: 'GET' });
  },

  async get(id) {
    try {
      return await apiRequest(`/Usuario/${id}`);
    } catch (error) {
      logger.mockData('Usando dados mock para usuario específico');
      return mockData.usuarios.find(item => item.id === parseInt(id));
    }
  },

  async create(data) {
    try {
      return await apiRequest('/Usuario', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Erro ao criar usuário via API:', error);
      logger.mockData('Simulando criação de usuario');
      const newItem = {
        id: Math.max(...mockData.usuarios.map(item => item.id), 0) + 1,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.usuarios.push(newItem);
      return newItem;
    }
  },

  async update(id, data) {
    try {
      return await apiRequest(`/Usuario/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      logger.mockData('Simulando atualização de usuario');
      const index = mockData.usuarios.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        mockData.usuarios[index] = {
          ...mockData.usuarios[index],
          ...data,
          updated_at: new Date().toISOString()
        };
        return mockData.usuarios[index];
      }
      throw new Error('Usuario não encontrado');
    }
  },

  async delete(id) {
    try {
      const res = await apiRequest(`/Usuario/${id}`, { method: 'DELETE' });
      // Se a resposta for um objeto com erro, cai no catch
      if (res && res.error) throw new Error(res.error);
      return res;
    } catch (error) {
      logger.mockData('Simulando exclusão de usuario');
      const index = mockData.usuarios.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        return mockData.usuarios.splice(index, 1)[0];
      }
      // Não lança erro, apenas retorna null para não quebrar o fluxo
      return null;
    }
  },

  async filter(params = {}) {
    return this.list(params);
  },

  // ✅ MÉTODOS ESPECIAIS QUE ESTAVAM FALTANDO
  async me() {
    try {
      return await apiRequest('/Usuario/me');
    } catch (error) {
      logger.mockData('Retornando usuario mock atual');
      // Retornar o primeiro usuário admin como usuário atual
      return mockData.usuarios.find(u => u.tipo === 'admin') || mockData.usuarios[0];
    }
  },

  async summary() {
    try {
      return await apiRequest('/usuarios/summary');
    } catch (error) {
      logger.mockData('Usando dados mock para resumo de usuarios');
      const data = mockData.usuarios;
      return {
        total: data.length,
        ativo: data.filter(item => item.ativo !== false).length,
        admin: data.filter(item => item.tipo === 'admin').length,
        user: data.filter(item => item.tipo === 'user').length
      };
    }
  }
};

// ✅ ENTIDADE EMPREENDIMENTO (corrigida para usar a rota do servidor PostgreSQL)
export const Empreendimento = {
  async list(params = {}) {
    try {
      // ✅ CORRIGIDO: usar 'Empreendimento' com E maiúsculo como no servidor
      let endpoint = '/Empreendimento';
      if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        endpoint += `?${searchParams.toString()}`;
      }
      console.log('🔄 Buscando empreendimentos via PostgreSQL:', `${API_BASE_URL}${endpoint}`);
      return await apiRequest(endpoint, { method: 'GET' });
    } catch (error) {
      console.warn('⚠️ PostgreSQL offline, usando dados mock para empreendimentos:', error.message);
      logger.mockData('Usando dados mock para empreendimentos (servidor offline)');
      let data = [...mockData.empreendimentos];

      if (params.nome) {
        data = data.filter(item =>
          item.nome.toLowerCase().includes(params.nome.toLowerCase())
        );
      }

      if (params.status) {
        data = data.filter(item => item.status === params.status);
      }

      return data;
    }
  },

  async get(id) {
    try {
      // ✅ CORRIGIDO: usar 'Empreendimento' com E maiúsculo
      console.log(`🔄 Buscando empreendimento ${id} via PostgreSQL...`);
      return await apiRequest(`/Empreendimento/${id}`);
    } catch (error) {
      console.warn('⚠️ PostgreSQL offline, usando dados mock para empreendimento específico');
      logger.mockData('Usando dados mock para empreendimento específico');
      return mockData.empreendimentos.find(item => item.id === parseInt(id));
    }
  },

  async create(data) {
    try {
      // ✅ CORRIGIDO: usar 'Empreendimento' com E maiúsculo
      console.log('🔄 Criando empreendimento via PostgreSQL...', data);
      const resultado = await apiRequest('/Empreendimento', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('✅ Empreendimento criado com sucesso no PostgreSQL:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao criar empreendimento no PostgreSQL:', error);
      console.warn('⚠️ Salvando empreendimento localmente (modo offline)');
      logger.mockData('Simulando criação de empreendimento');
      const newItem = {
        id: Math.max(...mockData.empreendimentos.map(item => item.id), 0) + 1,
        nome: data.nome || `Empreendimento ${Math.max(...mockData.empreendimentos.map(item => item.id), 0) + 1}`,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.empreendimentos.push(newItem);
      return newItem;
    }
  },

  async update(id, data) {
    try {
      // ✅ CORRIGIDO: usar 'Empreendimento' com E maiúsculo
      console.log(`🔄 Atualizando empreendimento ${id} via PostgreSQL...`, data);
      const resultado = await apiRequest(`/Empreendimento/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('✅ Empreendimento atualizado com sucesso no PostgreSQL:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao atualizar empreendimento no PostgreSQL:', error);
      console.warn('⚠️ Atualizando empreendimento localmente (modo offline)');
      logger.mockData('Simulando atualização de empreendimento');
      const index = mockData.empreendimentos.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        mockData.empreendimentos[index] = {
          ...mockData.empreendimentos[index],
          ...data,
          updated_at: new Date().toISOString()
        };
        return mockData.empreendimentos[index];
      }
      throw new Error('Empreendimento não encontrado');
    }
  },

  async delete(id) {
    try {
      // ✅ CORRIGIDO: usar 'Empreendimento' com E maiúsculo
      console.log(`🗑️ Deletando empreendimento ${id} via PostgreSQL...`);
      const resultado = await apiRequest(`/Empreendimento/${id}`, { method: 'DELETE' });
      console.log('✅ Empreendimento deletado com sucesso do PostgreSQL');
      return resultado;
    } catch (error) {
      console.warn('⚠️ PostgreSQL offline, deletando empreendimento localmente');
      logger.mockData('Simulando exclusão de empreendimento');
      const index = mockData.empreendimentos.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        return mockData.empreendimentos.splice(index, 1)[0];
      }
      throw new Error('Empreendimento não encontrado');
    }
  },

  async filter(params = {}) {
    return this.list(params);
  },

  // ✅ MÉTODOS ESPECIAIS
  async summary() {
    try {
      return await apiRequest('/Empreendimento/summary');
    } catch (error) {
      logger.mockData('Usando dados mock para resumo de empreendimentos');
      const data = mockData.empreendimentos;
      return {
        total: data.length,
        ativos: data.filter(item => item.status === 'ativo').length,
        concluidos: data.filter(item => item.status === 'concluido').length,
        pausados: data.filter(item => item.status === 'pausado').length
      };
    }
  }
};

// ✅ ENTIDADE DOCUMENTO (personalizada)
export const Documento = {
  async list(params = {}) {
    try {
      let endpoint = '/documentos';
      if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        endpoint += `?${searchParams.toString()}`;
      }
      console.log('📋 Buscando documentos via API...', `${API_BASE_URL}${endpoint}`);
      return await apiRequest(endpoint, { method: 'GET' });
    } catch (error) {
      console.warn('⚠️ API offline, usando dados mock para documentos:', error.message);
      logger.mockData('Usando dados mock para documentos (servidor offline)');
      let data = [...mockData.documentos];

      if (params.empreendimento_id) {
        data = data.filter(item => item.empreendimento_id === parseInt(params.empreendimento_id));
      }

      if (params.disciplina) {
        data = data.filter(item => item.disciplina === params.disciplina);
      }

      if (params.numero) {
        data = data.filter(item =>
          item.numero.toLowerCase().includes(params.numero.toLowerCase())
        );
      }

      return data.map(doc => ({
        ...doc,
        subdisciplinas: typeof doc.subdisciplina === 'string'
          ? doc.subdisciplina.split(',').map(s => s.trim())
          : doc.subdisciplina || []
      }));
    }
  },

  async get(id) {
    try {
      console.log(`📋 Buscando documento ${id} via API...`);
      return await apiRequest(`/documentos/${id}`);
    } catch (error) {
      console.warn('⚠️ API offline, usando dados mock para documento específico');
      logger.mockData('Usando dados mock para documento específico');
      const doc = mockData.documentos.find(item => item.id === parseInt(id));
      if (doc) {
        return {
          ...doc,
          subdisciplinas: typeof doc.subdisciplina === 'string'
            ? doc.subdisciplina.split(',').map(s => s.trim())
            : doc.subdisciplina || []
        };
      }
      return null;
    }
  },

  async create(data) {
    try {
      console.log('💾 Criando documento via API...', data);
      const resultado = await apiRequest('/documentos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('✅ Documento criado com sucesso via API');
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao criar documento via API:', error.message);
      console.warn('⚠️ Salvando documento localmente (modo offline)');
      logger.mockData('Simulando criação de documento');

      const newItem = {
        id: Math.max(...mockData.documentos.map(item => item.id), 0) + 1,
        numero: data.numero || `DOC-${String(Math.max(...mockData.documentos.map(item => item.id), 0) + 1).padStart(3, '0')}`,
        ...data,
        subdisciplina: Array.isArray(data.subdisciplinas)
          ? data.subdisciplinas.join(', ')
          : data.subdisciplinas || '',
        status: 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockData.documentos.push(newItem);

      return {
        ...newItem,
        subdisciplinas: Array.isArray(data.subdisciplinas) ? data.subdisciplinas : []
      };
    }
  },

  async update(id, data) {
    try {
      console.log(`💾 Atualizando documento ${id} via API...`, data);
      const resultado = await apiRequest(`/documentos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('✅ Documento atualizado com sucesso via API');
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao atualizar documento via API:', error.message);
      console.warn('⚠️ Atualizando documento localmente (modo offline)');
      logger.mockData('Simulando atualização de documento');

      const index = mockData.documentos.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        const updatedDoc = {
          ...mockData.documentos[index],
          ...data,
          subdisciplina: Array.isArray(data.subdisciplinas)
            ? data.subdisciplinas.join(', ')
            : data.subdisciplinas || '',
          updated_at: new Date().toISOString()
        };

        mockData.documentos[index] = updatedDoc;

        return {
          ...updatedDoc,
          subdisciplinas: Array.isArray(data.subdisciplinas) ? data.subdisciplinas : []
        };
      }
      throw new Error('Documento não encontrado');
    }
  },

  async delete(id) {
    try {
      console.log(`🗑️ Deletando documento ${id} via API...`);
      const resultado = await apiRequest(`/documentos/${id}`, { method: 'DELETE' });
      console.log('✅ Documento deletado com sucesso via API');
      return resultado;
    } catch (error) {
      console.warn('⚠️ API offline, deletando documento localmente');
      logger.mockData('Simulando exclusão de documento');

      const index = mockData.documentos.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        const deletedDoc = mockData.documentos.splice(index, 1)[0];
        return { message: `Documento ${deletedDoc.numero} deletado com sucesso` };
      }
      throw new Error('Documento não encontrado');
    }
  },

  async filter(params = {}) {
    return this.list(params);
  }
};

// ✅ TODAS AS OUTRAS ENTIDADES USANDO A CLASSE BASE
export const Disciplina = new EntityBase('Disciplina', mockData.disciplinas);
export const Atividade = new EntityBase('Atividades', mockData.atividades);
class PlanejamentoAtividadeEntity extends EntityBase {
  async delete(id) {
    try {
      const resultado = await apiRequest(`/planejamento-atividades/${id}`, { method: 'DELETE' });
      return resultado;
    } catch (error) {
      logger.mockData('Simulando exclusão de planejamento');
      const index = mockData.planejamentoAtividades.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        const deleted = mockData.planejamentoAtividades.splice(index, 1)[0];
        return { message: `Planejamento ${deleted.id} deletado com sucesso` };
      }
      throw new Error('Planejamento não encontrado');
    }
  }
  async list(params = {}) {
    let endpoint = `/planejamento-atividades`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    return await apiRequest(endpoint, { method: 'GET' });
  }

  async create(data) {
    console.log('🔵 PlanejamentoAtividadeEntity.create chamado', data);
    return await apiRequest('/planejamento-atividades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id, data) {
    const payload = { ...data };
    if (!('cor' in payload)) payload.cor = null;
    console.log('[PlanejamentoAtividade.update] Chamando PUT', id, payload);
    return await apiRequest(`/planejamento-atividades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const PlanejamentoAtividade = new PlanejamentoAtividadeEntity('PlanejamentoAtividade', mockData.planejamentoAtividades);
class PlanejamentoDocumentoEntity extends EntityBase {
  async filter(params = {}) {
    console.log('[PlanejamentoDocumentoEntity.filter] Chamado com params:', params);
    let endpoint = `/planejamento-documentos`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    console.log('[PlanejamentoDocumentoEntity.filter] Endpoint final:', endpoint);
    return await apiRequest(endpoint, { method: 'GET' });
  }

  async delete(id) {
    console.log('[PlanejamentoDocumentoEntity.delete] Tentando excluir:', id);
    try {
      const resultado = await apiRequest(`/planejamento-documentos/${id}`, { method: 'DELETE' });
      console.log('[PlanejamentoDocumentoEntity.delete] Sucesso na exclusão:', resultado);
      return resultado;
    } catch (error) {
      console.error('[PlanejamentoDocumentoEntity.delete] Erro ao excluir:', error);
      logger.mockData('Simulando exclusão de planejamento de documento');
      const index = mockData.planejamentoDocumentos.findIndex(item => item.id === parseInt(id));
      if (index !== -1) {
        const deleted = mockData.planejamentoDocumentos.splice(index, 1)[0];
        return { message: `PlanejamentoDocumento ${deleted.id} deletado com sucesso` };
      }
      throw new Error('PlanejamentoDocumento não encontrado');
    }
  }

  async update(id, data) {
    const payload = { ...data };
    if (!('cor' in payload)) payload.cor = null;
    console.log('[PlanejamentoDocumento.update] Chamando PUT', id, payload);
    return await apiRequest(`/planejamento-documentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const PlanejamentoDocumento = new PlanejamentoDocumentoEntity('planejamento-documentos');
export const Execucao = new EntityBase('Execucao', mockData.execucoes);
export const SobraUsuario = new EntityBase('SobraUsuario', mockData.sobraUsuarios);

// ✅ ENTIDADE PAVIMENTO (simples - mock/compatibilidade frontend)
export const Pavimento = new EntityBase('Pavimento', []);

// ✅ ENTIDADES ESPECIAIS PARA DASHBOARD
export const DashboardData = {
  async load() {
    try {
      return await apiRequest('/dashboard/summary');
    } catch (error) {
      logger.mockData('Usando dados mock para dashboard');
      return mockData.dashboardData;
    }
  }
};

// ✅ FUNÇÃO PARA CARREGAR DADOS DO DASHBOARD
export const loadDashboardData = async () => {
  try {
    const [
      empreendimentos,
      documentos,
      usuarios,
      planejamentos
    ] = await Promise.all([
      Empreendimento.summary(),
      Documento.list(),
      Usuario.summary(),
      PlanejamentoAtividade.list()
    ]);

    return {
      empreendimentos_ativos: empreendimentos.ativos || empreendimentos.total || 0,
      documentos_total: documentos.length || 0,
      usuarios_ativos: usuarios.ativo || usuarios.total || 0,
      planejamentos_pendentes: planejamentos.filter(p => p.status === 'planejado').length || 0,
      horas_planejadas: planejamentos.reduce((acc, p) => acc + (p.horas_planejadas || 0), 0),
      horas_executadas: planejamentos.reduce((acc, p) => acc + (p.horas_executadas || 0), 0)
    };
  } catch (error) {
    console.warn('⚠️ Erro ao carregar dados do dashboard, usando mock:', error.message);
    return mockData.dashboardData;
  }
};

// ✅ CLASSE GENÉRICA PARA COMPATIBILIDADE
export class Entity extends EntityBase { }

// ✅ EXPORTAR TUDO
const entities = {
  Empreendimento,
  Documento,
  Usuario,
  Pavimento,
  Disciplina,
  Atividade,
  PlanejamentoAtividade,
  PlanejamentoDocumento,
  Execucao,
  SobraUsuario,
  DashboardData,
  loadDashboardData,
  Entity,
  mockData
};





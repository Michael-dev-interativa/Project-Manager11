import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  // Filter, ❌ REMOVER - não usado
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  MapPin,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';

// ✅ Imports corretos
import EmpreendimentoForm from './empreendimentos/EmpreendimentoForm';
import DocumentosTab from './empreendimentos/DocumentosTab';
import { Empreendimento, Usuario, Documento, Atividade, Disciplina } from '../entities/all';
import AnaliseEtapasTab from './empreendimento/AnaliseEtapasTab';
import AnaliticoGlobalTab from './empreendimento/AnaliticoGlobalTab';
import AplicarAtividadeModal from './empreendimento/AplicarAtividadeModal';
import AtividadesProjetoTab from './empreendimento/AtividadesProjetoTab';
import EmpreendimentoHeader from './empreendimento/EmpreendimentoHeader';
import PavimentosTab from './empreendimento/PavimentosTab';
import PlanejamentoAtividadeModal from './empreendimento/PlanejamentoAtividadeModal';
import PlanejamentoDocumentacaoModal from './empreendimento/PlanejamentoDocumentacaoModal';
import PlanejamentoModal from './empreendimento/PlanejamentoModal';


// ✅ DEBUG - adicionar logo após os imports
console.log('🔍 Testando Empreendimento.list diretamente...');
Empreendimento.list().then(data => {
  console.log('🔍 Dados diretos da API:', data);
}).catch(error => {
  console.error('🔍 Erro direto da API:', error);
});

const Empreendimentos = () => {
  const [tab, setTab] = useState('analise');
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [filteredEmpreendimentos, setFilteredEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmpreendimento, setEditingEmpreendimento] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [documentosState, setDocumentosState] = useState([]);
  const [atividadesState, setAtividadesState] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);

  // ✅ CARREGAR DADOS DA API - COM LOGS DETALHADOS
  const loadEmpreendimentos = async (filters = {}) => {
    console.log('🔄 Carregando empreendimentos...', filters);

    try {
      setLoading(true);
      setError(null);

      // ✅ Buscar empreendimentos da API
      const data = await Empreendimento.list(filters);

      console.log('📦 Dados recebidos da API:', data);
      console.log('📊 Quantidade de empreendimentos:', data?.length || 0);

      // ✅ Validar se recebemos um array
      if (!Array.isArray(data)) {
        console.error('❌ API retornou dados em formato inválido:', typeof data, data);
        throw new Error('API retornou dados em formato inválido');
      }

      // ✅ Validar se cada item tem ID
      const dadosValidados = data.map((item, index) => {
        if (!item.id) {
          console.warn(`⚠️ Item ${index} sem ID:`, item);
          return { ...item, id: `temp_${index}_${Date.now()}` };
        }
        return item;
      });

      console.log('✅ Dados validados:', dadosValidados);

      setEmpreendimentos(dadosValidados);
      setFilteredEmpreendimentos(dadosValidados);

    } catch (error) {
      console.error('❌ Erro ao carregar empreendimentos:', error);
      setError(error.message || 'Erro ao carregar dados');

      // ✅ Em caso de erro, mostrar dados vazios ao invés de quebrar
      setEmpreendimentos([]);
      setFilteredEmpreendimentos([]);

    } finally {
      setLoading(false);
    }
  };



  // ✅ CARREGAR DADOS NO MOUNT
  useEffect(() => {
    loadEmpreendimentos();
  }, []);

  // ✅ FILTRAR EMPREENDIMENTOS
  useEffect(() => {
    let filtered = empreendimentos;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    setFilteredEmpreendimentos(filtered);
  }, [empreendimentos, searchTerm, statusFilter]);

  // ✅ HANDLE SUCCESS DO FORM
  const handleFormSuccess = async (novoEmpreendimento) => {
    console.log('✅ Empreendimento salvo, recarregando lista...');

    try {
      // Recarregar a lista para pegar dados atualizados
      await loadEmpreendimentos();

      // Fechar o form
      setShowForm(false);
      setEditingEmpreendimento(null);

    } catch (error) {
      console.error('❌ Erro ao recarregar lista:', error);
    }
  };

  // ✅ FUNÇÃO PARA EXCLUIR EMPREENDIMENTO (corrigida)
  const handleDelete = async (empreendimento) => {
    // ✅ Validar se o empreendimento tem ID válido
    if (!empreendimento || !empreendimento.id || isNaN(empreendimento.id)) {
      console.error('❌ ID do empreendimento inválido:', empreendimento);
      alert('❌ Erro: ID do empreendimento não é válido');
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o empreendimento "${empreendimento.nome}"?\n\n` +
      `Esta ação não poderá ser desfeita.`
    );

    if (!confirmed) {
      console.log('🚫 Exclusão cancelada pelo usuário');
      return;
    }

    console.log('🗑️ Iniciando exclusão do empreendimento:', empreendimento);

    try {
      // ✅ CORRIGIDO: usar setLoading ao invés de setIsLoading
      setLoading(true);

      // ✅ Chamar API de exclusão com ID válido
      await Empreendimento.delete(empreendimento.id);

      console.log('✅ Empreendimento excluído com sucesso');
      alert('✅ Empreendimento excluído com sucesso!');

      // ✅ Recarregar a lista após exclusão
      await loadEmpreendimentos();

    } catch (error) {
      console.error('❌ Erro ao excluir empreendimento:', error);

      let errorMessage = 'Erro ao excluir empreendimento.';
      if (error.message?.includes('não encontrado')) {
        errorMessage = 'Empreendimento não encontrado.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Servidor offline. Verifique se o servidor PostgreSQL está rodando.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert('❌ ' + errorMessage);
    } finally {
      // ✅ CORRIGIDO: usar setLoading ao invés de setIsLoading
      setLoading(false);
    }
  };

  // ✅ STATUS COLORS
  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'em_planejamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'concluido': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'inativo': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'em_planejamento': return 'Em Planejamento';
      case 'pausado': return 'Pausado';
      case 'concluido': return 'Concluído';
      case 'inativo': return 'Inativo';
      default: return status;
    }
  };

  // ✅ DEBUG - FORÇAR DADOS (adicionar após os outros useEffects)
  useEffect(() => {
    console.log('🧪 DEBUG - Estado atual:');
    console.log('🧪 empreendimentos:', empreendimentos);
    console.log('🧪 filteredEmpreendimentos:', filteredEmpreendimentos);
    console.log('🧪 loading:', loading);
    console.log('🧪 error:', error);
  }, [empreendimentos, filteredEmpreendimentos, loading, error]);

  // Função para abrir detalhes do empreendimento
  const { useNavigate } = require('react-router-dom');
  const navigate = useNavigate();
  const handleOpenDetails = (empreendimento) => {
    if (empreendimento?.id) {
      navigate(`/empreendimentos/${empreendimento.id}`);
    }
  };

  const loadUsuarios = async () => {
    try {
      const list = await Usuario.list();
      setUsuarios(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err);
      setUsuarios([]);
    }
  };

  const loadDocumentosDoEmpreendimento = async (empId) => {
    try {
      if (!empId) {
        setDocumentosState([]);
        return;
      }
      const docs = await Documento.filter({ empreendimento_id: empId });
      setDocumentosState(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.warn('Erro ao carregar documentos do empreendimento:', err);
      setDocumentosState([]);
    }
  };

  const loadAtividadesDoEmpreendimento = async (empId) => {
    try {
      if (!empId) {
        setAtividadesState([]);
        return;
      }
      const list = typeof Atividade.filter === 'function'
        ? await Atividade.filter({ empreendimento_id: empId })
        : await Atividade.list({ empreendimento_id: empId });
      setAtividadesState(Array.isArray(list) ? list : []);
      console.log(`📋 Atividades carregadas para empreendimento ${empId}:`, Array.isArray(list) ? list.length : 0);
    } catch (err) {
      console.warn('Erro ao carregar atividades do empreendimento:', err);
      setAtividadesState([]);
    }
  };

  const loadDisciplinas = async () => {
    try {
      const list = await Disciplina.list();
      setDisciplinas(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Erro ao carregar disciplinas:', err);
      setDisciplinas([]);
    }
  };

  // ✅ RENDERIZAÇÃO
  console.log('🎨 RENDERIZAÇÃO - Dados para exibir:', {
    empreendimentos: empreendimentos,
    filteredEmpreendimentos: filteredEmpreendimentos,
    length: filteredEmpreendimentos.length,
    loading: loading,
    error: error
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Carregando empreendimentos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erro ao carregar dados
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadEmpreendimentos}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Empreendimentos</h1>
            <p className="text-gray-600 mt-1">
              Gerencie seus projetos • {filteredEmpreendimentos.length} empreendimento(s) encontrado(s)
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Novo Empreendimento
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar empreendimentos por nome, cliente ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white min-w-[160px]"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="em_planejamento">Em Planejamento</option>
              <option value="pausado">Pausado</option>
              <option value="concluido">Concluído</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        {/* Lista de Empreendimentos - LAYOUT GRID QUADRADO */}
        {filteredEmpreendimentos.length > 0 ? (
          <div className="max-w-7xl mx-auto">
            {/* Grid responsivo */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredEmpreendimentos.map((empreendimento, index) => (
                <motion.div
                  key={empreendimento.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-xl truncate" title={empreendimento.nome}>
                          {empreendimento.nome}
                        </h3>
                        <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(empreendimento.status)}`}>
                          {getStatusLabel(empreendimento.status)}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4 text-base text-gray-600">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="flex-1 truncate" title={empreendimento.cliente}>
                        {empreendimento.cliente}
                      </span>
                    </div>
                    {empreendimento.endereco && (
                      <div className="flex items-center gap-4 text-base text-gray-600">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-500" />
                        </div>
                        <span className="flex-1 truncate" title={empreendimento.endereco}>
                          {empreendimento.endereco}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenDetails(empreendimento)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Building2 className="w-4 h-4" />
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmpreendimento(empreendimento);
                        setShowForm(true);
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(empreendimento)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* Estado vazio - LAYOUT CORRIGIDO */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchTerm || statusFilter ? 'Nenhum resultado encontrado' : 'Nenhum empreendimento cadastrado'}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {searchTerm || statusFilter
                  ? 'Tente ajustar os filtros de busca para encontrar o que procura'
                  : 'Comece cadastrando seu primeiro empreendimento para organizar seus projetos'
                }
              </p>
              {!searchTerm && !statusFilter && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Cadastrar Primeiro Empreendimento
                </button>
              )}
            </div>
          </div>
        )}

        {/* Detalhes do Empreendimento - NOVO CÓDIGO AQUI */}
        {selectedEmpreendimento && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header com Tabs */}
            <div className="border-b border-gray-200">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedEmpreendimento.nome}
                  </h2>
                  <p className="text-gray-600">Cliente: {selectedEmpreendimento.cliente}</p>
                </div>
                <button
                  onClick={() => setSelectedEmpreendimento(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* debug removido */}
              {/* Navigation Tabs */}
              <div className="px-6">
                <nav className="flex space-x-8 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'documentos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Documentos
                  </button>
                  <button
                    onClick={() => setActiveTab('pavimentos')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'pavimentos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Pavimentos
                  </button>
                  <button
                    onClick={() => setActiveTab('atividades')}
                    className={`py-2 px-6 font-medium text-sm ${activeTab === 'atividades'
                      ? 'border-2 rounded-md border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Atividades do Projeto
                  </button>
                  <button
                    onClick={() => setActiveTab('catalogo')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'catalogo'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Catálogo
                  </button>
                  <button
                    onClick={() => setActiveTab('etapas')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'etapas'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Etapas
                  </button>
                </nav>
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-800">Status</h3>
                      <p className="text-lg font-semibold text-blue-900 capitalize">
                        {selectedEmpreendimento.status}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-800">Endereço</h3>
                      <p className="text-sm text-green-700">
                        {selectedEmpreendimento.endereco || 'Não informado'}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="text-sm font-medium text-purple-800">Documentos</h3>
                      <p className="text-lg font-semibold text-purple-900">0</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h3 className="text-sm font-medium text-orange-800">Progresso</h3>
                      <p className="text-lg font-semibold text-orange-900">0%</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documentos' && (
                <DocumentosTab
                  empreendimento={selectedEmpreendimento}
                  isActive={activeTab === 'documentos'}
                />
              )}

              {activeTab === 'pavimentos' && (
                <PavimentosTab
                  empreendimentoId={selectedEmpreendimento?.id}
                  onUpdate={loadEmpreendimentos}
                />
              )}

              {activeTab === 'atividades' && (
                <AtividadesProjetoTab
                  empreendimentoId={selectedEmpreendimento?.id}
                  onUpdate={(newActivity) => {
                    if (newActivity) {
                      // Insert or update the activity into the current list quickly
                      setAtividadesState(prev => {
                        if (!Array.isArray(prev)) return [newActivity];
                        const pk = newActivity.id ?? newActivity.id_atividade;
                        const index = prev.findIndex(a => (a.id ?? a.id_atividade) == pk);
                        if (index >= 0) {
                          const copy = [...prev];
                          copy[index] = newActivity;
                          return copy;
                        }
                        return [...prev, newActivity];
                      });
                    } else {
                      loadAtividadesDoEmpreendimento(selectedEmpreendimento?.id);
                    }
                  }}
                  documentos={documentosState}
                  usuarios={usuarios}
                  atividades={atividadesState}
                  disciplinas={disciplinas}
                />
              )}

              {activeTab === 'catalogo' && (
                <AnaliticoGlobalTab
                  empreendimentoId={selectedEmpreendimento?.id}
                  onUpdate={loadEmpreendimentos}
                />
              )}

              {activeTab === 'etapas' && (
                <AnaliseEtapasTab planejamentos={selectedEmpreendimento?.planejamentos || []} />
              )}
            </div>
          </div>
        )}

        {/* Modal do Formulário */}
        {showForm && (
          <EmpreendimentoForm
            empreendimento={editingEmpreendimento}
            onSuccess={handleFormSuccess}
            onClose={() => {
              setShowForm(false);
              setEditingEmpreendimento(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Empreendimentos;
import React, { useState, useEffect } from 'react';

import { AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, FileText, Calendar, User, Building, X, Clock, ChevronDown, ChevronRight } from 'lucide-react';

import DocumentoForm from './DocumentoForm';
import PlanejamentoDocumentacaoModal from '../empreendimento/PlanejamentoDocumentacaoModal';
import { Documento, Atividade, Usuario } from '../../entities/all';

export default function DocumentosTab({
  empreendimento,
  disciplinas = [],
  isActive = false
}) {
  const [usuarios, setUsuarios] = useState([]);
  // Carregar usuários cadastrados
  useEffect(() => {
    async function fetchUsuarios() {
      try {
        const lista = await Usuario.list();
        setUsuarios(lista);
      } catch (err) {
        setUsuarios([]);
      }
    }
    fetchUsuarios();
  }, []);
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [atividadesPorDocumento, setAtividadesPorDocumento] = useState({});
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPlanejamentoModal, setShowPlanejamentoModal] = useState(false);
  const [documentoPlanejamento, setDocumentoPlanejamento] = useState(null);

  // ✅ CARREGAR DOCUMENTOS DO BANCO
  useEffect(() => {
    if (isActive && empreendimento?.id) {
      loadDocumentos();
    }
    // eslint-disable-next-line
  }, [isActive, empreendimento?.id]);

  const loadDocumentos = async () => {
    setIsLoading(true);
    try {
      const docs = await Documento.list({ empreendimento_id: empreendimento.id });
      setDocumentos(docs);
    } catch (error) {
      alert('Erro ao carregar documentos. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar atividades relacionadas ao expandir
  const fetchAtividadesParaDocumento = async (documento) => {
    if (!documento) return;
    try {
      // Busca atividades vinculadas ao documento pelo novo endpoint
      const resp = await fetch(`http://localhost:3001/api/documentos/${documento.id}/atividades`);
      const atividades = await resp.json();
      setAtividadesPorDocumento(prev => ({ ...prev, [documento.id]: atividades }));
    } catch (err) {
      setAtividadesPorDocumento(prev => ({ ...prev, [documento.id]: [] }));
    }
  };

  const handleNovoDocumento = () => {
    setEditingDocumento(null);
    setShowForm(true);
  };

  const handleEditarDocumento = (doc) => {
    setEditingDocumento(doc);
    setShowForm(true);
  };

  const handleExcluirDocumento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    try {
      console.log(`🗑️ Excluindo documento ${id}...`);
      await Documento.delete(id);
      console.log('✅ Documento excluído com sucesso!');

      // Remover da lista local
      setDocumentos(prev => prev.filter(doc => doc.id !== id));
      alert('✅ Documento excluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir documento:', error);
      alert('Erro ao excluir documento. Tente novamente.');
    }
  };

  const handleSalvarDocumento = async (dadosDocumento) => {
    try {
      console.log('💾 Salvando documento...', dadosDocumento);

      if (editingDocumento) {
        // Atualizar documento existente
        const documentoAtualizado = await Documento.update(editingDocumento.id, dadosDocumento);
        setDocumentos(prev =>
          prev.map(doc =>
            doc.id === editingDocumento.id ? documentoAtualizado : doc
          )
        );
        alert('✅ Documento atualizado com sucesso!');
      } else {
        // Criar novo documento
        const novoDocumento = await Documento.create(dadosDocumento);
        setDocumentos(prev => [...prev, novoDocumento]);
        alert('✅ Documento criado com sucesso!');
        // Não criar atividades manualmente aqui! O backend já faz isso.
      }

      setShowForm(false);
      setEditingDocumento(null);
    } catch (error) {
      console.error('❌ Erro ao salvar documento:', error);
      alert('Erro ao salvar documento. Verifique os dados e tente novamente.');
    }
  };

  // Filtros de busca
  const filteredDocumentos = documentos.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.numero?.toLowerCase().includes(searchLower) ||
      doc.arquivo?.toLowerCase().includes(searchLower) ||
      doc.disciplina?.toLowerCase().includes(searchLower)
    );
  });


  const getStatusColor = (status) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'atrasado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'em_andamento': return 'Em Andamento';
      case 'pendente': return 'Pendente';
      case 'atrasado': return 'Atrasado';
      default: return 'Indefinido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (!isActive) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Documentos Cadastrados ({documentos.length})
          </h2>
        </div>
        <button
          onClick={handleNovoDocumento}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </button>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, arquivo ou disciplina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabela de Documentos */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"> </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Arquivo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descritivo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subdisciplina</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Escala</th>
              {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disciplina</th> */}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Executor</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Datas</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tempo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8">Carregando documentos...</td></tr>
            ) : filteredDocumentos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8">Nenhum documento encontrado</td></tr>
            ) : (
              filteredDocumentos.map((documento) => (
                <React.Fragment key={documento.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 align-top">
                      <button
                        onClick={async () => {
                          setExpanded(e => {
                            const novo = { ...e, [documento.id]: !e[documento.id] };
                            // Se for expandir, busca atividades
                            if (!e[documento.id]) fetchAtividadesParaDocumento(documento);
                            return novo;
                          });
                        }}
                        className="focus:outline-none"
                        title={expanded[documento.id] ? 'Recolher' : 'Expandir'}
                      >
                        {expanded[documento.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-900">{documento.numero}</td>
                    <td className="px-4 py-2 text-gray-700">{documento.arquivo}</td>
                    <td className="px-4 py-2 text-gray-700">{documento.descritivo || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{documento.subdisciplina || documento.subdisciplinas || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{documento.escala || '—'}</td>
                    {/* <td className="px-4 py-2 text-gray-700">{documento.disciplina}</td> */}
                    <td className="px-4 py-2 text-gray-700">{documento.executor_principal || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatDate(documento.inicio_planejado)}<br />{formatDate(documento.termino_planejado)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{documento.tempo_total || 0}h</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarDocumento(documento)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </button>
                        <button
                          onClick={() => handleExcluirDocumento(documento.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                        <button
                          onClick={() => {
                            setDocumentoPlanejamento(documento);
                            setShowPlanejamentoModal(true);
                            if (!atividadesPorDocumento[documento.id]) fetchAtividadesParaDocumento(documento);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Planejar"
                          style={{ minWidth: 90 }}
                        >
                          <Calendar className="w-4 h-4" /> Planejar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded[documento.id] && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="p-0">
                        <div className="p-4">
                          <div className="font-semibold text-gray-700 mb-2">Atividades da Folha: {documento.numero}</div>
                          {atividadesPorDocumento[documento.id]?.length ? (
                            <div className="space-y-2">
                              {atividadesPorDocumento[documento.id].map((atv, idx) => (
                                <div key={atv.id_atividade || idx} className="bg-white border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{atv.atividade}</div>
                                    <div className="text-xs text-gray-500">{atv.etapa} • {atv.disciplina} • {atv.subdisciplina}</div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 md:mt-0">
                                    <span className="text-sm font-semibold text-gray-700">{atv.tempo || 0}h</span>
                                    <span className="text-xs text-blue-600">Disponível para planejamento</span>
                                  </div>
                                </div>
                              ))}
                              <div className="text-xs text-gray-600 mt-2">Total: {atividadesPorDocumento[documento.id].length} atividades</div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm">Nenhuma atividade vinculada a este documento.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal do Formulário */}
      <AnimatePresence>
        {showForm && (
          <DocumentoForm
            documento={editingDocumento}
            empreendimento={empreendimento}
            disciplinas={disciplinas}
            onSave={handleSalvarDocumento}
            onClose={() => {
              setShowForm(false);
              setEditingDocumento(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal do Planejamento - visual consistente com outros modais */}
      {/* Modal de Planejamento de Documentação - fora da tabela, como elemento separado */}
      <AnimatePresence>
        {showPlanejamentoModal && (
          <PlanejamentoDocumentacaoModal
            isOpen={showPlanejamentoModal}
            onClose={() => setShowPlanejamentoModal(false)}
            atividades={atividadesPorDocumento[documentoPlanejamento?.id] || []}
            usuarios={usuarios}
            empreendimentoId={empreendimento.id}
            documentoId={documentoPlanejamento?.id}
            planejamentos={[]}
            onSave={() => {
              setShowPlanejamentoModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

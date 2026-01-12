import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Upload } from 'lucide-react';
import { retryWithBackoff } from '@/components/utils/apiUtils';
import { Atividade } from '../../entities/all';

// Etapas fixas para seleção
const ETAPAS_FIXAS = [
  'Planejamento',
  'Concepção',
  'Estudo Preliminar',
  'Ante-Projeto',
  'Projeto Básico',
  'Projeto Executivo',
  'Liberado para Obra'
];

export default function AtividadesManager({ atividades, disciplinas, isLoading, onUpdate, documentoId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    etapa: '',
    disciplina: '',
    subdisciplina: '',
    atividade: '',
    predecessora: '',
    funcao: '',
    tempo: '',
    empreendimento_id: '',
    documento_id: documentoId || '',
    ativo: true
  });
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');

  // Importação via Excel/CSV
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await Atividade.update(editingId, formData);
        console.log('✅ Atividade atualizada:', formData);
      } else {
        await Atividade.create(formData);
        console.log('✅ Atividade criada:', formData);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ nome: '', descricao: '', disciplina_id: '', categoria: '', ativo: true });
      onUpdate();
    } catch (error) {
      console.error('❌ Erro ao salvar atividade:', error);
      alert('Erro ao salvar atividade: ' + error.message);
    }
  };

  const handleEdit = (atividade) => {
    setFormData({
      nome: atividade.nome || '',
      descricao: atividade.descricao || '',
      disciplina_id: atividade.disciplina_id || '',
      categoria: atividade.categoria || '',
      ativo: atividade.ativo !== false
    });
    setEditingId(atividade.id ?? atividade.id_atividade);
    setShowForm(true);
  };

  const handleDelete = async (atividade) => {
    if (!window.confirm(`Tem certeza que deseja excluir a atividade "${atividade.nome}"?`)) {
      return;
    }

    try {
      await Atividade.delete(atividade.id ?? atividade.id_atividade);
      console.log('✅ Atividade excluída:', atividade);
      onUpdate();
    } catch (error) {
      console.error('❌ Erro ao excluir atividade:', error);
      alert('Erro ao excluir atividade: ' + error.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ nome: '', descricao: '', disciplina_id: '', categoria: '', ativo: true });
  };

  // Filtrar atividades com base no termo de busca, etapa e disciplina
  const atividadesFiltradas = atividades.filter(atividade => {
    const busca = searchTerm.trim().toLowerCase();
    const matchBusca =
      atividade.atividade?.toLowerCase().includes(busca) ||
      atividade.descricao?.toLowerCase().includes(busca) ||
      atividade.categoria?.toLowerCase().includes(busca);
    const matchEtapa = filtroEtapa ? atividade.etapa === filtroEtapa : true;
    const matchDisciplina = filtroDisciplina ? atividade.disciplina === filtroDisciplina : true;
    return matchBusca && matchEtapa && matchDisciplina;
  });

  // Agrupar atividades por etapa
  const atividadesPorEtapa = useMemo(() => {
    const grupos = {};
    atividadesFiltradas.forEach((atividade) => {
      const etapa = atividade.etapa || 'Sem Etapa';
      if (!grupos[etapa]) grupos[etapa] = [];
      grupos[etapa].push(atividade);
    });
    return grupos;
  }, [atividadesFiltradas]);

  // Listas únicas para filtros
  const etapasUnicas = ETAPAS_FIXAS;
  const disciplinasUnicas = useMemo(() => Array.from(new Set(atividades.map(a => a.disciplina).filter(Boolean))), [atividades]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Carregando atividades...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Catálogo de Atividades
        </h2>
        {!showForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Nova Atividade
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="border border-green-500 text-green-600 px-4 py-2 rounded hover:bg-green-50 flex items-center gap-2"
            >
              <Upload size={18} />
              Importar Excel/CSV
            </button>
          </div>
        )}
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-2 flex-1">
          <select
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={filtroEtapa}
            onChange={e => setFiltroEtapa(e.target.value)}
          >
            <option value="">Todas as Etapas</option>
            {etapasUnicas.map(etapa => (
              <option key={etapa} value={etapa}>{etapa}</option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={filtroDisciplina}
            onChange={e => setFiltroDisciplina(e.target.value)}
          >
            <option value="">Todas as Disciplinas</option>
            {disciplinasUnicas.map(disciplina => (
              <option key={disciplina} value={disciplina}>{disciplina}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar atividades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Formulário */}
      {
        showForm && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Editar Atividade' : 'Nova Atividade'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Atividade *</label>
                  <input type="text" value={formData.atividade} onChange={e => setFormData({ ...formData, atividade: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Elaboração de plantas" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etapa *</label>
                  <select
                    value={formData.etapa}
                    onChange={e => setFormData({ ...formData, etapa: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="" disabled>Selecione a etapa</option>
                    {ETAPAS_FIXAS.map(etapa => (
                      <option key={etapa} value={etapa}>{etapa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina *</label>
                  <input type="text" value={formData.disciplina} onChange={e => setFormData({ ...formData, disciplina: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Elétrica" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdisciplina *</label>
                  <input
                    type="text"
                    value={formData.subdisciplina}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        subdisciplina: e.target.value,
                        documento_id: documentoId || formData.documento_id // sempre seta documento_id se disponível
                      });
                    }}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Instalação, Montagem"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função *</label>
                  <input type="text" value={formData.funcao} onChange={e => setFormData({ ...formData, funcao: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Engenheiro" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (horas) *</label>
                  <input type="number" value={formData.tempo} onChange={e => setFormData({ ...formData, tempo: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: 8" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Predecessora</label>
                  <input type="text" value={formData.predecessora} onChange={e => setFormData({ ...formData, predecessora: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ID da atividade anterior" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empreendimento</label>
                  <input type="text" value={formData.empreendimento_id} onChange={e => setFormData({ ...formData, empreendimento_id: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ID do empreendimento" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* Lista de Atividades agrupadas por Etapa */}
      <div className="space-y-6">
        {Object.keys(atividadesPorEtapa).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filtroEtapa || filtroDisciplina ? 'Nenhuma atividade encontrada' : 'Nenhuma atividade cadastrada'}
          </div>
        ) : (
          Object.entries(atividadesPorEtapa).map(([etapa, atividadesGrupo]) => (
            <div key={etapa} className="bg-gray-50 border rounded-lg shadow-sm">
              <div className="px-6 py-3 border-b flex items-center gap-2 bg-gray-100 rounded-t-lg">
                <span className="text-lg font-bold text-blue-800">{etapa}</span>
                <span className="ml-2 text-xs text-gray-500">({atividadesGrupo.length} atividades)</span>
              </div>
              <div className="divide-y">
                {atividadesGrupo.map((atividade) => (
                  <div
                    key={atividade.id ?? atividade.id_atividade}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-base">{atividade.atividade}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {atividade.disciplina && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {atividade.disciplina}
                          </span>
                        )}
                        {atividade.subdisciplina && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            {atividade.subdisciplina}
                          </span>
                        )}
                        {atividade.funcao && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            {atividade.funcao}
                          </span>
                        )}
                        {atividade.tempo && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {atividade.tempo}h
                          </span>
                        )}
                        {atividade.predecessora && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">
                            Predecessora: {atividade.predecessora}
                          </span>
                        )}
                        {atividade.empreendimento_id && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                            Empreendimento: {atividade.empreendimento_id}
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${atividade.ativo !== false
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                        >
                          {atividade.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(atividade)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(atividade)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Modal de Importação */}
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Importar Atividades para o Catálogo</h3>
              <p className="text-sm text-gray-600 mb-2">
                Esperado: colunas id_atividade, etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mb-4 w-full"
              />
              <div className="flex gap-2 justify-between items-center">
                <button
                  type="button"
                  className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      const XLSX = await import('xlsx');
                      const headers = ['id_atividade', 'etapa', 'disciplina', 'subdisciplina', 'atividade', 'predecessora', 'tempo', 'funcao'];
                      const sample = [
                        ['A-001', 'Planejamento', 'Elétrica', 'Instalação', 'Levantamento das premissas', '', 2, 'Projetista']
                      ];
                      const aoa = [headers, ...sample];
                      const ws = XLSX.utils.aoa_to_sheet(aoa);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Atividades');
                      XLSX.writeFile(wb, 'template_atividades.xlsx');
                    } catch (e) {
                      alert('Não foi possível gerar o template: ' + e.message);
                    }
                  }}
                >
                  Baixar Template
                </button>

                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded border bg-gray-100" onClick={() => setShowImport(false)} disabled={isImporting}>
                    Cancelar
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                    onClick={async () => {
                      if (!importFile) {
                        alert('Selecione um arquivo para importar');
                        return;
                      }
                      setIsImporting(true);
                      try {
                        const XLSX = await import('xlsx');
                        let rows = [];
                        if (importFile.name.toLowerCase().endsWith('.csv')) {
                          const text = await importFile.text();
                          const lines = text.split('\n').filter(l => l.trim());
                          const sep = lines[0]?.includes(';') ? ';' : ',';
                          const headers = lines[0].split(sep).map(h => h.trim());
                          for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(sep).map(v => v.trim());
                            const row = {};
                            headers.forEach((h, idx) => row[h] = values[idx] || '');
                            rows.push(row);
                          }
                        } else {
                          const data = await importFile.arrayBuffer();
                          const wb = XLSX.read(data, { type: 'array' });
                          const sheetName = wb.SheetNames[0];
                          const sheet = wb.Sheets[sheetName];
                          rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                        }

                        const normalized = rows.map(r => ({
                          id_atividade: r.id_atividade ?? r.id ?? r.codigo ?? '',
                          etapa: r.etapa ?? r.fase ?? '',
                          disciplina: r.disciplina ?? '',
                          subdisciplina: r.subdisciplina ?? r.sub_disciplina ?? '',
                          atividade: r.atividade ?? r.descricao ?? r.nome ?? '',
                          predecessora: r.predecessora ?? r.predecessor ?? r.depende ?? '',
                          tempo: r.tempo ?? r.duracao ?? r['duração'] ?? r.horas ?? 0,
                          funcao: r.funcao ?? r['função'] ?? ''
                        }));

                        let sucessos = 0, falhas = 0;
                        for (const r of normalized) {
                          try {
                            const payload = {
                              ...r,
                              tempo: r.tempo ? parseFloat(r.tempo) : 0,
                              origem: 'catalogo',
                              empreendimento_id: null
                            };
                            await retryWithBackoff(() => Atividade.create(payload), 3, 500, 'importAtividadeCatalogo');
                            sucessos++;
                          } catch (e) {
                            falhas++;
                          }
                        }
                        alert(`Importação concluída!\n\nSucessos: ${sucessos}\nFalhas: ${falhas}`);
                        setShowImport(false);
                        onUpdate && onUpdate();
                      } catch (err) {
                        alert(`Erro ao processar arquivo: ${err.message}`);
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </div>
            </div>
        )}
          </div>
    </div >
      );
}

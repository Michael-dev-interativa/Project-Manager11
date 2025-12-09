import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users } from 'lucide-react';
import { Atividade, Disciplina } from '../../entities/all';

export default function AtividadeFuncaoManager() {
  const [atividades, setAtividades] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [atividadesFuncao, setAtividadesFuncao] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    atividade_id: '',
    departamento: '',
    funcao: '',
    tempo_padrao: 1,
    complexidade: 'media',
    ativo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [atividadesData, disciplinasData] = await Promise.all([
        Atividade.list(),
        Disciplina.list()
      ]);

      setAtividades(atividadesData || []);
      setDisciplinas(disciplinasData || []);

      // Mock data para departamentos (você pode implementar uma entidade depois)
      setDepartamentos([
        { id: 1, nome: 'Arquitetura' },
        { id: 2, nome: 'Estrutura' },
        { id: 3, nome: 'Instalações' },
        { id: 4, nome: 'Projeto' },
        { id: 5, nome: 'Coordenação' }
      ]);

      // Mock data para atividades por função (você pode implementar uma entidade depois)
      setAtividadesFuncao([
        {
          id: 1,
          atividade_id: 1,
          departamento: 'Arquitetura',
          funcao: 'Arquiteto Júnior',
          tempo_padrao: 2,
          complexidade: 'baixa',
          ativo: true
        }
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newItem = {
        ...formData,
        id: editingId || Date.now(),
        tempo_padrao: parseFloat(formData.tempo_padrao)
      };

      if (editingId) {
        setAtividadesFuncao(prev =>
          prev.map(item => item.id === editingId ? newItem : item)
        );
        console.log('✅ Atividade por função atualizada:', newItem);
      } else {
        setAtividadesFuncao(prev => [...prev, newItem]);
        console.log('✅ Atividade por função criada:', newItem);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        atividade_id: '',
        departamento: '',
        funcao: '',
        tempo_padrao: 1,
        complexidade: 'media',
        ativo: true
      });
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      atividade_id: item.atividade_id || '',
      departamento: item.departamento || '',
      funcao: item.funcao || '',
      tempo_padrao: item.tempo_padrao || 1,
      complexidade: item.complexidade || 'media',
      ativo: item.ativo !== false
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) {
      return;
    }

    setAtividadesFuncao(prev => prev.filter(af => af.id !== item.id));
    console.log('✅ Item excluído:', item);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      atividade_id: '',
      departamento: '',
      funcao: '',
      tempo_padrao: 1,
      complexidade: 'media',
      ativo: true
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} />
            Atividades por Departamento
          </h2>
          <p className="text-gray-600 mt-1">
            Configure tempos e responsabilidades por função
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Configuração
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Editar Configuração' : 'Nova Configuração'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atividade *
                </label>
                <select
                  value={formData.atividade_id}
                  onChange={(e) => setFormData({ ...formData, atividade_id: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecionar atividade</option>
                  {atividades.map(atividade => (
                    <option key={atividade.id} value={atividade.id}>
                      {atividade.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecionar departamento</option>
                  {departamentos.map(dept => (
                    <option key={dept.id} value={dept.nome}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função *
                </label>
                <input
                  type="text"
                  value={formData.funcao}
                  onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Arquiteto Sênior"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo Padrão (horas) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.tempo_padrao}
                  onChange={(e) => setFormData({ ...formData, tempo_padrao: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complexidade
                </label>
                <select
                  value={formData.complexidade}
                  onChange={(e) => setFormData({ ...formData, complexidade: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'true' })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={true}>Ativo</option>
                  <option value={false}>Inativo</option>
                </select>
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
      )}

      {/* Lista */}
      <div className="space-y-2">
        {atividadesFuncao.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma configuração cadastrada
          </div>
        ) : (
          atividadesFuncao.map((item) => {
            const atividade = atividades.find(a => a.id === parseInt(item.atividade_id));
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {atividade?.nome || 'Atividade não encontrada'}
                  </h3>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span><strong>Departamento:</strong> {item.departamento}</span>
                    <span><strong>Função:</strong> {item.funcao}</span>
                    <span><strong>Tempo:</strong> {item.tempo_padrao}h</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${item.complexidade === 'alta' ? 'bg-red-100 text-red-800' :
                        item.complexidade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}
                    >
                      {item.complexidade === 'alta' ? 'Alta' :
                        item.complexidade === 'media' ? 'Média' : 'Baixa'} Complexidade
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${item.ativo !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {item.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-800 p-2"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
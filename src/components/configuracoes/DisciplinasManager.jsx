import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Disciplina } from '../../entities/all';

// Paleta de cores disponíveis
const CORES = [
  '#2563eb', // azul
  '#22c55e', // verde
  '#a21caf', // roxo
  '#06b6d4', // ciano
  '#f59e42', // laranja
  '#f43f5e', // vermelho
  '#eab308', // amarelo
  '#10b981', // verde claro
  '#ec4899', // rosa
  '#6366f1', // azul claro
];

export default function DisciplinasManager({ disciplinas = [], isLoading = false, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cor: CORES[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await Disciplina.update(editingId, formData);
        console.log('✅ Disciplina atualizada:', formData);
      } else {
        await Disciplina.create(formData);
        console.log('✅ Disciplina criada:', formData);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ nome: '', cor: CORES[0] });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ Erro ao salvar disciplina:', error);
      alert('Erro ao salvar disciplina: ' + error.message);
    }
  };

  const handleEdit = (disciplina) => {
    setFormData({
      nome: disciplina.nome || '',
      cor: disciplina.cor || CORES[0]
    });
    setEditingId(disciplina.id);
    setShowForm(true);
  };

  const handleDelete = async (disciplina) => {
    if (!window.confirm(`Tem certeza que deseja excluir a disciplina "${disciplina.nome}"?`)) {
      return;
    }

    try {
      await Disciplina.delete(disciplina.id);
      console.log('✅ Disciplina excluída:', disciplina);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ Erro ao excluir disciplina:', error);
      alert('Erro ao excluir disciplina: ' + error.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ nome: '', cor: CORES[0] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Carregando disciplinas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Disciplinas ({disciplinas.length})
          </h3>
          <p className="text-sm text-gray-600">
            Configure as disciplinas utilizadas nos projetos
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nova Disciplina
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 text-blue-900">
            {editingId ? '✏️ Editar Disciplina' : '➕ Nova Disciplina'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Arquitetura, Estrutural, Elétrica..."
                  required
                />
              </div>
            </div>
            {/* Seletor de cor */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor Identificadora</label>
              <div className="flex gap-3 mt-1">
                {CORES.map((cor) => (
                  <button
                    type="button"
                    key={cor}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center focus:outline-none transition-all ${formData.cor === cor ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-300'}`}
                    style={{ backgroundColor: cor }}
                    aria-label={`Selecionar cor ${cor}`}
                    onClick={() => setFormData({ ...formData, cor })}
                  >
                    {formData.cor === cor && (
                      <span className="block w-3 h-3 rounded-full border-2 border-white bg-white/30"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Save size={16} />
                Salvar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Disciplinas */}
      <div className="space-y-3">
        {disciplinas.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma disciplina cadastrada</h3>
            <p className="text-gray-600 mb-4">Comece criando sua primeira disciplina</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Criar Primeira Disciplina
            </button>
          </div>
        ) : (
          disciplinas.map((disciplina) => (
            <div
              key={disciplina.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block w-5 h-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: disciplina.cor || '#2563eb' }}
                ></span>
                <span className="font-semibold text-gray-900 text-base">{disciplina.nome}</span>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(disciplina)}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  title="Editar disciplina"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(disciplina)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Excluir disciplina"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
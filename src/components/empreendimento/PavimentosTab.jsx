import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pavimento } from "@/entities/all";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function PavimentosTab({ empreendimentoId, onUpdate }) {
  const [pavimentos, setPavimentos] = useState([]);
  const [formData, setFormData] = useState({ nome: '', area: '', escala: '' });
  const [editingPavimento, setEditingPavimento] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchPavimentos = async () => {
    try {
      const data = await Pavimento.filter({ empreendimento_id: empreendimentoId });
      console.log('📦 Pavimentos carregados:', data?.length || 0, data);
      setPavimentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pavimentos:", error);
      setPavimentos([]);
    }
  };

  useEffect(() => {
    if (empreendimentoId) {
      fetchPavimentos();
    }
  }, [empreendimentoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // **NOVO**: Validar área como número
    const areaFinal = parseFloat(formData.area);

    if (!formData.nome || isNaN(areaFinal) || areaFinal <= 0) {
      alert("Por favor, preencha o nome e uma área válida em m².");
      return;
    }

    try {
      const pavimentoData = {
        nome: formData.nome,
        area: areaFinal,
        escala: formData.escala || null, // Escala é opcional
        empreendimento_id: empreendimentoId
      };
      console.log('📨 Enviando pavimento (client):', pavimentoData);

      if (editingPavimento) {
        const editId = editingPavimento.id ?? editingPavimento.id_pavimento ?? editingPavimento.idPavimento;
        const updated = await Pavimento.update(editId, pavimentoData);
        console.log('🔁 Pavimento atualizado:', updated);
        // update in local state optimistically
        setPavimentos(prev => prev.map(p => ((p.id ?? p.id_pavimento ?? p.idPavimento) === (updated.id ?? updated.id_pavimento ?? updated.idPavimento)) ? updated : p));
      } else {
        const created = await Pavimento.create(pavimentoData);
        console.log('✅ Pavimento criado no cliente:', created);
        // optimistic insert into list
        if (created) setPavimentos(prev => [created, ...(prev || [])]);
      }

      setFormData({ nome: '', area: '', escala: '' });
      setEditingPavimento(null);
      setShowForm(false);
      fetchPavimentos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao salvar pavimento:", error);
      alert("Erro ao salvar pavimento. Tente novamente.");
    }
  };

  const handleDelete = async (id) => {
    /* eslint-disable-next-line no-restricted-globals */
    if (!window.confirm('Tem certeza que deseja excluir este pavimento?')) return;

    try {
      await Pavimento.delete(id);
      fetchPavimentos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao excluir pavimento:", error);
      alert("Erro ao excluir pavimento. Tente novamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Pavimentos</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-4 text-lg">
            {editingPavimento ? 'Editar Pavimento' : 'Adicionar Novo Pavimento'}
          </h3>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Pavimento</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Térreo, 1º Pavimento, Subsolo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="area">Área (m²) *</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.50"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite a área real do pavimento em metros quadrados
                </p>
              </div>
              <div>
                <Label htmlFor="escala">Escala (Opcional)</Label>
                <Input
                  id="escala"
                  type="text"
                  placeholder="Ex: 1:125"
                  value={formData.escala}
                  onChange={(e) => setFormData({ ...formData, escala: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Escala do desenho original (apenas para referência)
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  {editingPavimento ? 'Salvar Alterações' : 'Adicionar Pavimento'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPavimento(null);
                    setFormData({ nome: '', area: '', escala: '' });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              aria-label="Adicionar Pavimento"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pavimento
            </button>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Lista de Pavimentos</h3>
            <button
              onClick={() => setShowForm(true)}
              aria-label="Adicionar Pavimento"
              className="inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {pavimentos.map(pav => {
              const pk = pav.id ?? pav.id_pavimento ?? pav.idPavimento;
              const area = Number(pav.area);
              const areaFormatada = area % 1 === 0 ? area.toFixed(0) : area.toFixed(2);
              const displayText = pav.escala ? `${areaFormatada} m² (Escala: ${pav.escala})` : `${areaFormatada} m²`;

              return (
                <div key={pk} className="flex justify-between items-center p-3 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium">{pav.nome}</p>
                    <p className="text-sm text-gray-500">{displayText}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPavimento(pav);
                        setFormData({
                          nome: pav.nome,
                          area: String(pav.area),
                          escala: pav.escala || ''
                        });
                        setShowForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pk)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {pavimentos.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Nenhum pavimento cadastrado.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowForm(true)}
                    aria-label="Adicionar Pavimento"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pavimento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
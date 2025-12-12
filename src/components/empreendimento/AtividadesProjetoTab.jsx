import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Search, Calendar } from "lucide-react";
import { Atividade } from "@/entities/all";
import AtividadeFormModal from './AtividadeFormModal';
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import AplicarAtividadeModal from "./AplicarAtividadeModal";
import PlanejamentoAtividadeModal from "./PlanejamentoAtividadeModal";
import { format, addDays } from "date-fns";
import { distribuirHorasPorDias, getNextWorkingDay } from '../utils/DateCalculator';

const initialState = {
  etapa: '',
  disciplina: '',
  subdisciplina: '',
  atividade: '',
  funcao: '',
  tempo: 0,
};



export default function AtividadesProjetoTab({ empreendimentoId, atividades = [], disciplinas = [], onUpdate, isLoading, documentos = [], usuarios = [], planejamentos = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [atividadeParaAplicar, setAtividadeParaAplicar] = useState(null);
  const [showPlanejamentoModal, setShowPlanejamentoModal] = useState(false);
  const [atividadeParaPlanejar, setAtividadeParaPlanejar] = useState(null);

  const handleEdit = (atividade) => {
    setEditingAtividade(atividade);
    setShowForm(true);
  };

  const handleNewActivityClick = (e) => {
    e && e.preventDefault && e.preventDefault();
    setEditingAtividade(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta atividade específica do projeto?")) {
      try {
        await Atividade.delete(id);
        // Remoção otimista imediata
        onUpdate && onUpdate({ __deleteId: id });
        // Refetch leve via parent para sincronizar sem sair da aba
        onUpdate && onUpdate();
      } catch (error) {
        console.error("Erro ao excluir atividade:", error);
        const msg = String(error?.message || '').toLowerCase();
        if (msg.includes('não encontrada') || msg.includes('not found') || msg.includes('404')) {
          // Se já não existe no backend, removemos localmente e atualizamos
          onUpdate && onUpdate({ __deleteId: id });
          onUpdate && onUpdate();
          return;
        }
        alert("Erro ao excluir atividade");
      }
    }
  };

  const handleAplicarADocumentos = (atividade) => {
    setAtividadeParaAplicar(atividade);
    setShowAplicarModal(true);
  };

  const handlePlanejarDiretamente = async (atividade) => {
    try {
      const atividadeComPlanejamento = {
        ...atividade,
        tempo_planejado: Number(atividade.tempo) || 0
      };

      console.log("🎯 Abrindo modal de planejamento para atividade:", atividadeComPlanejamento);

      setAtividadeParaPlanejar(atividadeComPlanejamento);
      setShowPlanejamentoModal(true);
    } catch (error) {
      console.error("Erro ao preparar atividade para planejamento:", error);
      alert("Erro ao preparar atividade para planejamento");
    }
  };

  // The handlePlanejamentoSubmit function has been removed from AtividadesProjetoTab
  // because PlanejamentoAtividadeModal is now responsible for its own submission logic
  // via its internal state and `onSuccess` callback.

  // Apenas atividades criadas especificamente para este projeto via modal "Nova Atividade" (origem === 'projeto')
  const filteredAtividades = useMemo(() => {
    const somenteDoModal = (a) => (
      a?.empreendimento_id === empreendimentoId && a?.origem === 'projeto'
    );

    const base = (atividades || []).filter(somenteDoModal);
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(a =>
      (a.atividade || '').toLowerCase().includes(term) ||
      (a.disciplina || '').toLowerCase().includes(term) ||
      (a.etapa || '').toLowerCase().includes(term)
    );
  }, [atividades, empreendimentoId, searchTerm]);

  if (!empreendimentoId) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Empreendimento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm">
      <AtividadeFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAtividade(null);
        }}
        empreendimentoId={empreendimentoId}
        disciplinas={disciplinas}
        atividade={editingAtividade}
        onSuccess={(savedActivity) => {
          // Atualiza imediatamente e faz um refetch leve para sincronizar
          onUpdate && onUpdate(savedActivity);
          setTimeout(() => { onUpdate && onUpdate(); }, 50);
          setShowForm(false);
          setEditingAtividade(null);
        }}
      />

      <AplicarAtividadeModal
        isOpen={showAplicarModal}
        onClose={() => {
          setShowAplicarModal(false);
          setAtividadeParaAplicar(null);
        }}
        atividade={atividadeParaAplicar}
        documentos={documentos}
        empreendimentoId={empreendimentoId}
        onSave={onUpdate}
      />

      {showPlanejamentoModal && atividadeParaPlanejar && (
        <PlanejamentoAtividadeModal
          isOpen={showPlanejamentoModal}
          onClose={() => {
            console.log("🔄 Fechando modal de planejamento");
            setShowPlanejamentoModal(false);
            setAtividadeParaPlanejar(null);
          }}
          atividades={[atividadeParaPlanejar]}
          usuarios={usuarios}
          empreendimentoId={empreendimentoId}
          documentos={documentos}
          onSuccess={() => {
            console.log("✅ Planejamento realizado com sucesso");
            setShowPlanejamentoModal(false);
            setAtividadeParaPlanejar(null);
            onUpdate();
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Atividades Específicas do Projeto</h3>
          <p className="text-sm text-gray-500">
            Estas atividades estarão disponíveis apenas para este empreendimento.
          </p>
        </div>
        <div className="ml-4">
          <AtividadeFormModal
            showTrigger
            triggerLabel={<><Plus className="w-4 h-4 mr-2" /> Nova Atividade</>}
            triggerClassName="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors shadow"
            empreendimentoId={empreendimentoId}
            disciplinas={disciplinas}
            onSuccess={(savedActivity) => {
              onUpdate && onUpdate(savedActivity);
              setTimeout(() => { onUpdate && onUpdate(); }, 50);
            }}
          />
        </div>
      </div>

      {/* debug indicador removido */}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar atividades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atividade</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Subdisciplina</TableHead>
              <TableHead>Tempo (h)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
              </TableRow>
            ) : filteredAtividades.length > 0 ? (
              filteredAtividades.map(atividade => (
                <TableRow key={atividade.id ?? atividade.id_atividade}>
                  <TableCell className="font-medium">{atividade.atividade}</TableCell>
                  <TableCell>{atividade.etapa}</TableCell>
                  <TableCell>{atividade.disciplina}</TableCell>
                  <TableCell>{atividade.subdisciplina}</TableCell>
                  <TableCell>{atividade.tempo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log("🎯 Clicou no botão Planejar para:", atividade);
                          handlePlanejarDiretamente(atividade);
                        }}
                        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Planejar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAplicarADocumentos(atividade)}
                        className="text-xs"
                      >
                        Aplicar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(atividade)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(atividade.id ?? atividade.id_atividade)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-gray-500">
                    {searchTerm ?
                      "Nenhuma atividade encontrada com os filtros aplicados." :
                      "Nenhuma atividade específica cadastrada para este projeto."
                    }
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

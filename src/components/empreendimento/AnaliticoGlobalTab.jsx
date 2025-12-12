import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Atividade, Disciplina, PlanejamentoAtividade, Documento } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Search, Filter, MoreHorizontal, Edit, Trash2, Loader2, PackageOpen, Lock, Layers, XCircle } from 'lucide-react';
import AtividadeFormModal from './AtividadeFormModal';
import { debounce } from 'lodash';
import { Badge } from '@/components/ui/badge';
import { retryWithBackoff } from '../utils/apiUtils';
import { Checkbox } from "@/components/ui/checkbox";

const EtapaEditModal = ({ isOpen, onClose, atividade, onSave }) => {
  const [newEtapa, setNewEtapa] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const etapas = ['Estudo Preliminar', 'Ante-Projeto', 'Projeto Básico', 'Projeto Executivo', 'Liberado para Obra', 'Concepção', 'Planejamento'];

  useEffect(() => {
    if (isOpen && atividade) {
      setNewEtapa(atividade.etapa || '');
    }
  }, [isOpen, atividade]);

  const handleSave = async () => {
    if (!newEtapa) {
      alert("Por favor, selecione uma etapa.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(newEtapa);
      onClose();
    } catch (error) {
      console.error("Failed to save etapa:", error);
      alert("Erro ao salvar a etapa. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {atividade ? (
          <>
            <DialogHeader>
              <DialogTitle>Editar Etapa da Atividade no Empreendimento</DialogTitle>
              <DialogDescription>
                A etapa será alterada para todas as ocorrências de "{atividade.atividade}" neste empreendimento.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="etapa">Nova Etapa</Label>
                <Select value={newEtapa} onValueChange={setNewEtapa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a nova etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Etapa
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default function AnaliticoGlobalTab({ empreendimentoId, onUpdate }) {
  const [combinedActivities, setCombinedActivities] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', disciplina: 'all', etapa: 'all' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState(null);
  const [isEtapaModalOpen, setIsEtapaModalOpen] = useState(false);

  const [isDeletingActivity, setIsDeletingActivity] = useState({});

  // **NOVO**: Estados para seleção múltipla
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        projectActivities,
        planejamentos,
        allActivities,
        documentos,
        disciplinasData
      ] = await Promise.all([
        retryWithBackoff(() => Atividade.filter({ empreendimento_id: empreendimentoId }), 3, 500, 'fetchProjectActivities'),
        retryWithBackoff(() => PlanejamentoAtividade.filter({ empreendimento_id: empreendimentoId }), 3, 500, 'fetchPlanejamentos'),
        retryWithBackoff(() => Atividade.list(), 3, 500, 'fetchAllActivities'),
        retryWithBackoff(() => Documento.filter({ empreendimento_id: empreendimentoId }), 3, 500, 'fetchDocumentos'),
        retryWithBackoff(() => Disciplina.list(), 3, 500, 'fetchDisciplinas'),
      ]);

      // Torna os documentos globais acessíveis para outros componentes/modais
      window.documentosGlobais = documentos;

      const overrideActivitiesMap = new Map();
      const excludedActivitiesSet = new Set();

      (projectActivities || []).forEach(pa => {
        if (pa.id_atividade) {
          if (pa.tempo === -999) {
            excludedActivitiesSet.add(pa.id_atividade);
          } else {
            overrideActivitiesMap.set(pa.id_atividade, pa);
          }
        }
      });

      const allGenericActivitiesMap = new Map((allActivities || [])
        .filter(a => !a.empreendimento_id)
        .map(a => [a.id, a])
      );

      const planejamentosMap = new Map((planejamentos || []).map(p => [`${p.documento_id}-${p.atividade_id}`, p]));

      const normalizedProjectActivities = (projectActivities || [])
        .filter(pa => !pa.id_atividade && pa.tempo !== -999)
        .map(ativ => ({
          ...ativ,
          uniqueId: `proj-${ativ.id}`,
          source: 'Projeto',
          status: 'N/A',
          isEditable: true,
          base_atividade_id: ativ.id,
        }));

      let documentActivities = [];
      (documentos || []).forEach(doc => {
        const subdisciplinasDoc = doc.subdisciplinas || [];
        const disciplinaDoc = doc.disciplina;
        const fatorDificuldade = doc.fator_dificuldade || 1;

        allGenericActivitiesMap.forEach(baseAtividade => {
          if (excludedActivitiesSet.has(baseAtividade.id)) {
            return;
          }

          const disciplinaMatch = baseAtividade.disciplina === disciplinaDoc;
          const subdisciplinaMatch = subdisciplinasDoc.includes(baseAtividade.subdisciplina);

          if (disciplinaMatch && subdisciplinaMatch) {
            const planKey = `${doc.id}-${baseAtividade.id}`;
            const existingPlan = planejamentosMap.get(planKey);

            const override = overrideActivitiesMap.get(baseAtividade.id);
            const etapaCorreta = override ? override.etapa : baseAtividade.etapa;

            if (existingPlan) {
              documentActivities.push({
                ...baseAtividade,
                id: existingPlan.id,
                uniqueId: `plano-${existingPlan.id}`,
                atividade: existingPlan.descritivo || baseAtividade.atividade,
                tempo: existingPlan.tempo_planejado,
                source: `Folha: ${doc.numero}`,
                status: 'Planejada',
                isEditable: false,
                etapa: existingPlan.etapa || etapaCorreta,
                base_atividade_id: baseAtividade.id,
              });
            } else {
              documentActivities.push({
                ...baseAtividade,
                uniqueId: `avail-${doc.id}-${baseAtividade.id}`,
                id: baseAtividade.id,
                tempo: (baseAtividade.tempo || 0) * fatorDificuldade,
                source: `Folha: ${doc.numero}`,
                status: 'Disponível',
                isEditable: false,
                etapa: etapaCorreta,
                base_atividade_id: baseAtividade.id,
              });
            }
          }
        });
      });

      setCombinedActivities([...normalizedProjectActivities, ...documentActivities]);
      setDisciplinas(disciplinasData || []);

    } catch (error) {
      console.error("Erro ao buscar dados do catálogo:", error);
      setCombinedActivities([]);
      setDisciplinas([]);
    } finally {
      setIsLoading(false);
    }
  }, [empreendimentoId]);

  useEffect(() => {
    if (empreendimentoId) {
      fetchData();
    }
  }, [fetchData, empreendimentoId]);

  const debouncedSetSearch = useCallback(debounce((value) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, 300), []);

  const filteredAtividades = useMemo(() => {
    return combinedActivities.filter(ativ => {
      const searchLower = filters.search.toLowerCase();
      const searchMatch = !filters.search ||
        ativ.atividade?.toLowerCase().includes(searchLower) ||
        ativ.disciplina?.toLowerCase().includes(searchLower) ||
        ativ.subdisciplina?.toLowerCase().includes(searchLower) ||
        ativ.etapa?.toLowerCase().includes(searchLower) ||
        ativ.source?.toLowerCase().includes(searchLower) ||
        ativ.status?.toLowerCase().includes(searchLower);

      const disciplinaMatch = filters.disciplina === 'all' || ativ.disciplina === filters.disciplina;
      const etapaMatch = filters.etapa === 'all' || ativ.etapa === filters.etapa;

      return searchMatch && disciplinaMatch && etapaMatch;
    });
  }, [combinedActivities, filters]);

  const etapasUnicas = useMemo(() => [...new Set(combinedActivities.map(a => a.etapa).filter(Boolean))], [combinedActivities]);

  const handleOpenModal = (atividade = null) => {
    setSelectedAtividade(atividade);
    setIsModalOpen(true);
  };

  const handleOpenEtapaModal = (atividade) => {
    setSelectedAtividade(atividade);
    setIsEtapaModalOpen(true);
  };

  const handleSaveEtapa = async (newEtapa) => {
    if (!selectedAtividade || !selectedAtividade.base_atividade_id) {
      alert("Não foi possível identificar a atividade base para atualização.");
      return;
    }

    try {
      const allPlanejamentos = await retryWithBackoff(() => PlanejamentoAtividade.filter({
        empreendimento_id: empreendimentoId,
        atividade_id: selectedAtividade.base_atividade_id
      }), 3, 500, 'findPlanosForEtapaUpdate');

      if (allPlanejamentos.length === 0) {
        const baseAtividadeArr = await retryWithBackoff(() => Atividade.filter({ id: selectedAtividade.base_atividade_id }), 3, 500, 'findBaseAtividade');

        if (!baseAtividadeArr || baseAtividadeArr.length === 0) {
          throw new Error("Atividade base original não encontrada para criar a nova versão.");
        }

        const atividadeOriginal = baseAtividadeArr[0];

        const existingOverride = await retryWithBackoff(() => Atividade.filter({
          empreendimento_id: empreendimentoId,
          id_atividade: selectedAtividade.base_atividade_id,
          tempo_ne: -999
        }), 3, 500, 'findExistingOverride');

        if (existingOverride && existingOverride.length > 0) {
          await retryWithBackoff(() => Atividade.update(existingOverride[0].id, { etapa: newEtapa }), 3, 500, 'updateAtividadeOverride');
          alert(`A etapa para "${selectedAtividade.atividade}" foi atualizada para "${newEtapa}" para todo este empreendimento.`);
        } else {
          const overrideAtividade = {
            ...atividadeOriginal,
            id_atividade: selectedAtividade.base_atividade_id,
            etapa: newEtapa,
            empreendimento_id: empreendimentoId,
          };
          delete overrideAtividade.id;

          await retryWithBackoff(() => Atividade.create(overrideAtividade), 3, 500, 'createAtividadeOverride');
          alert(`A etapa para "${selectedAtividade.atividade}" foi definida como "${newEtapa}" para todo este empreendimento. Futuros planejamentos e visualizações de atividades "Disponíveis" usarão esta nova etapa.`);
        }

      } else {
        const updatePromises = allPlanejamentos.map(plano =>
          retryWithBackoff(() => PlanejamentoAtividade.update(plano.id, { etapa: newEtapa }), 3, 500, `updateEtapa-${plano.id}`)
        );

        await Promise.all(updatePromises);

        alert(`${allPlanejamentos.length} ocorrência(s) da atividade foram atualizadas para a etapa "${newEtapa}".`);
      }

      fetchData();
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      alert("Ocorreu um erro ao atualizar a etapa da atividade.");
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta atividade do projeto? Atividades de folhas não são afetadas.")) {
      try {
        await retryWithBackoff(() => Atividade.delete(id), 3, 500, 'deleteAtividade');
        fetchData();
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error("Erro ao excluir atividade:", error);
        alert("Não foi possível excluir a atividade.");
      }
    }
  };

  const handleExcluirAtividade = async (atividade) => {
    const genericAtividadeIdToExclude = atividade.base_atividade_id || atividade.id;

    if (!window.confirm(`Tem certeza que deseja excluir a atividade "${atividade.atividade}" de TODAS as ocorrências geradas pelas folhas neste empreendimento? Ela não aparecerá mais como "Disponível" ou "Planejada".`)) {
      return;
    }

    setIsDeletingActivity(prev => ({ ...prev, [genericAtividadeIdToExclude]: true }));

    try {
      console.log(`🗑️ Marcando atividade genérica ${genericAtividadeIdToExclude} como excluída para empreendimento ${empreendimentoId}`);

      const existingMarkers = await retryWithBackoff(
        () => Atividade.filter({
          empreendimento_id: empreendimentoId,
          id_atividade: genericAtividadeIdToExclude,
          tempo: -999
        }),
        3, 500, `checkExistingExclusionMarker-${genericAtividadeIdToExclude}`
      );

      if (existingMarkers && existingMarkers.length > 0) {
        alert("Esta atividade já está marcada como excluída para este empreendimento.");
        setIsDeletingActivity(prev => ({ ...prev, [genericAtividadeIdToExclude]: false }));
        return;
      }

      const atividadeOriginalArr = await retryWithBackoff(
        () => Atividade.filter({ id: genericAtividadeIdToExclude }),
        3, 500, `getOriginalGenericActivity-${genericAtividadeIdToExclude}`
      );

      if (!atividadeOriginalArr || atividadeOriginalArr.length === 0) {
        throw new Error("Atividade genérica original não encontrada.");
      }
      const atividadeOriginal = atividadeOriginalArr[0];

      await retryWithBackoff(
        () => Atividade.create({
          ...atividadeOriginal,
          id: undefined,
          empreendimento_id: empreendimentoId,
          id_atividade: genericAtividadeIdToExclude,
          tempo: -999,
          atividade: `(Excluída) ${atividadeOriginal.atividade}`
        }),
        3, 500, `createExclusionMarker-${genericAtividadeIdToExclude}`
      );

      console.log(`✅ Marcador de exclusão criado com sucesso para atividade genérica ${genericAtividadeIdToExclude}`);

      await fetchData();
      if (onUpdate) onUpdate();

      alert(`Atividade "${atividade.atividade}" foi marcada como excluída para este empreendimento. Ela não aparecerá mais como "Disponível" ou "Planejada".`);

    } catch (error) {
      console.error("Erro ao marcar atividade para exclusão:", error);
      alert("Erro ao marcar atividade para exclusão. Tente novamente: " + error.message);
    } finally {
      setIsDeletingActivity(prev => ({ ...prev, [genericAtividadeIdToExclude]: false }));
    }
  };

  const handleSelectItem = (uniqueId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueId)) {
        newSet.delete(uniqueId);
      } else {
        newSet.add(uniqueId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const projectActivityIds = filteredAtividades
        .filter(ativ => ativ.isEditable)
        .map(ativ => ativ.uniqueId);
      setSelectedIds(new Set(projectActivityIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (!window.confirm(`Tem certeza que deseja excluir ${count} atividade(s) selecionada(s)?`)) {
      return;
    }

    setIsDeletingMultiple(true);

    try {
      const idsArray = Array.from(selectedIds);
      const results = {
        deleted: 0,
        notFound: 0,
        errors: 0
      };

      for (const uniqueId of idsArray) {
        try {
          const atividade = filteredAtividades.find(a => a.uniqueId === uniqueId);
          if (!atividade || !atividade.isEditable) {
            console.warn('Atividade não editável ou não encontrada:', uniqueId);
            continue;
          }

          await retryWithBackoff(() => Atividade.delete(atividade.id), 3, 500, `deleteAtividade-${atividade.id}`);
          results.deleted++;

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          if (error.message?.includes("Object not found") ||
            error.message?.includes("ObjectNotFoundError") ||
            error.response?.status === 404) {
            results.notFound++;
          } else {
            results.errors++;
            console.error('Erro ao excluir atividade:', uniqueId, error);
          }
        }
      }

      setSelectedIds(new Set());
      fetchData();
      if (onUpdate) onUpdate();

      if (results.errors === 0) {
        if (results.notFound > 0) {
          alert(`${results.deleted} atividades foram excluídas. ${results.notFound} já haviam sido excluídas anteriormente.`);
        } else {
          alert(`${results.deleted} atividades foram excluídas com sucesso.`);
        }
      } else {
        alert(`Processo concluído: ${results.deleted} excluídas, ${results.notFound} já excluídas, ${results.errors} erros.`);
      }

    } catch (error) {
      console.error("Erro durante exclusão em lote:", error);
      alert("Ocorreu um erro durante a exclusão em lote.");
    } finally {
      setIsDeletingMultiple(false);
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="ml-4 text-gray-600">Carregando catálogo de atividades...</p>
        </div>
      );
    }

    if (filteredAtividades.length === 0 && !isLoading) {
      return (
        <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
          <PackageOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Catálogo Vazio</h3>
          <p className="text-gray-500 mt-2 mb-6">Nenhuma atividade encontrada para este empreendimento (verificando atividades do projeto e das folhas).</p>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Criar Atividade de Projeto
          </Button>
        </div>
      );
    }

    const editableActivities = filteredAtividades.filter(ativ => ativ.isEditable);

    return (
      <div className="border rounded-lg overflow-hidden bg-white">
        {editableActivities.length > 0 && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Checkbox
                id="selectAll"
                checked={selectedIds.size === editableActivities.length && editableActivities.length > 0}
                onCheckedChange={handleSelectAll}
                disabled={editableActivities.length === 0 || isDeletingMultiple}
              />
              <label htmlFor="selectAll" className="text-sm font-medium text-gray-700 cursor-pointer">
                Selecionar todas as {editableActivities.length} atividades de projeto
              </label>
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeletingMultiple}
              >
                {isDeletingMultiple ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Excluir Selecionadas ({selectedIds.size})
              </Button>
            )}
          </div>
        )}

        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {editableActivities.length > 0 && <TableHead className="w-[50px]"></TableHead>}
              <TableHead>Atividade</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Subdisciplina</TableHead>
              <TableHead>Tempo Padrão</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAtividades.map(ativ => {
              const genericAtividadeIdToExclude = ativ.base_atividade_id || ativ.id;
              const isDeleting = isDeletingActivity[genericAtividadeIdToExclude];

              return (
                <TableRow key={ativ.uniqueId}>
                  {editableActivities.length > 0 && (
                    <TableCell>
                      {ativ.isEditable && (
                        <Checkbox
                          checked={selectedIds.has(ativ.uniqueId)}
                          onCheckedChange={() => handleSelectItem(ativ.uniqueId)}
                          disabled={isDeletingMultiple}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{ativ.atividade}</TableCell>
                  <TableCell>
                    <Badge variant={ativ.source === 'Projeto' ? 'default' : 'secondary'}>
                      {ativ.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      ativ.status === 'Planejada' ? 'success' :
                        ativ.status === 'Disponível' ? 'outline' :
                          'secondary'
                    }>
                      {ativ.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{ativ.etapa}</TableCell>
                  <TableCell>{ativ.disciplina}</TableCell>
                  <TableCell>{ativ.subdisciplina}</TableCell>
                  <TableCell>{ativ.tempo ? `${Number(ativ.tempo).toFixed(1)}h` : '-'}</TableCell>
                  <TableCell>{ativ.funcao}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting || isDeletingMultiple}>
                          {isDeleting || isDeletingMultiple ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="z-[60] bg-white border border-gray-200 shadow-xl rounded-md p-1"
                        align="end"
                        side="bottom"
                      >
                        {ativ.isEditable ? (
                          <>
                            <DropdownMenuItem className="focus:bg-gray-100" onClick={() => handleOpenModal(ativ)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar Atividade
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50" onClick={() => handleDelete(ativ.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir Atividade de Projeto
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem className="focus:bg-gray-100" onClick={() => handleOpenEtapaModal(ativ)}>
                              <Layers className="w-4 h-4 mr-2 text-blue-600" /> Editar Etapa (Empreendimento)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50"
                              onClick={() => handleExcluirAtividade(ativ)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Excluir do Catálogo (Empreendimento)
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Catálogo de Atividades do Empreendimento</h2>
          <p className="text-gray-500">Visualize todas as atividades planejadas e gerencie as atividades específicas do projeto.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Atividade de Projeto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="relative flex-grow min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por descrição, origem, status..."
            className="pl-10"
            onChange={(e) => debouncedSetSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filters.etapa} onValueChange={(value) => setFilters(prev => ({ ...prev, etapa: value }))}>
            <SelectTrigger className="w-auto md:w-48"><SelectValue placeholder="Filtrar por Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Etapas</SelectItem>
              {etapasUnicas.map(etapa => <SelectItem key={etapa} value={etapa}>{etapa}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filters.disciplina} onValueChange={(value) => setFilters(prev => ({ ...prev, disciplina: value }))}>
            <SelectTrigger className="w-auto md:w-48"><SelectValue placeholder="Filtrar por Disciplina" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Disciplinas</SelectItem>
              {disciplinas.map(d => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderContent()}

      {isModalOpen && (
        <AtividadeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          empreendimentoId={empreendimentoId}
          disciplinas={disciplinas}
          atividade={selectedAtividade}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
            if (onUpdate) onUpdate();
          }}
        />
      )}

      {isEtapaModalOpen && selectedAtividade && (
        <EtapaEditModal
          isOpen={isEtapaModalOpen}
          onClose={() => setIsEtapaModalOpen(false)}
          atividade={selectedAtividade}
          onSave={handleSaveEtapa}
        />
      )}
    </div>
  );
}
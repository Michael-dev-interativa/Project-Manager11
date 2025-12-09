import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Search, Filter, Edit, Trash2, CheckCircle, AlertCircle, TrendingUp, Folder, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Atividade, Documento, PlanejamentoAtividade, PlanejamentoDocumento, Execucao, SobraUsuario, Usuario } from "@/entities/all"; // REMOVED Analitico
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityTimerContext } from '../contexts/ActivityTimerContext';
import { delay, retryWithBackoff, debounce, throttle } from '../utils/apiUtils';
import PlanejamentoAtividadeModal from '../empreendimento/PlanejamentoAtividadeModal';
import { DateCalculator } from '../utils/DateCalculator';

import CurvaSPlanejamento from './CurvaSPlanejamento';
import ExecutorSelector from './ExecutorSelector';
import { canStartActivity } from '../utils/PredecessoraValidator';
import { ETAPAS_ORDER } from '../utils/PredecessoraValidator';

const statusColors = {
  nao_iniciado: "bg-gray-100 text-gray-800",
  em_andamento: "bg-blue-100 text-blue-800",
  concluido: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
  pausado: "bg-yellow-100 text-yellow-800"
};

const statusLabels = {
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  atrasado: "Atrasado",
  pausado: "Pausado"
};

export default function PlanejamentoTab({ empreendimentoId }) {
  // Agora usamos PlanejamentoDocumento para planejamento agrupado por documento
  const [planejamentosRaw, setPlanejamentosRaw] = useState([]); // lista bruta de planejamentos por documento
  const [enrichedPlanejamentos, setEnrichedPlanejamentos] = useState([]); // lista "achatada" para filtros e exibição
  const [filteredPlanejamentos, setFilteredPlanejamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [userFilter, setUserFilter] = useState("todos");
  const [allUsers, setAllUsers] = useState([]);
  const [allSobras, setAllSobras] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [erroPlanejamentoDocumento, setErroPlanejamentoDocumento] = useState(null);
  const [planejandoAtividade, setPlanejandoAtividade] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planningError, setPlanningError] = useState(null);
  const { refreshTrigger } = useContext(ActivityTimerContext);

  // Função para enriquecer planejamentos (placeholder, ajuste conforme necessário)
  const enrichPlanejamentos = useCallback(async () => {
    try {
      setIsLoading(true);
      // Busca planejamentos de documentos do backend (usando filter para compatibilidade)
      const planejamentosDoc = await PlanejamentoDocumento.filter({ empreendimento_id: empreendimentoId });
      setPlanejamentosRaw(planejamentosDoc);

      // Enriquecer cada planejamento com dados úteis para exibição
      const documentosIds = [...new Set(planejamentosDoc.map(p => p.documento_id).filter(Boolean))];
      let documentosMap = {};
      if (documentosIds.length > 0) {
        try {
          const documentos = await Documento.filter({ id: { $in: documentosIds } });
          documentosMap = (documentos || []).reduce((acc, doc) => { acc[doc.id] = doc; return acc; }, {});
        } catch { }
      }
      const enriched = await Promise.all(
        planejamentosDoc.map(async (plano) => {
          // Buscar executor principal (objeto)
          let executorPrincipalObj = null;
          if (plano.executor_principal) {
            try {
              const usuarios = await Usuario.list();
              executorPrincipalObj = usuarios.find(u => u.email === plano.executor_principal);
            } catch { }
          }
          // Garantir horas_por_dia como objeto
          let horasPorDia = plano.horas_por_dia;
          if (typeof horasPorDia === 'string') {
            try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = {}; }
          }
          // Garantir subdisciplinas como array
          let subdisciplinas = plano.subdisciplinas;
          if (typeof subdisciplinas === 'string') {
            try { subdisciplinas = JSON.parse(subdisciplinas); } catch { subdisciplinas = subdisciplinas.split(',').map(s => ({ nome: s.trim() })); }
          }
          if (!Array.isArray(subdisciplinas)) subdisciplinas = [];
          return {
            ...plano,
            tipo_planejamento: 'documento',
            executorPrincipalObj,
            tempoExecutado: plano.tempoExecutado || 0,
            horas_por_dia: horasPorDia,
            subdisciplinas,
            documento: documentosMap[plano.documento_id] || null,
          };
        })
      );
      setEnrichedPlanejamentos(enriched);
    } catch (err) {
      setPlanejamentosRaw([]);
      setEnrichedPlanejamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [empreendimentoId]);

  // Agrupa planejamentos por documento/folha
  const planejamentosPorDocumento = useMemo(() => {
    const map = {};
    for (const plano of filteredPlanejamentos) {
      const docId = plano.documento_id || 'sem-doc';
      if (!map[docId]) map[docId] = [];
      map[docId].push(plano);
    }
    return map;
  }, [filteredPlanejamentos]);

  // Função de filtro para planejamentos
  const applyFilters = useCallback(() => {
    let filtered = enrichedPlanejamentos;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(plano =>
        (plano.documentoNumero || "").toLowerCase().includes(searchLower) ||
        (plano.documentoArquivo || "").toLowerCase().includes(searchLower) ||
        (plano.executorPrincipalObj?.nome || "").toLowerCase().includes(searchLower)
      );
    }
    if (statusFilter !== "todos") {
      filtered = filtered.filter(plano => plano.status === statusFilter);
    }
    if (userFilter !== "todos") {
      filtered = filtered.filter(plano => {
        if (Array.isArray(plano.executores)) {
          return plano.executores.includes(userFilter);
        }
        return plano.executores === userFilter;
      });
    }
    setFilteredPlanejamentos(filtered);
  }, [enrichedPlanejamentos, searchTerm, statusFilter, userFilter]);

  useEffect(() => {
    if (empreendimentoId) {
      enrichPlanejamentos();
    }
  }, [empreendimentoId, refreshTrigger, enrichPlanejamentos]);

  useEffect(() => {
    applyFilters();
    setSelectedIds(new Set());
  }, [applyFilters]);

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este planejamento?")) {
      try {
        await PlanejamentoDocumento.delete(id);
        enrichPlanejamentos();
      } catch (error) {
        console.error("Erro ao excluir planejamento:", error);
        if (error.message?.includes("Object not found") ||
          error.message?.includes("ObjectNotFoundError") ||
          error.response?.status === 404) {
          console.warn("Planejamento já foi excluído anteriormente");
          enrichPlanejamentos();
        } else {
          alert("Erro ao excluir planejamento. Tente novamente.");
        }
      }
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedIds(new Set(filteredPlanejamentos.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir os ${count} planejamentos selecionados?`)) {
      try {
        const idsArray = Array.from(selectedIds);
        const results = {
          deleted: 0,
          notFound: 0,
          errors: 0
        };

        console.log('Iniciando exclusão de', idsArray.length, 'planejamentos...');

        for (const id of idsArray) {
          try {
            await PlanejamentoAtividade.delete(id);
            results.deleted++;
            console.log('Planejamento excluído com sucesso:', id);

            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            if (error.message?.includes("Object not found") ||
              error.message?.includes("ObjectNotFoundError") ||
              error.response?.status === 404) {
              results.notFound++;
              console.warn('Planejamento já estava excluído:', id);
            } else if (error.response?.status === 500 &&
              (error.message?.includes("Object not found") || error.response.data?.error?.includes("Object not found"))) {
              results.notFound++;
              console.warn('Planejamento não encontrado (erro 500):', id);
            } else {
              results.errors++;
              console.error('Erro ao excluir planejamento:', id, error);
            }
          }
        }

        console.log(`Exclusão concluída: ${results.deleted} excluídos, ${results.notFound} já estavam excluídos, ${results.errors} erros`);

        setSelectedIds(new Set());
        enrichPlanejamentos();

        if (results.errors === 0) {
          if (results.notFound > 0) {
            alert(`${results.deleted} planejamentos foram excluídos. ${results.notFound} já haviam sido excluídos anteriormente.`);
          } else {
            alert(`${results.deleted} planejamentos foram excluídos com sucesso.`);
          }
        } else {
          alert(`Processo concluído: ${results.deleted} excluídos, ${results.notFound} já excluídos, ${results.errors} erros. Alguns planejamentos podem não ter sido excluídos.`);
        }

      } catch (error) {
        console.error("Erro durante exclusão em lote:", error);

        setSelectedIds(new Set());
        enrichPlanejamentos();

        alert("Ocorreu um erro durante a exclusão em lote. A lista foi atualizada para refletir o estado atual.");
      }
    }
  };

  const calcularSobrasAutomaticamente = async (plano) => {
    try {
      const tempoPlanejado = plano.tempo_planejado || 0;
      const tempoExecutado = plano.tempoExecutado || 0;
      const horasDeSobra = tempoPlanejado - tempoExecutado;
      const executorEmail = plano.executor_principal;

      console.log(`Calculando sobra para ${plano.atividade}: ${tempoPlanejado}h planejado - ${tempoExecutado}h executado = ${horasDeSobra}h sobra`);

      if (horasDeSobra !== 0 && executorEmail) {
        const existingSobra = allSobras.find(s => s.usuario === executorEmail && s.empreendimento_id === empreendimentoId);

        if (existingSobra) {
          const newTotalSobra = (existingSobra.horas_sobra || 0) + horasDeSobra;
          await SobraUsuario.update(existingSobra.id, { horas_sobra: newTotalSobra });
          console.log(`Sobra atualizada para ${executorEmail}: ${existingSobra.horas_sobra} + ${horasDeSobra} = ${newTotalSobra}`);
        } else {
          await SobraUsuario.create({
            usuario: executorEmail,
            empreendimento_id: empreendimentoId,
            horas_sobra: horasDeSobra
          });
          console.log(`Nova sobra criada para ${executorEmail}: ${horasDeSobra}h`);
        }
      }
    } catch (error) {
      console.error("Erro ao calcular sobras automaticamente:", error);
    }
  };

  const handleUpdateStatus = async (plano, newStatus) => {
    try {
      if (newStatus === 'em_andamento') {
        // CORRECTED: Use planejamento ID instead of analitico_id
        const canStart = await canStartActivity(plano.id, empreendimentoId, true); // true indicates it's a planejamento ID
        if (!canStart) {
          alert('Não é possível iniciar esta atividade. Existem predecessoras não concluídas.');
          return;
        }
      }

      await PlanejamentoAtividade.update(plano.id, { status: newStatus });

      if (newStatus === 'concluido') {
        await calcularSobrasAutomaticamente(plano);
      }

      enrichPlanejamentos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);

      if (error.message?.includes("Object not found") || error.message?.includes("ObjectNotFoundError")) {
        alert("Este planejamento não existe mais. A lista será atualizada.");
        enrichPlanejamentos();
      } else {
        alert("Erro ao atualizar status. Tente novamente.");
      }
    }
  };

  // Placeholder for handlePlanActivity - This function would typically open the modal
  // by setting `planejandoAtividade` to the activity object to be planned.
  const handlePlanActivity = useCallback((analiticoObj) => {
    setPlanningError(null); // Clear previous errors
    // analiticoObj should contain at least analitico_id, possibly other default data
    // to pre-fill the modal or identify the activity being planned.
    // This is a placeholder; real logic depends on where this function is called from.
    setPlanejandoAtividade(analiticoObj);
  }, []);


  const handleConfirmPlanejamento = async (formData) => {
    if (!planejandoAtividade) return;

    setIsSubmitting(true);
    setPlanningError(null);

    try {
      // Detecta se é planejamento por documento (modal de documento)
      const isPlanejamentoDocumento = !!formData.isPlanejamentoDocumento;
      // Buscar e-mail do executor principal
      let executorPrincipalEmail = '';
      const executorEmails = formData.executores;
      if (Array.isArray(executorEmails) && executorEmails.length > 0) {
        const allUsuarios = await Usuario.list();
        const exec = allUsuarios.find(u => String(u.id) === String(executorEmails[0]) || u.email === executorEmails[0]);
        if (exec) {
          executorPrincipalEmail = exec.email;
        } else {
          // fallback: tenta buscar pelo nome
          const execByName = allUsuarios.find(u => u.nome === executorEmails[0]);
          executorPrincipalEmail = execByName ? execByName.email : executorEmails[0];
        }
      }

      // Buscar todos os planejamentos do executor (atividade e documento) em todos os empreendimentos
      const [planejamentosAtividade, planejamentosDocumento] = await Promise.all([
        PlanejamentoAtividade.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } }),
        PlanejamentoDocumento.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } })
      ]);

      // Calcular carga já existente do executor para cada dia, somando todas as horas planejadas (atividades e documentos)
      let cargaDiariaAtual = {};
      const todosPlanejamentos = [...planejamentosAtividade, ...planejamentosDocumento];
      todosPlanejamentos.forEach(p => {
        // Considera apenas planejamentos ativos e que tenham horas_por_dia válido
        if (p.status !== 'concluido' && p.horas_por_dia) {
          let horasPorDia = p.horas_por_dia;
          if (typeof horasPorDia === 'string') {
            try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = {}; }
          }
          if (typeof horasPorDia === 'object' && horasPorDia !== null) {
            Object.entries(horasPorDia).forEach(([data, horas]) => {
              // Só soma se o dia está dentro do range do novo planejamento
              if (!formData.startDate || !formData.endDate || (data >= formData.startDate && data <= formData.endDate)) {
                cargaDiariaAtual[data] = (cargaDiariaAtual[data] || 0) + Number(horas);
              }
            });
          }
        }
      });

      if (isPlanejamentoDocumento) {
        // Planejamento por documento: salva apenas em PlanejamentoDocumento
        const atividadesSelecionadas = formData.atividadesSelecionadas || [planejandoAtividade];
        const documentoId = atividadesSelecionadas[0].documento_id;
        const folhaNome = atividadesSelecionadas[0].documentoNome || atividadesSelecionadas[0].documento || '';
        const inicio = formData.startDate;
        const termino = formData.endDate || inicio;
        // Somar as horas planejadas de todas as atividades e coletar nomes
        let totalHoras = 0;
        let etapa = '';
        let descritivo = '';
        const subdisciplinas = [];
        atividadesSelecionadas.forEach(ativ => {
          totalHoras += Number(ativ.tempo_planejado || 0);
          if (!etapa && ativ.etapa) etapa = ativ.etapa;
          if (!descritivo && ativ.descritivo) descritivo = ativ.descritivo;
          if (ativ.descritivo) subdisciplinas.push(ativ.descritivo);
        });

        // Distribuir as horas planejadas entre os dias, respeitando o limite de 8h/dia
        // Usar apenas planejamentos do backend para evitar duplicidade
        const { distribuicao: horas_por_dia } = DateCalculator.distribuirHorasPorDias(
          inicio,
          totalHoras,
          8,
          cargaDiariaAtual,
          true // considerar apenas dias úteis
        );

        const planejamentoConsolidado = {
          documento_id: documentoId,
          documentoNome: folhaNome,
          tempo_planejado: totalHoras,
          etapa,
          descritivo,
          executores: executorEmails,
          executor_principal: executorPrincipalEmail,
          inicio_planejado: inicio,
          termino_planejado: termino,
          status: 'nao_iniciado',
          subdisciplinas,
          horas_por_dia,
        };
        let docPlan = planejamentosRaw.find(p => p.documento_id === documentoId);
        if (docPlan) {
          await PlanejamentoDocumento.update(docPlan.id, planejamentoConsolidado);
        } else {
          await PlanejamentoDocumento.create({
            empreendimento_id: empreendimentoId,
            documento_id: documentoId,
            ...planejamentoConsolidado
          });
        }
      } else {
        // Planejamento individual: salva em PlanejamentoAtividade
        const atividade = planejandoAtividade;
        const inicio = formData.startDate;
        const termino = formData.endDate || inicio;
        const totalHoras = Number(formData.tempo_planejado || atividade?.tempo_planejado || 0);

        // Distribuir as horas planejadas entre os dias, respeitando o limite de 8h/dia
        const { distribuicao: horas_por_dia } = DateCalculator.distribuirHorasPorDias(
          inicio,
          totalHoras,
          8,
          cargaDiariaAtual,
          true // considerar apenas dias úteis
        );

        // Montar o payload para PlanejamentoAtividade
        const planejamentoAtividadePayload = {
          atividade_id: atividade.id,
          empreendimento_id: empreendimentoId,
          descritivo: atividade.descritivo,
          base_descritivo: atividade.base_descritivo,
          etapa: atividade.etapa,
          tempo_planejado: totalHoras,
          executor_principal: executorPrincipalEmail,
          executores: executorEmails,
          status: 'nao_iniciado',
          documento_id: atividade.documento_id || null,
          prioridade: 1,
          inicio_planejado: Object.keys(horas_por_dia)[0],
          termino_planejado: Object.keys(horas_por_dia).slice(-1)[0],
          horas_por_dia,
        };
        await PlanejamentoAtividade.create(planejamentoAtividadePayload);
      }
      enrichPlanejamentos();
      setPlanejandoAtividade(null);
    } catch (error) {
      console.error("Erro ao confirmar planejamento:", error);
      setPlanningError(error.message || "Ocorreu um erro ao planejar a atividade. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Layout agrupado: Pasta > Folha > Subdisciplinas
  function renderPlanejamentoAgrupado() {
    // Exibir apenas planejamentos agrupados por documento
    const planejamentosDocumento = filteredPlanejamentos.filter(p => p.tipo === 'documento');
    return (
      <div className="bg-[#f6f8fa] rounded-xl border border-blue-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-blue-900 text-lg">Empreendimento</span>
        </div>
        <div className="space-y-6">
          {planejamentosDocumento.map((plano) => (
            <div key={plano.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-blue-800">{plano.documentoNumero} - {plano.documentoArquivo}</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <Checkbox
                  checked={selectedIds.has(plano.id)}
                  onCheckedChange={() => handleSelectItem(plano.id)}
                  className="mt-0.5"
                />
                <Badge className={`${statusColors[plano.status]} text-xs`}>{statusLabels[plano.status]}</Badge>
                <span className="text-xs text-gray-500">{plano.etapa}</span>
                <span className="text-xs text-gray-500 font-bold">{plano.tempo_planejado}h planejadas</span>
                <span className="text-xs text-gray-500">{plano.executorPrincipalObj?.nome || (Array.isArray(plano.executores) ? plano.executores[0] : plano.executores)}</span>
                <Button size="xs" variant="ghost" onClick={() => handleDelete(plano.id)} className="text-red-600 hover:bg-red-50 ml-auto">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {/* Exibe subdisciplinas/atividades planejadas */}
              {Array.isArray(plano.subdisciplinas) && plano.subdisciplinas.length > 0 && (
                <div className="mt-3 pl-10">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Subdisciplinas/Atividades:</div>
                  <ul className="list-disc pl-5">
                    {plano.subdisciplinas.map((sub, idx) => (
                      <li key={idx} className="text-xs text-gray-700">{typeof sub === 'string' ? sub : (sub.nome || JSON.stringify(sub))}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderPlanejamentoCard = (plano) => (
    <div key={plano.id} className="flex items-start gap-4 border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
      <Checkbox
        checked={selectedIds.has(plano.id)}
        onCheckedChange={() => handleSelectItem(plano.id)}
        className="mt-1.5"
      />
      <div className="flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900">{plano.atividade}</h4>
              <Badge className={`${statusColors[plano.status]} text-xs`}>
                {statusLabels[plano.status]}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Folha: {plano.documentoNumero} - {plano.documentoArquivo}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {plano.status === 'nao_iniciado' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(plano, 'em_andamento')}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                Iniciar
              </Button>
            )}

            {plano.status === 'em_andamento' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(plano, 'concluido')}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Concluir
              </Button>
            )}

            {/* Example of adding a button to trigger the planning modal for an existing activity (e.g. to modify it)
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePlanActivity(plano)} // You would pass the existing plan data to edit
                className="text-gray-600 hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              */}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(plano.id)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              {plano.inicio_planejado ? format(parseISO(plano.inicio_planejado), 'dd/MM/yyyy', { locale: ptBR }) : 'Não definido'}
              {plano.termino_planejado && ` - ${format(parseISO(plano.termino_planejado), 'dd/MM/yyyy', { locale: ptBR })}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{plano.tempo_planejado}h planejadas</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-blue-600">
            <TrendingUp className="w-4 h-4" />
            <span>{plano.tempoExecutado.toFixed(1)}h realizadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-500" />
            <span>
              {plano.executorPrincipalObj?.nome || plano.executor_principal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}



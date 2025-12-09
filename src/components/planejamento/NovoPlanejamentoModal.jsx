
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlanejamentoAtividade } from "@/entities/all";
import { Calendar as CalendarIcon, Plus, Users, Clock, FileText, Building2, Activity, Repeat, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { distribuirHorasPorDias, getNextWorkingDay, isWorkingDay } from '../utils/DateCalculator';
import { addDays, addWeeks, addMonths, startOfDay } from 'date-fns';
import { agruparAtividadesPorEtapa } from '../utils/AtividadeOrdering';
import { motion } from 'framer-motion';

export default function NovoPlanejamentoModal({
  isOpen,
  onClose,
  empreendimentos = [],
  usuarios,
  atividades = [],
  onSuccess
}) {
  const [formData, setFormData] = useState({
    empreendimento_id: "",
    descritivo: "",
    executores: [],
    executor_principal: "",
    tempo_planejado: "",
    inicio_planejado: "",
    status: "nao_iniciado",
    prioridade: 1
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  
  // Estados para a recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [recorrencia, setRecorrencia] = useState({ tipo: 'semanal', repeticoes: 4 });

  // NOVO: Estados para filtros de atividades
  const [activityFilters, setActivityFilters] = useState({
    search: "",
    disciplina: "all"
  });

  // NOVO: Obter disciplinas únicas das atividades
  const disciplinasUnicas = useMemo(() => {
    const disciplinas = new Set();
    atividades.forEach(ativ => {
      if (ativ.disciplina) disciplinas.add(ativ.disciplina);
    });
    return Array.from(disciplinas).sort();
  }, [atividades]);

  // NOVO: Filtrar atividades baseado nos filtros
  const atividadesFiltradas = useMemo(() => {
    let filtered = [...atividades];
    
    // Filtro por busca de texto
    if (activityFilters.search) {
      const searchTerm = activityFilters.search.toLowerCase();
      filtered = filtered.filter(ativ => 
        ativ.atividade?.toLowerCase().includes(searchTerm) ||
        ativ.disciplina?.toLowerCase().includes(searchTerm) ||
        ativ.subdisciplina?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtro por disciplina
    if (activityFilters.disciplina !== "all") {
      filtered = filtered.filter(ativ => ativ.disciplina === activityFilters.disciplina);
    }
    
    return filtered;
  }, [atividades, activityFilters]);

  const groupedAtividades = useMemo(() => {
    if (!atividadesFiltradas) return {};
    return agruparAtividadesPorEtapa(atividadesFiltradas);
  }, [atividadesFiltradas]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        empreendimento_id: "",
        descritivo: "",
        executores: [],
        executor_principal: "",
        tempo_planejado: "",
        inicio_planejado: "",
        status: "nao_iniciado",
        prioridade: 1
      });
      setSelectedDate(null);
      setSelectedActivityId("");
      setIsRecorrente(false);
      setRecorrencia({ tipo: 'semanal', repeticoes: 4 });
      // NOVO: Resetar filtros ao fechar
      setActivityFilters({ search: "", disciplina: "all" });
    }
  }, [isOpen]);

  const handleActivityChange = (activityId) => {
    setSelectedActivityId(activityId);
    if (activityId) {
      const activity = atividades.find(a => a.id === activityId);
      if (activity) {
        setFormData(prev => ({
          ...prev,
          descritivo: activity.atividade || prev.descritivo,
          tempo_planejado: activity.tempo?.toString() || prev.tempo_planejado,
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        descritivo: "",
        tempo_planejado: "",
      }));
    }
  };

  const handleExecutorChange = (email, isChecked) => {
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        executores: [...prev.executores, email],
        executor_principal: prev.executor_principal || email
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        executores: prev.executores.filter(e => e !== email),
        executor_principal: prev.executor_principal === email ? (prev.executores.find(e => e !== email) || "") : prev.executor_principal
      }));
    }
  };

  const planAndCreateForExecutor = async (executor, isPrincipal, cargaDiariaExistente, dataPartida, descritivo, tempoTotal) => {
    console.log(`[planAndCreateForExecutor] 📅 Planejando para ${executor} a partir de ${format(dataPartida, 'yyyy-MM-dd')}`);
  
    let diaCandidato = new Date(dataPartida);
    let diaDePartidaReal = null;
    let tentativas = 0;
  
    while (tentativas < 365) { // Limita as tentativas para evitar loop infinito
      if (isWorkingDay(diaCandidato)) {
        const diaKey = format(diaCandidato, 'yyyy-MM-dd');
        const cargaDoDia = cargaDiariaExistente[diaKey] || 0;
        // Check if there's at least 0.01 hours available (to account for float precision)
        if (8 - cargaDoDia > 0.01) { 
          diaDePartidaReal = diaCandidato;
          break;
        }
      }
      diaCandidato = addDays(diaCandidato, 1);
      tentativas++;
    }
  
    if (!diaDePartidaReal) {
      diaDePartidaReal = new Date(dataPartida); // Fallback
      console.warn(`[planAndCreateForExecutor] ⚠️ Não foi encontrado dia com disponibilidade para ${executor} a partir de ${format(dataPartida, 'yyyy-MM-dd')}. Usando data de partida original: ${format(diaDePartidaReal, 'yyyy-MM-dd')}`);
    }
    
    console.log(`[planAndCreateForExecutor] ✅ Dia de partida real encontrado para ${executor}: ${format(diaDePartidaReal, 'yyyy-MM-dd')}`);

    const { distribuicao, dataTermino } = distribuirHorasPorDias(diaDePartidaReal, tempoTotal, 8, cargaDiariaExistente);
    
    const inicioPlanejado = Object.keys(distribuicao).sort()[0];
    const terminoPlanejadoStr = dataTermino ? format(dataTermino, 'yyyy-MM-dd') : Object.keys(distribuicao).sort().reverse()[0];
    // No need to convert terminoPlanejadoStr to Date here for return, as dataTermino is already a Date object if successful
    // const terminoPlanejadoDate = new Date(terminoPlanejadoStr + "T12:00:00"); // Add time to prevent timezone issues with date-fns

    const dadosPlanejamento = {
      empreendimento_id: formData.empreendimento_id || null,
      descritivo: `${descritivo}${!isPrincipal && formData.executores.length > 1 ? ` (Executor)`: ''}`,
      executores: [executor],
      executor_principal: executor,
      tempo_planejado: tempoTotal,
      inicio_planejado: inicioPlanejado,
      termino_planejado: terminoPlanejadoStr,
      prioridade: Number(formData.prioridade),
      horas_por_dia: distribuicao,
      analitico_id: null,
      documento_id: null,
      status: "nao_iniciado"
    };
  
    await PlanejamentoAtividade.create(dadosPlanejamento);

    // Update cargaDiariaExistente with the newly planned task's distribution
    Object.entries(distribuicao).forEach(([data, horas]) => {
      cargaDiariaExistente[data] = (cargaDiariaExistente[data] || 0) + Number(horas || 0);
    });

    return dataTermino; // Return Date object for easier date calculations
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descritivo) {
        alert("Por favor, descreva a atividade.");
        return;
    }
    if (!formData.executor_principal) {
      alert("Defina um executor principal.");
      return;
    }
    if (!formData.tempo_planejado || Number(formData.tempo_planejado) <= 0) {
      alert("Defina um tempo planejado válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const tempoTotal = Number(formData.tempo_planejado);
      
      // 1. Fetch all existing workloads for all selected executors ONCE
      const allSelectedExecutors = formData.executores;
      const planejamentosExistentes = await PlanejamentoAtividade.filter({ 
        executor_principal: { '$in': allSelectedExecutors }
      });
      
      // Initialize a mutable global workload object
      const cargaDiariaGeral = {};
      planejamentosExistentes.forEach(p => {
        if (p.horas_por_dia) {
          Object.entries(p.horas_por_dia).forEach(([data, horas]) => {
            cargaDiariaGeral[data] = (cargaDiariaGeral[data] || 0) + Number(horas || 0);
          });
        }
      });
      console.log("[NovoPlanejamentoModal] 📊 Carga diária inicial combinada:", cargaDiariaGeral);

      let proximaDataDePartida = selectedDate ? startOfDay(new Date(selectedDate)) : getNextWorkingDay(new Date());

      const repeticoes = isRecorrente ? Math.max(1, parseInt(recorrencia.repeticoes, 10) || 1) : 1;
      let createdCount = 0;

      for (let i = 0; i < repeticoes; i++) {
        const descritivoDaOcorrencia = isRecorrente 
          ? `${formData.descritivo} (${i + 1}/${repeticoes})`
          : formData.descritivo;

        let ultimoTerminoParaEstaOcorrencia = null;

        if (formData.executores.length > 1) {
          // Múltiplos executores: cada um recebe o tempo total e é planejado individualmente
          for (const executor of formData.executores) {
            const termino = await planAndCreateForExecutor(
              executor, 
              executor === formData.executor_principal, 
              cargaDiariaGeral, // Pass the mutable global workload
              proximaDataDePartida, 
              descritivoDaOcorrencia, 
              tempoTotal
            );
            if (!ultimoTerminoParaEstaOcorrencia || (termino && termino > ultimoTerminoParaEstaOcorrencia)) {
              ultimoTerminoParaEstaOcorrencia = termino;
            }
            createdCount++;
          }
        } else {
          // Executor único
          ultimoTerminoParaEstaOcorrencia = await planAndCreateForExecutor(
            formData.executor_principal, 
            true, 
            cargaDiariaGeral, // Pass the mutable global workload
            proximaDataDePartida, 
            descritivoDaOcorrencia, 
            tempoTotal
          );
          createdCount++;
        }

        // Calculate next start date for recurrence, if applicable
        if (isRecorrente && i < repeticoes - 1 && ultimoTerminoParaEstaOcorrencia) {
            // **CORREÇÃO**: A data de partida da próxima ocorrência é simplesmente
            // o dia seguinte ao término da ocorrência atual. A função `planAndCreateForExecutor`
            // já é responsável por encontrar a primeira data útil com capacidade a partir daí.
            
            let proximoPontoDePartida;
            const ultimoTerminoDate = startOfDay(ultimoTerminoParaEstaOcorrencia);

            switch (recorrencia.tipo) {
                case 'diaria':
                    proximoPontoDePartida = addDays(ultimoTerminoDate, 1);
                    break;
                case 'semanal':
                    proximoPontoDePartida = addWeeks(ultimoTerminoDate, 1);
                    break;
                case 'quinzenal':
                    proximoPontoDePartida = addWeeks(ultimoTerminoDate, 2);
                    break;
                case 'mensal':
                    proximoPontoDePartida = addMonths(ultimoTerminoDate, 1);
                    break;
                default:
                    proximoPontoDePartida = addWeeks(ultimoTerminoDate, 1); // Default to weekly
            }
            
            // Garantir que a próxima data de partida seja um dia útil.
            if (!isWorkingDay(proximoPontoDePartida)) {
                proximaDataDePartida = getNextWorkingDay(proximoPontoDePartida, true); // Passar `true` para incluir a própria data na verificação
            } else {
                proximaDataDePartida = proximoPontoDePartida;
            }

            console.log(`[NovoPlanejamentoModal] ➡️ Próxima data de partida para recorrência: ${format(proximaDataDePartida, 'yyyy-MM-dd')}`);
        }
      }
      
      alert(`${createdCount} planejamento${createdCount > 1 ? 's' : ''} criado${createdCount > 1 ? 's' : ''} com sucesso!`);
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Erro ao criar planejamento:", error);
      alert("Erro ao criar planejamento. Verifique os dados e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Novo Planejamento de Atividade
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
           {/* MELHORADO: Seletor de Atividade Pré-definida com Filtros */}
           <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Atividade Pré-definida (Opcional)
              </Label>
              
              {/* NOVO: Controles de Filtro */}
              <div className="space-y-3 p-3 border rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="w-4 h-4 text-purple-600" />
                  Filtrar Atividades
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar atividade..."
                      value={activityFilters.search}
                      onChange={(e) => setActivityFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10 text-sm"
                    />
                  </div>
                  
                  <Select 
                    value={activityFilters.disciplina} 
                    onValueChange={(value) => setActivityFilters(prev => ({ ...prev, disciplina: value }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Todas as disciplinas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as disciplinas</SelectItem>
                      <Separator className="my-1" />
                      {disciplinasUnicas.map(disc => (
                        <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* NOVO: Contador de resultados */}
                <div className="text-xs text-gray-500 pt-1">
                  {atividadesFiltradas.length} atividade{atividadesFiltradas.length !== 1 ? 's' : ''} encontrada{atividadesFiltradas.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <Select value={selectedActivityId} onValueChange={handleActivityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione para preencher automaticamente" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={null}>Nenhuma (descrever manualmente)</SelectItem>
                  <Separator className="my-1" />
                  {Object.keys(groupedAtividades).length > 0 ? (
                    Object.entries(groupedAtividades).map(([etapa, atividadesDoGrupo]) => (
                      <SelectGroup key={etapa}>
                        <SelectLabel>{etapa} ({atividadesDoGrupo.length})</SelectLabel>
                        {atividadesDoGrupo.map(ativ => (
                          <SelectItem key={ativ.id} value={ativ.id}>
                            <div className="flex flex-col items-start text-left">
                              <span>{ativ.atividade}</span>
                              <span className="text-xs text-gray-500">{ativ.disciplina} {ativ.subdisciplina ? `• ${ativ.subdisciplina}` : ''}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  ) : (
                    <SelectItem value="no-activities" disabled>
                      Nenhuma atividade encontrada com esses filtros
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descrição da Atividade *
            </Label>
            <Input
              value={formData.descritivo}
              onChange={(e) => setFormData(prev => ({ ...prev, descritivo: e.target.value }))}
              placeholder="Ou descreva uma nova atividade aqui"
            />
          </div>
          
          <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empreendimento (Opcional)
              </Label>
              <Select 
                value={formData.empreendimento_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, empreendimento_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {empreendimentos.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome} - {emp.cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Executores *
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {usuarios.map(usuario => (
                <div key={usuario.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`executor-${usuario.id}`}
                    checked={formData.executores.includes(usuario.email)}
                    onChange={(e) => handleExecutorChange(usuario.email, e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`executor-${usuario.id}`} className="flex-1 cursor-pointer">
                    {usuario.nome || usuario.email}
                  </Label>
                  {formData.executor_principal === usuario.email && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">Principal</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {formData.executores.length > 1 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Executor Principal *
              </Label>
              <Select 
                value={formData.executor_principal} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, executor_principal: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o executor principal" />
                </SelectTrigger>
                <SelectContent>
                  {formData.executores.map(email => {
                    const usuario = usuarios.find(u => u.email === email);
                    return (
                      <SelectItem key={email} value={email}>
                        {usuario?.nome || email}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo Planejado (horas) *
            </Label>
            <Input
              type="number"
              step="0.1"
              value={formData.tempo_planejado}
              onChange={(e) => setFormData(prev => ({ ...prev, tempo_planejado: e.target.value }))}
              placeholder="Ex: 8.5"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Data de Início (opcional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500">
              Se não especificada, será usada a próxima data útil disponível.
            </p>
          </div>

           {/* Seção de Recorrência */}
          <div className="space-y-2">
              <div className="flex items-center space-x-2">
                  <input
                      type="checkbox"
                      id="recorrencia-toggle"
                      checked={isRecorrente}
                      onChange={(e) => setIsRecorrente(e.target.checked)}
                      className="rounded"
                  />
                  <Label htmlFor="recorrencia-toggle" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="w-4 h-4" />
                      Criar Atividade Recorrente
                  </Label>
              </div>
          </div>

          {isRecorrente && (
              <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 border rounded-lg bg-gray-50/50 space-y-4"
              >
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="tipo-recorrencia">Frequência</Label>
                          <Select value={recorrencia.tipo} onValueChange={(value) => setRecorrencia(prev => ({...prev, tipo: value}))}>
                              <SelectTrigger id="tipo-recorrencia">
                                  <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="diaria">Diária</SelectItem>
                                  <SelectItem value="semanal">Semanal</SelectItem>
                                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                  <SelectItem value="mensal">Mensal</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="repeticoes-recorrencia">Repetições</Label>
                          <Input
                              id="repeticoes-recorrencia"
                              type="number"
                              min="1"
                              value={recorrencia.repeticoes}
                              onChange={(e) => setRecorrencia(prev => ({...prev, repeticoes: parseInt(e.target.value, 10) || 1 }))}
                              placeholder="Nº de vezes"
                          />
                      </div>
                  </div>
              </motion.div>
          )}

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.descritivo || !formData.executor_principal || !formData.tempo_planejado}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Criando..." : "Criar Planejamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

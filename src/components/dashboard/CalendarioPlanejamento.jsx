import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';

import { DndContext } from "@dnd-kit/core";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks, subWeeks, addDays, subDays, startOfDay, isValid, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityTimerContext } from '../contexts/ActivityTimerContext';
import { useExecucaoModal } from '../contexts/ExecucaoContext';
import { iniciarExecucao } from '../ExecucaoModal';
import PrevisaoEmtregaModal from './PrevisaoEmtregaModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlanejamentoAtividade, Atividade, Documento, Empreendimento, Execucao, PlanejamentoDocumento, Usuario as UsuarioEntity, Disciplina as DisciplinaEntity } from '@/entities/all';
import { isActivityOverdue as isOverdueShared, distribuirHorasPorDias } from '../utils/DateCalculator';
import { retryWithBackoff } from '../utils/apiUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Trash2, RefreshCw, LineChart, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// ...existing code...

// ...existing code...

// Função para converter string de data para Date local corretamente
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  if (typeof dateString === 'string') {
    const parsed = parseISO(dateString);
    if (isValid(parsed)) return parsed;
  }
  return null;
}
// Normaliza status vindos do backend para os usados na UI
const normalizeStatus = (status) => {
  switch (status) {
    case 'finalizado':
      return 'concluido';
    case 'em_execucao':
      return 'em_andamento';
    default:
      return status;
  }
};

function calculateActivityStatus(plano, allPlanejamentos = []) {
  const statusNormalizado = normalizeStatus(plano.status);
  if (plano.isLegacyExecution) {
    return statusNormalizado;
  }

  // **PRIORIDADE 1**: Se está concluída, SEMPRE retorna concluída (não importa se estava atrasada)
  if (statusNormalizado === 'concluido') {
    return 'concluido';
  }

  // **PRIORIDADE 2**: Se está marcada como atrasada manualmente OU automaticamente, retorna atrasado
  if (statusNormalizado === 'atrasado' || isOverdueShared(plano)) {
    return 'atrasado';
  }

  // **PRIORIDADE 3**: Verificar se foi replanejada para INICIAR mais tarde
  let foiReplanejadaParaIniciarMaisTarde = false;
  if (plano.inicio_ajustado && plano.inicio_planejado) {
    try {
      const ajustado = startOfDay(parseISO(plano.inicio_ajustado));
      const planejado = startOfDay(parseISO(plano.inicio_planejado));
      if (isValid(ajustado) && isValid(planejado) && isAfter(ajustado, planejado)) {
        foiReplanejadaParaIniciarMaisTarde = true;
      }
    } catch (e) {
      console.warn("Erro ao parsear datas de início para status de replanejamento:", plano.inicio_ajustado, plano.inicio_planejado, e);
    }
  }

  // Verificar se está em risco por causa de predecessora atrasada
  let predecessoraAtrasada = false;
  if (plano.predecessora_id) {
    const predecessora = allPlanejamentos.find(p => p.id === plano.predecessora_id);
    if (predecessora && isOverdueShared(predecessora)) {
      predecessoraAtrasada = true;
    }
  }

  if (foiReplanejadaParaIniciarMaisTarde || predecessoraAtrasada) {
    return 'impactado_por_atraso';
  }

  // Manter verificação de TÉRMINO para o status amarelo (replanejado_atrasado)
  let wasReplannedLaterTermino = false;
  if (plano.termino_ajustado && plano.termino_planejado) {
    try {
      const ajustado = startOfDay(parseISO(plano.termino_ajustado));
      const planejado = startOfDay(parseISO(plano.termino_planejado));
      if (isValid(ajustado) && isValid(planejado) && isAfter(ajustado, planejado)) {
        wasReplannedLaterTermino = true;
      }
    } catch (e) {
      console.warn("Erro ao parsear datas de término para status de replanejamento:", plano.termino_ajustado, plano.termino_planejado, e);
    }
  }

  if (wasReplannedLaterTermino) {
    return 'replanejado_atrasado';
  }

  // Caso contrário, manter o status original ou 'nao_iniciado'
  return statusNormalizado || 'nao_iniciado';
}


// --- Sub-componente de Filtros ---
const CalendarFilters = ({
  users,
  disciplines,
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onClearFilters,
  hasSelectedUser,
  isColaborador,
  isViewingAllUsers,

}) => {
  // Ordenar usuários por nome
  const usersOrdenados = useMemo(() => {
    return [...(users || [])].sort((a, b) => {
      const nomeA = a.nome || a.email || '';
      const nomeB = b.nome || b.email || '';
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [users]);

  // Considera carregando apenas enquanto a lista de usuários não está disponível
  const isLoading = !users;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-100 bg-gray-50/50">
      <div className="flex flex-wrap items-center gap-4">
        <Filter className="w-5 h-5 text-gray-500" />
        {isLoading ? (
          <span className="text-sm text-gray-400">Carregando filtros...</span>
        ) : (
          <>
            {/* Não mostrar o filtro de usuário para colaborador */}
            {!isColaborador && (
              <Select value={filters.user} onValueChange={(value) => onFilterChange('user', value)}>
                <SelectTrigger className={`w-48 ${!hasSelectedUser && filters.user === '' ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
                  <SelectValue placeholder="⚠️ Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usersOrdenados.map(user => (
                    <SelectItem key={user.id} value={user.email}>{user.nome || user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasSelectedUser && (
              <>
                <Select value={filters.discipline} onValueChange={(value) => onFilterChange('discipline', value)}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="Filtrar por disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {(disciplines || []).map(disc => (
                      <SelectItem key={disc.id} value={disc.nome}>{disc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(filters.discipline !== 'all' || (!isColaborador && filters.user !== '')) && (
                  <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
      {/* Controles de Visualização */}
      {hasSelectedUser && (
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'day' ? 'default' : 'outline'} size="sm" onClick={() => onViewModeChange('day')}>Dia</Button>
          <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => onViewModeChange('week')}>Semana</Button>
          <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => onViewModeChange('month')}>Mês</Button>
        </div>
      )}
    </div>
  );
}
{
};


// --- Sub-componente de Itens de Atividade Individual ---
const ActivityItem = ({ plano, dayKey, onDelete, onUpdate, executorMap, allPlanejamentos, provided, isDragging, isReprogramando, isSelected, onToggleSelect, hasSelections, onStart }) => {
  // Renderização principal do item com handle de arrastar
  // Definir displayName antes do return
  let displayName = '';
  if (plano.tipo_planejamento === 'documento') {
    const numeroFolha = plano.documento?.numero ||
      (plano.descritivo && plano.descritivo.includes(' - ') ? plano.descritivo.split(' - ')[0] : null) ||
      'Número';
    const nomeArquivo = plano.documento?.arquivo ||
      (plano.descritivo && plano.descritivo.includes(' - ') ? plano.descritivo.split(' - ')[1] : null) ||
      'Documento';
    const etapa = plano.etapa || 'Sem Etapa';
    displayName = `${numeroFolha} - ${nomeArquivo} - ${etapa}`;
  } else {
    displayName = plano.atividade?.atividade || plano.descritivo || 'Atividade não identificada';
  }

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      const confirmed = window.confirm('Excluir este planejamento?');
      if (!confirmed) return;
      if (plano.tipo_planejamento === 'documento') {
        await PlanejamentoDocumento.delete(plano.id);
      } else {
        await PlanejamentoAtividade.delete(plano.id);
      }
      if (typeof onDelete === 'function') {
        onDelete(plano.id);
      }
    } catch (err) {
      console.error('Erro ao excluir planejamento:', err);
      alert('Erro ao excluir: ' + (err?.message || 'tente novamente'));
    }
  };

  // Cores para barra de status do item
  const getItemStatusColor = (status) => {
    switch (status) {
      case 'em_andamento': return '#3b82f6';
      case 'pausado': return '#f59e0b';
      case 'concluido': return '#10b981';
      case 'atrasado': return '#ef4444';
      case 'impactado_por_atraso': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const [localStatus, setLocalStatus] = useState(normalizeStatus(plano.status) || 'nao_iniciado');
  const itemStatusColor = getItemStatusColor(localStatus);

  const handleToggleStatus = async (e) => {
    e.stopPropagation();
    const current = localStatus || 'nao_iniciado';
    const next = current === 'nao_iniciado' ? 'em_andamento' : current === 'em_andamento' ? 'concluido' : 'nao_iniciado';
    try {
      if (plano.tipo_planejamento === 'documento') {
        await PlanejamentoDocumento.update(plano.id, { status: next });
      } else {
        await PlanejamentoAtividade.update(plano.id, { status: next });
      }
      setLocalStatus(next);
      plano.status = next;
      if (typeof onUpdate === 'function') onUpdate({ ...plano, status: next });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Não foi possível alterar o status.');
    }
  };

  return (
    <div
      className={`relative bg-white border border-gray-300 shadow-md rounded-lg p-3 pl-6 mb-3 flex flex-col items-stretch w-full max-w-[260px] min-w-[200px]`}
      style={{ fontSize: '15px', boxSizing: 'border-box', opacity: isReprogramando ? 0.5 : 1 }}
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
    >
      {/* Barra lateral para mudança de status */}
      <div
        onClick={handleToggleStatus}
        title="Clique para alternar status (Não iniciado → Em andamento → Concluído)"
        className="absolute left-0 top-0 bottom-0 cursor-pointer"
        style={{ width: '6px', backgroundColor: itemStatusColor, borderTopLeftRadius: '0.5rem', borderBottomLeftRadius: '0.5rem' }}
      />
      {/* Handle de arrastar */}
      <span
        className="absolute left-3 top-2 z-10 cursor-move p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
        title="Arrastar para reordenar"
        style={{ display: 'flex', alignItems: 'center', userSelect: 'none', height: '22px' }}
      >
        <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </span>
      {/* Título da atividade */}
      <div className="flex items-center justify-between mt-2 mb-1">
        <div className="font-semibold text-gray-800 text-sm break-words" style={{ flex: 1 }} title={displayName}>{displayName}</div>
        {/* Horas */}
        <div className="flex items-center gap-2 ml-2">
          <div className="text-blue-700 font-bold text-xs" style={{ minWidth: 38, textAlign: 'right' }}>
            {plano.horas_planejadas ? `${plano.horas_planejadas.toFixed(1)}h` : ''}
          </div>
          <button
            title="Excluir planejamento"
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
            style={{ lineHeight: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m3 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
            </svg>
          </button>
        </div>
      </div>
      {/* Subinfo: horas detalhadas (sempre mostrar planejado vs executado) */}
      <div className="text-xs text-gray-500 mb-1" style={{ textAlign: 'right' }}>
        {(() => {
          const planejadas = typeof plano.horas_planejadas === 'number'
            ? plano.horas_planejadas
            : (typeof plano.tempo_planejado === 'number' ? plano.tempo_planejado : null);

          // executadas: preferir valor da tabela Atividade (plano.atividade.tempo_executado)
          // depois valor do planejamento (tempo_executado)
          // fallback: horas_executadas, tempoExecutado
          let executadas = null;
          // aceitar número ou string numérica
          if (plano?.atividade && plano.atividade.tempo_executado != null) {
            const v = Number(plano.atividade.tempo_executado);
            if (!Number.isNaN(v)) executadas = v;
          }
          if (plano.tempo_executado != null) {
            const v = Number(plano.tempo_executado);
            if (!Number.isNaN(v)) executadas = v;
          } else if (plano.horas_executadas != null) {
            const v = Number(plano.horas_executadas);
            if (!Number.isNaN(v)) executadas = v;
          } else if (plano.tempoExecutado != null) {
            const v = Number(plano.tempoExecutado);
            if (!Number.isNaN(v)) executadas = v;
          }
          // Se ainda vier 0 e existir contador local de segundos no modal (não disponível aqui), manter como 0.0h.
          const execNum = executadas != null ? Number(executadas) : 0;
          const fmt = (v) => {
            const n = Number(v);
            if (Number.isNaN(n)) return '0.0h';
            // Exibir em minutos para <1h e >=1min; em segundos para <1min
            if (n > 0 && n < (1 / 60)) return `${(n * 3600).toFixed(0)}s`;
            if (n < 1) return `${(n * 60).toFixed(1)}min`;
            return `${n.toFixed(1)}h`;
          };
          if (planejadas != null) {
            const plannedTxt = (() => {
              const pn = Number(planejadas);
              if (Number.isNaN(pn)) return '0.0h';
              return pn < 1 ? `${(pn * 60).toFixed(1)}min` : `${pn.toFixed(1)}h`;
            })();
            return `(${fmt(execNum)} / ${plannedTxt})`;
          }
          return `(${fmt(execNum)})`;
        })()}
      </div>
      {/* Executor */}
      <div className="flex items-center text-xs text-gray-700 mb-2">
        <span className="mr-1">
          <svg className="inline w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.657 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </span>
        {executorMap?.[plano.executor_principal]?.nome || plano?.executor?.nome || 'Sem Executor'}
      </div>
      {/* Botão Iniciar */}
      {localStatus === 'nao_iniciado' ? (
        <button
          className={`w-full bg-green-600 hover:bg-green-700 text-white rounded font-semibold py-1 flex items-center justify-center gap-2 text-sm`}
          title="Iniciar atividade"
          onClick={() => {
            if (typeof onStart === 'function') {
              onStart(plano);
            } else {
              alert('Iniciar atividade: ' + displayName);
            }
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
          Iniciar
        </button>
      ) : (
        <div className="w-full bg-gray-100 text-gray-800 rounded font-semibold py-2 px-3 flex items-center justify-between text-sm border border-gray-200">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {localStatus === 'concluido' ? 'Concluída' : 'Em Andamento'}
          </span>
          {(() => {
            const planejadas = typeof plano.horas_planejadas === 'number' ? plano.horas_planejadas : (typeof plano.tempo_planejado === 'number' ? plano.tempo_planejado : null);
            // Prioriza exatamente o valor do banco
            const executadasBanco = (() => {
              // Preferir tempo_executado da tabela Atividade, se disponível
              if (plano?.atividade && plano.atividade.tempo_executado != null) {
                const v = Number(plano.atividade.tempo_executado);
                return Number.isNaN(v) ? null : v;
              }
              if (plano.tempo_executado != null) {
                const v = Number(plano.tempo_executado);
                return Number.isNaN(v) ? null : v;
              }
              return null;
            })();
            const executadasFallback = (
              (() => {
                if (plano.horas_executadas != null) {
                  const v = Number(plano.horas_executadas);
                  return Number.isNaN(v) ? null : v;
                }
                if (plano.tempoExecutado != null) {
                  const v = Number(plano.tempoExecutado);
                  return Number.isNaN(v) ? null : v;
                }
                return null;
              })()
            );
            const executadas = executadasBanco != null ? executadasBanco : (executadasFallback != null ? executadasFallback : 0);
            const fmtExec = (v) => {
              const n = Number(v);
              if (Number.isNaN(n)) return '0.0h';
              if (n > 0 && n < (1 / 60)) return `${(n * 3600).toFixed(0)}s`;
              if (n < 1) return `${(n * 60).toFixed(1)}min`;
              return `${n.toFixed(1)}h`;
            };
            const fmtPlan = (v) => {
              const n = Number(v);
              if (Number.isNaN(n)) return '0.0h';
              return n < 1 ? `${(n * 60).toFixed(1)}min` : `${n.toFixed(1)}h`;
            };
            const texto = planejadas != null ? `${fmtExec(executadas)} / ${fmtPlan(planejadas)}` : `${fmtExec(executadas)}`;
            return <span className="text-xs font-normal text-gray-600">{texto}</span>;
          })()}
        </div>
      )}
    </div>
  )
};

// --- Sub-componente de Grupo de Atividades Diárias ---
const DailyActivityGroup = ({ empreendimento, executor, atividades, isExpanded, onToggle, disciplinas, dayKey, onActivityDelete, onShowPrevisao, executorMap, allPlanejamentos, isReprogramando, canReprogram, selectedActivities, onToggleSelect, hasSelections, groupKey, provided, isDragging, onStart }) => {

  // Novo: Estado local para atividades do grupo
  const [atividadesGrupo, setAtividadesGrupo] = useState(atividades);

  useEffect(() => {
    setAtividadesGrupo(atividades);
  }, [atividades]);

  const totalHoras = useMemo(() => {
    if (!dayKey) return 0;
    let soma = 0;
    atividadesGrupo.forEach((atividade) => {
      if (atividade.horas_por_dia && typeof atividade.horas_por_dia === 'object') {
        const horasDoDia = Number(atividade.horas_por_dia[dayKey]) || 0;
        soma += horasDoDia;
      }
    });
    const totalArredondado = Math.round(soma * 10) / 10;
    return totalArredondado;
  }, [atividadesGrupo, dayKey]);

  const statusCounts = (atividadesGrupo || []).reduce((acc, atividade) => {
    const realStatus = calculateActivityStatus(atividade, allPlanejamentos);
    acc[realStatus] = (acc[realStatus] || 0) + 1;
    return acc;
  }, {});

  const disciplineColors = useMemo(() => {
    const disciplineMap = (disciplinas || []).reduce((acc, d) => {
      acc[d.nome] = d.cor;
      return acc;
    }, {});
    const uniqueDisciplines = [...new Set(atividadesGrupo.map(a => a.atividade?.disciplina).filter(Boolean))];
    return uniqueDisciplines.map(dName => ({
      name: dName,
      color: disciplineMap[dName] || '#A1A1AA'
    }));
  }, [atividadesGrupo, disciplinas]);

  const getGroupStatus = () => {
    if (statusCounts['atrasado'] > 0 || statusCounts['replanejado_atrasado'] > 0) return 'atrasado';
    if (statusCounts['impactado_por_atraso'] > 0) return 'impactado_por_atraso';
    if (statusCounts['em_andamento'] > 0) return 'em_andamento';
    if (atividades.length > 0 && statusCounts['concluido'] === atividades.length) return 'concluido';
    if (statusCounts['pausado'] > 0) return 'pausado';
    return 'nao_iniciado';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'em_andamento': return '#3b82f6';
      case 'pausado': return '#f59e0b';
      case 'concluido': return '#10b981';
      case 'atrasado': return '#ef4444';
      case 'impactado_por_atraso': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const groupStatus = getGroupStatus();
  const statusColor = getStatusColor(groupStatus);

  const empreendimentoNome = empreendimento?.nome || empreendimento?.nome_fantasia || 'Sem Empreendimento';
  // Determina o executor do grupo a partir do planejamento
  // Prioriza objeto de usuário mapeado por e-mail; depois nome direto no plano
  const groupExecutorEmail = (
    executor?.email ||
    (atividadesGrupo.find(p => p?.executor?.email)?.executor?.email) ||
    (atividadesGrupo.find(p => p?.executor_principal)?.executor_principal)
  );
  const groupExecutorByMap = groupExecutorEmail ? executorMap?.[groupExecutorEmail] : null;
  const groupExecutorByName = atividadesGrupo.find(p => p?.executor?.nome)?.executor?.nome || null;
  // Exibe apenas nome; se não houver nome, mostra 'Sem Executor'
  const executorNome = (
    groupExecutorByMap?.nome ||
    groupExecutorByName ||
    'Sem Executor'
  );

  const canDragGroup = canReprogram &&
    empreendimentoNome !== 'Atividades Rápidas' &&
    !atividades.some(a => calculateActivityStatus(a, allPlanejamentos) === 'concluido' || a.isLegacyExecution);

  return (
    <div
      className="mb-1"
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
    >
      <div
        onClick={onToggle}
        style={{
          borderLeft: `6px solid ${statusColor}`,
          backgroundColor: isDragging ? '#e0e7ff' :
            groupStatus === 'atrasado' ? '#fff1f2' :
              groupStatus === 'impactado_por_atraso' ? '#f5f3ff' :
                groupStatus === 'em_andamento' ? '#eff6ff' :
                  groupStatus === 'concluido' ? '#f0fdf4' :
                    groupStatus === 'pausado' ? '#fefce8' : '#f8fafc',
          cursor: 'pointer',
          ...(isDragging && {
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: 'rotate(1deg) scale(1.02)',
            transition: 'all 0.2s ease'
          })
        }}
        className={`p-2 rounded-lg hover:shadow-md transition-shadow duration-200 border ${isDragging ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200'
          }`}
      >
        <div className="flex items-center gap-2">
          {canDragGroup && (
            <div
              {...(provided?.dragHandleProps || {})}
              onClick={(e) => e.stopPropagation()}
              className="cursor-move p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 mr-2"
              title="🖐️ Arrastar todo o grupo"
              style={{ minWidth: '20px', minHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {disciplineColors.map(d => (
                <div
                  key={d.name}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                  title={d.name}
                ></div>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 ml-auto text-purple-500 hover:bg-purple-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowPrevisao(atividades);
                }}
                title="Ver Previsão de Entrega"
              >
                <LineChart className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="font-bold text-xs truncate text-gray-800" title={empreendimentoNome}>
              {empreendimentoNome}
            </p>
            {empreendimentoNome !== 'Atividades Rápidas' && (
              <div className="flex items-center gap-1.5 mt-1  text-gray-600">

                <p className="text-xs font-medium truncate" title={executorNome}>{executorNome}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div
                className="px-1.5 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: statusColor }}
              >
                {totalHoras > 0 ? `${totalHoras.toFixed(1)}h` : '0h'}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{atividades.length} ativ.</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isDragging && (
          <div className="mt-2 flex items-center justify-center gap-2 bg-indigo-100 border-2 border-indigo-300 rounded p-2">
            <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
              {atividades.length}
            </div>
            <span className="text-sm font-bold text-indigo-800">
              Movendo {atividades.length} atividade{atividades.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && !isDragging && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-2"
          >
            {atividadesGrupo.map((atividade, idx) => (
              <ActivityItem
                key={atividade._uniqueKey || atividade.id || idx}
                plano={atividade}
                dayKey={dayKey}
                onDelete={onActivityDelete}
                executorMap={executorMap}
                allPlanejamentos={allPlanejamentos}
                isDragging={false}
                isReprogramando={isReprogramando === atividade.id}
                isSelected={selectedActivities?.has?.(atividade.id)}
                onToggleSelect={onToggleSelect}
                hasSelections={hasSelections}
                onStart={onStart}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-componente para container de atividades (AGRUPAMENTO SIMPLIFICADO POR DIA) ---
const ActivityContainer = ({ activities, containerClass = "", disciplinas, dayKey, ...props }) => {
  // Agrupa planejamentos por documento em um grupo único e atividades em grupos separados
  // Agrupa todos os planejamentos (atividades e documentos) em um único grupo por empreendimento
  const grupos = {};
  activities.forEach((plano) => {
    const empId = plano.empreendimento?.id || plano.empreendimento || 'sem-empreendimento';
    if (!grupos[empId]) {
      grupos[empId] = [];
    }
    grupos[empId].push(plano);
  });

  // Estado de expansão por grupo
  const [expandedGroups, setExpandedGroups] = useState({});

  const handleToggleGroup = (empId) => {
    setExpandedGroups(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  return (
    <div className={`space-y-1 ${containerClass}`}>
      {Object.entries(grupos).map(([empId, planos]) => (
        <DailyActivityGroup
          key={empId + '-' + dayKey}
          empreendimento={planos[0].empreendimento}
          executor={{ email: planos[0].executor_principal }}
          atividades={planos}
          isExpanded={!!expandedGroups[empId]}
          onToggle={() => handleToggleGroup(empId)}
          disciplinas={disciplinas}
          dayKey={dayKey}
          onStart={props.onStart}
          {...props}
        />
      ))}
    </div>
  );
};

// --- Sub-componente para a Visualização Mensal ---
const MonthView = ({ date, activitiesByDay, disciplinas, ...props }) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const monthDays = eachDayOfInterval({ start, end });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekDays.map((wd, idx) => (
          <div key={wd} className="py-2 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 border-t border-l border-gray-200 min-h-[60vh] bg-white">
        {monthDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayActivities = activitiesByDay[dayKey] || [];
          return (
            <div className="border-r border-b border-gray-200 min-h-[100px] relative" key={dayKey}>
              <div className="absolute top-1 left-2 text-xs text-gray-400">{format(day, 'd')}</div>
              <ActivityContainer
                activities={dayActivities}
                containerClass="h-full pt-5"
                disciplinas={disciplinas}
                dayKey={dayKey}
                {...props}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Sub-componente para a Visualização Semanal ---
const WeekView = ({ date, activitiesByDay, disciplinas, ...props }) => {
  const start = startOfWeek(date, { locale: ptBR });
  const end = endOfWeek(date, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start, end });
  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekLabels.map((wd, idx) => (
          <div key={wd} className="py-2 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 border-t border-l border-gray-200 min-h-[60vh] bg-white">
        {weekDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayActivities = activitiesByDay[dayKey] || [];
          return (
            <div className="border-r border-b border-gray-200 min-h-[100px] relative" key={dayKey}>
              <div className="absolute top-1 left-2 text-xs text-gray-400">{format(day, 'd')}</div>
              <ActivityContainer
                activities={dayActivities}
                containerClass="h-full pt-5"
                disciplinas={disciplinas}
                dayKey={dayKey}
                {...props}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Sub-componente para a Visualização Diária ---
const DayView = ({ date, activitiesByDay, disciplinas, ...props }) => {
  const dayKey = format(date, 'yyyy-MM-dd');
  const activities = activitiesByDay[dayKey] || [];
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="py-2 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">{idx === date.getDay() ? 'Hoje' : ''}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 border-t border-l border-gray-200 min-h-[60vh] bg-white">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div className="border-r border-b border-gray-200 min-h-[100px] relative" key={idx}>
            {idx === date.getDay() && (
              <ActivityContainer
                key={dayKey}
                activities={activities}
                containerClass="h-full pt-5"
                disciplinas={disciplinas}
                dayKey={dayKey}
                {...props}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Componente Principal ---
function CalendarioPlanejamento({ usuarios, disciplinas, onRefresh, isDashboardRefreshing }) {
  // Carregar usuários e disciplinas do banco
  const [usuariosDb, setUsuariosDb] = useState([]);
  const [disciplinasDb, setDisciplinasDb] = useState([]);

  useEffect(() => {
    async function fetchUsuariosDisciplinas() {
      try {
        const [usuariosData, disciplinasData] = await Promise.all([
          UsuarioEntity.list(),
          DisciplinaEntity.list()
        ]);
        setUsuariosDb(Array.isArray(usuariosData) ? usuariosData : []);
        setDisciplinasDb(Array.isArray(disciplinasData) ? disciplinasData : []);
      } catch (err) {
        console.error('Erro ao buscar usuários/disciplinas:', err);
        setUsuariosDb([]);
        setDisciplinasDb([]);
      }
    }
    fetchUsuariosDisciplinas();
  }, []);
  const { user } = useContext(ActivityTimerContext);
  const isColaborador = user && user.role === 'user' && user.perfil !== 'coordenador';
  const isCoordenador = user && user.perfil === 'coordenador';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');

  const [filters, setFilters] = useState({
    user: 'all',
    discipline: 'all'
  });

  // NOVO: Estados locais para dados do calendário e loading
  const [planejamentos, setPlanejamentos] = useState([]);
  const [execucoes, setExecucoes] = useState([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState([]);

  const [showPrevisaoModal, setShowPrevisaoModal] = useState(false);
  const [planejamentosParaPrevisao, setPlanejamentosParaPrevisao] = useState([]);
  const [isReprogramando, setIsReprogramando] = useState(null);

  const hasSelectedUser = !!filters.user;
  const isViewingAllUsers = filters.user === 'all';

  const executorMap = useMemo(() => {
    const fonteUsuarios = (Array.isArray(usuarios) && usuarios.length) ? usuarios : usuariosDb;
    return (fonteUsuarios || []).reduce((acc, u) => {
      if (u && u.email) acc[u.email] = u;
      return acc;
    }, {});
  }, [usuarios, usuariosDb]);

  const { triggerUpdate } = useContext(ActivityTimerContext);
  const { setModalExecucao } = useExecucaoModal();

  // **NOVO**: Estado para seleção múltipla
  const [selectedActivities, setSelectedActivities] = useState(new Set());

  // NOVO: Função para carregar dados do calendário sob demanda
  const loadCalendarData = useCallback(async (userFilter) => {
    console.log('[CalendarioPlanejamento] Carregando dados do calendário para usuário:', userFilter);
    // Permitir sempre buscar todos, mesmo se userFilter estiver vazio
    setIsCalendarLoading(true);
    try {

      // Sempre buscar todos os planejamentos de documento, mesmo sem filtro de usuário
      const planFilter = (userFilter && userFilter !== 'all') ? { executor_principal: userFilter } : undefined;
      const execFilter = (userFilter && userFilter !== 'all') ? { usuario: userFilter } : undefined;

      // **CORREÇÃO**: Buscar tanto PlanejamentoAtividade quanto PlanejamentoDocumento
      console.log('Buscando PlanejamentoDocumento com filtro:', planFilter);
      const [planosAtividade, planosDocumento, execs] = await Promise.all([
        retryWithBackoff(() => PlanejamentoAtividade.filter(planFilter), 3, 1500, 'calendar.loadPlansAtividade'),
        retryWithBackoff(() => PlanejamentoDocumento.filter(planFilter), 3, 1500, 'calendar.loadPlansDocumento'),
        retryWithBackoff(() => Execucao.filter(execFilter), 3, 1500, 'calendar.loadExecs')
      ]);
      console.log('[CalendarioPlanejamento] planosDocumento retornados:', planosDocumento);

      // **NOVO**: Combinar os dois tipos de planejamento, adicionando um flag para distinguir
      const planosAtividadeComTipo = (planosAtividade || []).map(p => ({ ...p, tipo_planejamento: 'atividade' }));
      const planosDocumentoComTipo = (planosDocumento || []).map(p => ({ ...p, tipo_planejamento: 'documento' }));
      const todosPlanejamentos = [...planosAtividadeComTipo, ...planosDocumentoComTipo];

      setPlanejamentos(todosPlanejamentos);
      setExecucoes(execs || []);

    } catch (error) {
      console.error("❌ Erro ao carregar dados do calendário:", error);
      setPlanejamentos([]);
      setExecucoes([]);
      alert("Erro ao carregar as atividades do calendário. Tente atualizar a página.");
    } finally {
      // Set loading to false only after enrichment is done, handled in the enrichment useEffect
      // setIsCalendarLoading(false); 
    }
  }, []);

  // NOVO: useEffect para disparar o carregamento de dados quando o filtro de usuário mudar
  useEffect(() => {
    console.log('useEffect disparado', filters.user);
    // Sempre carregar dados, mesmo sem usuário selecionado
    loadCalendarData(filters.user);
  }, [filters.user, hasSelectedUser, loadCalendarData]);

  // NOVO: useEffect para enriquecer os dados quando eles são carregados
  useEffect(() => {
    const enrichData = async () => {
      if (!planejamentos) {
        setEnrichedData([]);
        setIsCalendarLoading(false);
        return;
      }

      if (planejamentos.length === 0) {
        setEnrichedData([]);
        setIsCalendarLoading(false);
        return;
      }

      setIsCalendarLoading(true);
      try {
        const empreendimentoIds = [...new Set(planejamentos.map(p => p.empreendimento_id).filter(Boolean))];
        const atividadeIds = [...new Set(planejamentos.map(p => p.atividade_id).filter(Boolean))];
        const documentoIds = [...new Set(planejamentos.map(p => p.documento_id).filter(Boolean))];

        const [empreendimentosData, atividadesData, documentosData] = await Promise.all([
          empreendimentoIds.length > 0 ? retryWithBackoff(() => Empreendimento.filter({ id: { $in: empreendimentoIds } }), 3, 1000, 'enrich.empreendimentos') : Promise.resolve([]),
          atividadeIds.length > 0 ? retryWithBackoff(() => Atividade.filter({ id: { $in: atividadeIds } }), 3, 1000, 'enrich.atividades') : Promise.resolve([]),
          documentoIds.length > 0 ? retryWithBackoff(() => Documento.filter({ id: { $in: documentoIds } }), 3, 1000, 'enrich.documentos') : Promise.resolve([])
        ]);

        const empreendimentosMap = new Map((empreendimentosData || []).map(item => [item.id, item]));
        const atividadesMap = new Map((atividadesData || []).map(item => [item.id, item]));
        const documentosMap = new Map((documentosData || []).map(item => [item.id, item]));


        const finalData = planejamentos.map(plano => {
          let horasPorDia = plano.horas_por_dia;
          if (typeof horasPorDia === 'string') {
            try {
              horasPorDia = JSON.parse(horasPorDia);
            } catch (e) {
              horasPorDia = {};
            }
          }
          return {
            ...plano,
            horas_por_dia: horasPorDia,
            empreendimento: empreendimentosMap.get(plano.empreendimento_id) || null,
            atividade: atividadesMap.get(plano.atividade_id) || null,
            documento: documentosMap.get(plano.documento_id) || null,
          };
        });


        console.log('[CalendarioPlanejamento] Planejamentos carregados/enriquecidos:', finalData);
        setEnrichedData(finalData);

      } catch (error) {
        console.error("❌ Erro ao enriquecer dados do calendário:", error);
        setEnrichedData(planejamentos);
      } finally {
        setIsCalendarLoading(false);
      }
    };

    enrichData();
  }, [planejamentos]);

  const handleActivityDelete = useCallback(() => {
    if (hasSelectedUser) {
      loadCalendarData(filters.user);
    }
    if (triggerUpdate) {
      triggerUpdate();
    }
  }, [triggerUpdate, hasSelectedUser, filters.user, loadCalendarData]);

  // **NOVO**: Função para alternar seleção de atividade
  const toggleActivitySelection = useCallback((activityId) => {
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  }, []);

  // **NOVO**: Função para limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedActivities(new Set());
  }, []);

  // Iniciar execução via ExecucaoModal util e abrir o modal global
  const handleStart = useCallback(async (plano) => {
    try {
      const atividade = { ...plano, tipo: plano.tipo_planejamento || (plano.documento ? 'documento' : 'atividade') };
      await iniciarExecucao(atividade);
      if (setModalExecucao) setModalExecucao(atividade);
      // Atualiza cartões do calendário imediatamente
      if (typeof triggerUpdate === 'function') {
        triggerUpdate();
      }
      // Recarrega dados do calendário para refletir status/tempo
      loadCalendarData(filters.user);
    } catch (err) {
      console.error('Erro ao iniciar execução:', err);
      alert('Erro ao iniciar: ' + (err?.message || 'tente novamente'));
    }
  }, [setModalExecucao, triggerUpdate, loadCalendarData, filters.user]);

  // **NOVO**: Função para reprogramar atividade
  const handleReprogramarAtividade = useCallback(async (atividadeId, novaDataInicio, executorEmail) => {
    setIsReprogramando(atividadeId);
    try {
      const atividadeParaMover = (enrichedData || []).find(p => p.id === atividadeId);
      if (!atividadeParaMover) {
        throw new Error("Atividade não encontrada para reprogramar.");
      }

      if (atividadeParaMover.isLegacyExecution) {
        throw new Error("Atividades rápidas antigas (não planejadas) não podem ser reprogramadas via arrastar e soltar.");
      }
      if (atividadeParaMover.status === 'concluido') {
        throw new Error("Atividades concluídas não podem ser reprogramadas.");
      }

      // Determinar a entidade correta baseada no tipo de planejamento
      const entidadePlanejamento = atividadeParaMover.tipo_planejamento === 'documento' ? PlanejamentoDocumento : PlanejamentoAtividade;

      // 2. Buscar TODOS os planejamentos do executor para calcular a carga
      // Filtra por executor principal e atividades não concluídas
      const planejamentosDoExecutor = (await retryWithBackoff(() => entidadePlanejamento.filter({ executor_principal: executorEmail }), 3, 1000, `fetchPlansForReprogram`))
        .filter(p => p.status !== 'concluido' && !p.isLegacyExecution);

      // 3. Montar o objeto de carga diária, EXCLUINDO a atividade que está sendo movida
      const cargaDiariaExistente = {};
      planejamentosDoExecutor.forEach(p => {
        if (p.id !== atividadeId && p.horas_por_dia) {
          Object.entries(p.horas_por_dia).forEach(([data, horas]) => {
            cargaDiariaExistente[data] = (cargaDiariaExistente[data] || 0) + Number(horas || 0);
          });
        }
      });

      // 4. Calcular a nova distribuição
      const { distribuicao, dataTermino } = distribuirHorasPorDias(
        parseLocalDate(novaDataInicio),
        atividadeParaMover.tempo_planejado,
        8, // Limite diário de 8h
        cargaDiariaExistente
      );

      if (Object.keys(distribuicao).length === 0) {
        throw new Error("Não foi possível alocar horas para a nova data. Verifique a capacidade do executor ou o tempo planejado da atividade.");
      }

      // 5. Preparar os dados para atualização
      const inicioPlanejado = Object.keys(distribuicao).sort()[0];
      const terminoPlanejado = dataTermino ? format(dataTermino, 'yyyy-MM-dd') : inicioPlanejado;

      const dadosUpdate = {
        inicio_planejado: inicioPlanejado,
        termino_planejado: terminoPlanejado,
        horas_por_dia: distribuicao,
        // Opcional: resetar datas ajustadas se existirem
        inicio_ajustado: null,
        termino_ajustado: null,
      };

      // 6. Atualizar a atividade no banco de dados, usando a entidade correta
      await retryWithBackoff(() => entidadePlanejamento.update(atividadeId, dadosUpdate), 3, 1500, `updateReprogrammedPlan`);

      console.log(`Atividade "${atividadeParaMover.atividade?.atividade || atividadeParaMover.descritivo || atividadeParaMover.documento?.numero_completo}" reprogramada com sucesso!`);

      // 7. Disparar refresh para buscar os dados mais recentes
      if (hasSelectedUser) {
        loadCalendarData(filters.user);
      }
      if (triggerUpdate) {
        triggerUpdate();
      }

    } catch (error) {
      console.error("❌ Erro ao reprogramar atividade:", error);
      alert(`Erro ao reprogramar atividade: ${error.message}`);
      throw error; // Re-throw to allow catch in onDragEnd for bulk operations
    } finally {
      setIsReprogramando(null);
    }
  }, [enrichedData, triggerUpdate, hasSelectedUser, filters.user, loadCalendarData]);

  // **MODIFICADO**: onDragEnd para detectar arraste de dia inteiro
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (user?.perfil !== 'gestao' && user?.role !== 'admin') {
      alert("Você não tem permissão para replanejar atividades.");
      return;
    }

    if (destination.droppableId === source.droppableId) {
      console.log(`Item ${draggableId} movido dentro do mesmo dia. Nenhuma ação de reprogramação.`);
      return;
    }

    // **NOVO**: Detectar se é um arraste de dia inteiro
    const isDayDrag = draggableId.startsWith('day-');

    if (isDayDrag) {
      // **NOVO**: Extrair o dia de origem
      const sourceDayKey = draggableId.replace('day-', '');
      const dayActivities = activitiesByDay[sourceDayKey] || [];

      console.log(`📅 [DIA COMPLETO] Iniciando movimentação do dia ${sourceDayKey} para ${destination.droppableId}`);
      console.log(`📦 Total de atividades no dia: ${dayActivities.length}`);

      // Filtrar apenas atividades que podem ser movidas
      const movableActivities = dayActivities.filter(a => {
        const canMove = !a.isLegacyExecution && a.status !== 'concluido';
        console.log(`   - ${a.descritivo || a.atividade?.atividade || 'Sem nome'}: ${canMove ? '✅ PODE MOVER' : '❌ NÃO PODE'} (isLegacy: ${a.isLegacyExecution}, status: ${a.status})`);
        return canMove;
      });

      console.log(`✅ Atividades que PODEM ser movidas: ${movableActivities.length}`);

      if (movableActivities.length === 0) {
        alert("Nenhuma atividade deste dia pode ser movida (todas estão concluídas ou são execuções antigas).");
        return;
      }

      // Confirmar ação
      const confirmed = window.confirm(
        `Deseja mover todas as ${movableActivities.length} atividade(s) de ${format(parseISO(sourceDayKey), 'd MMM', { locale: ptBR })} para ${format(parseISO(destination.droppableId), 'd MMM', { locale: ptBR })}?`
      );

      if (!confirmed) {
        console.log('❌ Usuário cancelou a operação');
        return;
      }

      // **CORRIGIDO**: Mover atividades em SEQUÊNCIA (não paralelo) para evitar rate limit
      const moveDayActivities = async () => {
        console.log(`🚀 Iniciando movimentação de ${movableActivities.length} atividades...`);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < movableActivities.length; i++) {
          const atividade = movableActivities[i];
          console.log(`\n📍 [${i + 1}/${movableActivities.length}] Movendo: ${atividade.descritivo || atividade.atividade?.atividade || 'Sem nome'}`);

          try {
            await handleReprogramarAtividade(
              atividade.id,
              destination.droppableId,
              atividade.executor_principal
            );
            successCount++;
            console.log(`   ✅ Movida com sucesso!`);

            // Pequeno delay entre atividades para evitar rate limit (500ms)
            if (i < movableActivities.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error) {
            errorCount++;
            console.error(`   ❌ Erro ao mover atividade:`, error);
          }
        }

        console.log(`\n📊 RESULTADO FINAL:`);
        console.log(`   ✅ Sucesso: ${successCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);

        if (successCount > 0) {
          alert(`✅ ${successCount} atividade(s) do dia foram reprogramadas com sucesso!${errorCount > 0 ? `\n⚠️ ${errorCount} falharam (veja o console)` : ''}`);
          clearSelection();
        } else {
          alert(`❌ Nenhuma atividade pôde ser movida. Verifique o console para mais detalhes.`);
        }
      };

      moveDayActivities();
      return;
    }

    // **EXISTENTE**: Detectar se é um grupo sendo arrastado
    const isGroupDrag = draggableId.startsWith('group-');

    if (isGroupDrag) {
      const parts = draggableId.replace('group-', '').split('-');
      const sourceDayKey = parts.pop();
      const groupKey = parts.join('-');

      const allActivitiesInSourceDay = (activitiesByDay[source.droppableId] || []);

      let groupActivities = [];

      if (groupKey.startsWith('virtual-')) {
        const executorEmail = groupKey.replace('virtual-', '');
        groupActivities = allActivitiesInSourceDay.filter(a => a.isLegacyExecution && a.executor_principal === executorEmail);
      } else if (groupKey.startsWith('geral-')) {
        const executorEmail = groupKey.replace('geral-', '');
        groupActivities = allActivitiesInSourceDay.filter(a => !a.empreendimento_id && a.executor_principal === executorEmail && !a.isLegacyExecution);
      } else {
        const [empId, executorEmail] = groupKey.split('|');
        groupActivities = allActivitiesInSourceDay.filter(a =>
          a.empreendimento_id === empId &&
          a.executor_principal === executorEmail &&
          !a.isLegacyExecution
        );
      }

      console.log(`➡️ Movendo grupo com ${groupActivities.length} atividade(s) de ${source.droppableId} para ${destination.droppableId}`);

      const invalidActivities = groupActivities.filter(a =>
        a.isLegacyExecution || a.status === 'concluido'
      );

      if (invalidActivities.length > 0) {
        alert("Algumas atividades do grupo não podem ser reprogramadas (concluídas ou execuções antigas).");
        return;
      }

      const moveGroupActivities = async () => {
        let successCount = 0;
        let errorCount = 0;

        for (const atividade of groupActivities) {
          try {
            await handleReprogramarAtividade(atividade.id, destination.droppableId, atividade.executor_principal);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            errorCount++;
            console.error("Erro ao mover atividade do grupo:", error);
          }
        }

        if (successCount > 0) {
          alert(`✅ ${successCount} atividade(s) do grupo foram reprogramadas!${errorCount > 0 ? `\n⚠️ ${errorCount} falharam` : ''}`);
          clearSelection();
        } else {
          alert(`❌ Erro ao mover atividades do grupo. Verifique o console.`);
        }
      };

      moveGroupActivities();
      return;
    }

    // **EXISTENTE**: Lógica para arrastar atividades individuais ou múltiplas selecionadas
    const activitiesToMove = selectedActivities.has(draggableId) && selectedActivities.size > 1
      ? Array.from(selectedActivities)
      : [draggableId];

    console.log(`➡️ Movendo ${activitiesToMove.length} atividade(s) de ${source.droppableId} para ${destination.droppableId}`);

    const invalidActivities = activitiesToMove.filter(id => {
      const atividade = (enrichedData || []).find(p => p.id === id);
      return !atividade || atividade.isLegacyExecution || atividade.status === 'concluido';
    });

    if (invalidActivities.length > 0) {
      alert("Algumas atividades selecionadas não podem ser reprogramadas (concluídas, execuções antigas, ou não são planejamentos).");
      return;
    }

    const moveActivities = async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const activityId of activitiesToMove) {
        const atividadeMovida = (enrichedData || []).find(p => p.id === activityId);
        if (!atividadeMovida) {
          console.warn(`Atividade ${activityId} não encontrada para mover.`);
          continue;
        }

        try {
          await handleReprogramarAtividade(activityId, destination.droppableId, atividadeMovida.executor_principal);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          errorCount++;
          console.error("Erro ao mover atividade:", error);
        }
      }

      if (successCount > 0) {
        alert(`✅ ${successCount} atividade(s) foram reprogramadas!${errorCount > 0 ? `\n⚠️ ${errorCount} falharam` : ''}`);
        clearSelection();
      } else {
        alert(`❌ Erro ao mover atividades. Verifique o console.`);
      }
    };

    moveActivities();
  };


  // **MODIFICADO**: Filtros agora aplicados sobre o estado local 'planejamentos'
  const filteredPlanejamentos = useMemo(() => {
    if (!hasSelectedUser) return [];

    let basePlanejamentos = enrichedData || []; // Usa o estado local ENRIQUECIDO

    // O filtro de usuário já foi aplicado na busca, então só aplicamos o de disciplina
    if (filters.discipline !== 'all') {
      return basePlanejamentos.filter(item => {
        // Se for um planejamento de documento sem atividade associada, não o filtra por disciplina.
        // Caso contrário, filtra pela disciplina da atividade.
        if (item.tipo_planejamento === 'documento' && item.atividade_id === null) {
          // If a document planning has no associated activity, its subdisciplinas are the primary categorisation.
          // So, if discipline filter is active, we check if any of the document's subdisciplines match.
          if (item.documento?.subdisciplinas && item.documento.subdisciplinas.includes(filters.discipline)) {
            return true;
          }
          return false; // Document plans without matching subdisciplines are filtered out.
        }
        return item.atividade?.disciplina === filters.discipline;
      });
    }

    return basePlanejamentos;
  }, [enrichedData, filters.discipline, hasSelectedUser]);

  const activitiesByDay = useMemo(() => {
    if (!hasSelectedUser) return {};

    const grouped = {};
    const processedPlanIds = new Set(); // Para não duplicar com execuções

    // 1. Processar todos os planejamentos (atividades planejadas, planejamentos de documento e rápidas com planejamento)
    filteredPlanejamentos.forEach(plano => {
      processedPlanIds.add(plano.id);

      if (plano.horas_por_dia && typeof plano.horas_por_dia === 'object') {
        Object.keys(plano.horas_por_dia).forEach(dayKey => {
          const horas = Number(plano.horas_por_dia[dayKey]) || 0;
          // Log para debug
          if (process.env.NODE_ENV !== 'production') {
            console.log('[activitiesByDay] plano.id:', plano.id, '| dayKey:', dayKey, '| horas:', horas, '| horas_por_dia:', plano.horas_por_dia);
          }
          // Só adiciona ao calendário se houver horas planejadas para aquele dia
          if (horas > 0) {
            if (!grouped[dayKey]) {
              grouped[dayKey] = [];
            }
            // Garante unicidade por id+dayKey
            const uniqueKey = `${plano.id}-${dayKey}`;
            if (!grouped[dayKey].some(item => item._uniqueKey === uniqueKey)) {
              const planoParaExibir = {
                ...plano,
                _uniqueKey: uniqueKey, // chave única para o agrupamento
                isQuickActivity: !!plano.is_quick_activity, // New flag for new quick activities
                isLegacyExecution: false, // Explicitly set to false for actual PlanejamentoAtividade
                horas_planejadas_no_dia: horas, // pode ser útil para exibir no card
              };
              grouped[dayKey].push(planoParaExibir);
            }
          }
        });
      }
    });

    // TESTE: Adiciona um card de teste forçado para split, ignorando filtros

    // 2. Processar execuções muito antigas (sem planejamento associado ou não encontradas em planejamentos)

    // Ordenar atividades dentro de cada dia
    for (const dayKey in grouped) {
      grouped[dayKey].sort((a, b) => {
        // Atividades legadas e concluídas por último
        if (a.isLegacyExecution && !b.isLegacyExecution) return 1;
        if (!a.isLegacyExecution && b.isLegacyExecution) return -1;

        const statusA = calculateActivityStatus(a, filteredPlanejamentos);
        const statusB = calculateActivityStatus(b, filteredPlanejamentos);

        if (statusA === 'concluido' && statusB !== 'concluido') return 1;
        if (statusA !== 'concluido' && statusB === 'concluido') return -1;

        if (statusA === 'pausado' && statusB === 'em_andamento') return 1;
        if (statusA === 'em_andamento' && statusB === 'pausado') return -1;

        // Em seguida, pelo horário de início planejado (más cedo primeiro)
        const inicioA = a.inicio_planejado ? parseISO(a.inicio_planejado) : null;
        const inicioB = b.inicio_planejado ? parseISO(b.inicio_planejado) : null;
        if (inicioA && inicioB) {
          if (inicioA.getTime() < inicioB.getTime()) return -1;
          if (inicioA.getTime() > inicioB.getTime()) return 1;
        } else if (inicioA) {
          return -1; // Atividades com data de início vêm antes daquelas sem
        } else if (inicioB) {
          return 1;
        }

        // Finalmente, por nome
        const nameA = a.atividade?.atividade || a.documento?.numero_completo || a.descritivo || '';
        const nameB = b.atividade?.atividade || b.documento?.numero_completo || b.descritivo || '';
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
    }

    return grouped;
  }, [filteredPlanejamentos, execucoes, hasSelectedUser, filters.user, isColaborador, user?.email]);

  const cargaDiariaPorUsuario = useMemo(() => {
    if (!hasSelectedUser) return {};

    const carga = {};
    filteredPlanejamentos.forEach(plano => {
      const userEmail = plano.executor_principal;
      if (!userEmail) return;
      if (!carga[userEmail]) carga[userEmail] = {};

      if (plano.horas_por_dia && typeof plano.horas_por_dia === 'object') {
        Object.entries(plano.horas_por_dia).forEach(([data, horas]) => {
          carga[userEmail][data] = (carga[userEmail][data] || 0) + Number(horas);
        });
      }
    });

    // Adicionar carga de execuções virtuais (legadas)
    (execucoes || []).forEach(exec => {
      // Somente execuções que não estão ligadas a um planejamento existente já considerado
      if (!(exec.planejamento_id && filteredPlanejamentos.some(p => p.id === exec.planejamento_id))) {
        const userEmail = exec.usuario;
        const dayKey = exec.inicio ? format(startOfDay(parseLocalDate(exec.inicio)), 'yyyy-MM-dd') : null;
        if (userEmail && dayKey) {
          if (!carga[userEmail]) carga[userEmail] = {};
          carga[userEmail][dayKey] = (carga[userEmail][dayKey] || 0) + (exec.tempo_total || 0);
        }
      }
    });

    return carga;
  }, [filteredPlanejamentos, execucoes, hasSelectedUser, filters.user, isColaborador, user?.email]);

  // Funções de navegação
  const handleDateChange = (direction) => {
    const changeFn = direction === 'next'
      ? { month: addMonths, week: addWeeks, day: addDays }
      : { month: subMonths, week: subWeeks, day: subDays };

    setCurrentDate(current => changeFn[viewMode](current, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Formatar o título do cabeçalho
  const headerTitle = useMemo(() => {
    switch (viewMode) {
      case 'month': return format(currentDate, 'MMMM yyyy', { locale: ptBR });
      case 'week':
        const start = startOfWeek(currentDate, { locale: ptBR });
        const end = endOfWeek(currentDate, { locale: ptBR });
        return `${format(start, 'd MMM')} - ${format(end, 'd MMM, yyyy', { locale: ptBR })}`;
      case 'day': return format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR });
      default: return '';
    }
  }, [currentDate, viewMode]);

  const handleClearFilters = () => {
    console.log('Limpando filtros...');
    setFilters(prev => ({
      user: isColaborador ? user.email : '',
      discipline: 'all'
    }));
  };

  const handleShowPrevisao = (planos) => {
    setPlanejamentosParaPrevisao(planos);
    setShowPrevisaoModal(true);
  };

  const selectedUserName = isViewingAllUsers
    ? 'Todos os Usuários'
    : executorMap[filters.user]?.nome || filters.user;

  // **MODIFICADO**: Usa o estado de loading do calendário
  const totalLoading = isDashboardRefreshing || isCalendarLoading;

  // **MODIFICADO**: Permissão para replanejamento agora inclui Admin
  const canReprogram = user?.perfil === 'gestao' || user?.role === 'admin';

  // **MODIFICADO**: renderContent para passar props de seleção
  const renderContent = () => {
    if (!hasSelectedUser) {
      return (
        <div className="p-12 text-center min-h-[400px] flex flex-col justify-center items-center">

          <h3 className="text-xl font-semibold text-gray-700 mb-2">Selecione um Usuário</h3>
          <p className="text-gray-500 mb-6">
            Para começar, selecione um usuário no filtro acima para carregar o calendário.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-700 text-sm">
              💡 <strong>Dica:</strong> Para ver as atividades de todos, selecione "Todos os Usuários".
            </p>
          </div>
        </div>
      );
    }

    if (totalLoading) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-lg text-gray-600">Carregando atividades do calendário...</p>
        </div>
      );
    }

    const hasSelections = selectedActivities.size > 0;

    // **MODIFICADO**: Passa 'enrichedData' (que são todos) para as views em vez de 'planejamentos'
    if (viewMode === 'month') return <MonthView date={currentDate} activitiesByDay={activitiesByDay} disciplinas={disciplinas} onActivityDelete={handleActivityDelete} onShowPrevisao={handleShowPrevisao} executorMap={executorMap} allPlanejamentos={enrichedData} isReprogramando={isReprogramando} canReprogram={canReprogram} selectedActivities={selectedActivities} onToggleSelect={toggleActivitySelection} hasSelections={hasSelections} onStart={handleStart} />;
    if (viewMode === 'week') return <WeekView date={currentDate} activitiesByDay={activitiesByDay} disciplinas={disciplinas} onActivityDelete={handleActivityDelete} onShowPrevisao={handleShowPrevisao} executorMap={executorMap} allPlanejamentos={enrichedData} isReprogramando={isReprogramando} canReprogram={canReprogram} selectedActivities={selectedActivities} onToggleSelect={toggleActivitySelection} hasSelections={hasSelections} onStart={handleStart} />;
    if (viewMode === 'day') return <DayView date={currentDate} activitiesByDay={activitiesByDay} disciplinas={disciplinas} onActivityDelete={handleActivityDelete} onShowPrevisao={handleShowPrevisao} executorMap={executorMap} allPlanejamentos={enrichedData} isReprogramando={isReprogramando} canReprogram={canReprogram} selectedActivities={selectedActivities} onToggleSelect={toggleActivitySelection} hasSelections={hasSelections} onStart={handleStart} />;
    return null;
  };

  // **MODIFICADO**: Refresh agora recarrega os dados do calendário se um usuário estiver selecionado
  const refreshAll = () => {
    if (onRefresh) {
      onRefresh();
    }
    if (hasSelectedUser) {
      loadCalendarData(filters.user);
    }
  };

  return (
    <>
      <Card className="bg-white shadow-lg border-0 h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900 capitalize">
              <Calendar className="w-6 h-6 text-blue-600" />
              {hasSelectedUser ? (
                `Calendário - ${selectedUserName} (${filteredPlanejamentos.length})`
              ) : (
                'Calendário de Planejamento'
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* **NOVO**: Mostrar contador e botão de limpar quando há seleções */}
              {selectedActivities.size > 0 && (
                <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-sm font-medium text-indigo-700">
                    {selectedActivities.size} selecionada{selectedActivities.size > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                  >
                    Limpar
                  </Button>
                </div>
              )}
              {hasSelectedUser && (
                <>
                  {(!isColaborador) && (
                    <Button variant="outline" onClick={() => setShowPrevisaoModal(true)}>
                      <LineChart className="w-4 h-4 mr-2" />
                      Previsão de Entrega
                    </Button>
                  )}
                  <Button variant="outline" onClick={refreshAll} disabled={totalLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${totalLoading ? 'animate-spin' : ''}`} />
                    {totalLoading ? "Atualizando..." : "Atualizar"}
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="w-5 h-5" /></Button>
                  <h3 className="text-xl font-semibold w-64 text-center capitalize">{headerTitle}</h3>
                  <Button variant="ghost" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="w-5 h-5" /></Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CalendarFilters
          users={usuariosDb}
          disciplines={disciplinasDb}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFilterChange={(key, value) => {
            setFilters(prev => ({ ...prev, [key]: value }));
          }}
          onClearFilters={handleClearFilters}
          hasSelectedUser={hasSelectedUser}
          isColaborador={isColaborador}
          isViewingAllUsers={isViewingAllUsers}
        />

        <DndContext onDragEnd={onDragEnd}>
          <CardContent className="p-0 flex-1">
            {renderContent()}
          </CardContent>
        </DndContext>
      </Card>

      {hasSelectedUser && (
        <PrevisaoEmtregaModal
          isOpen={showPrevisaoModal}
          onClose={() => setShowPrevisaoModal(false)}
          planejamentos={planejamentosParaPrevisao.length > 0 ? planejamentosParaPrevisao : filteredPlanejamentos}
          execucoes={[]} // execucoes are not relevant for future delivery forecast
          cargaDiaria={planejamentosParaPrevisao.length > 0 && planejamentosParaPrevisao[0].executor_principal ? cargaDiariaPorUsuario[planejamentosParaPrevisao[0].executor_principal] || {} : {}}
        />
      )}
    </>

  );
};
export default CalendarioPlanejamento;

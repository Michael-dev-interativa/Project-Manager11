
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { PlanejamentoAtividade, PlanejamentoDocumento, Documento } from '@/entities/all';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Users, X } from "lucide-react";
import { format, addDays, isValid } from "date-fns";
import { retryWithExtendedBackoff } from '../utils/apiUtils';
import { distribuirHorasPorDias, getNextWorkingDay, isWorkingDay } from '../utils/DateCalculator';
import { ETAPAS_ORDER } from '../utils/PredecessoraValidator';

// Modal centralizado, overlay global, igual PlanejamentoAtividadeModal
export default function PlanejamentoDocumentacaoModal({
  isOpen,
  onClose,
  empreendimentoId,
  documentoId,
  atividades: todasAtividades,
  planejamentos: todosPlanejamentos,
  usuarios,
  onSave,
}) {
  const user = useUser();
  const [selectedEtapas, setSelectedEtapas] = useState([]);
  const [metodoData, setMetodoData] = useState('agenda');
  const [dataInicioManual, setDataInicioManual] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executorPrincipal, setExecutorPrincipal] = useState('');

  const { atividadesAgrupadas, planejamentosExistentesMap } = useMemo(() => {
    const planejamentosMap = new Map();
    (todosPlanejamentos || []).forEach(p => {
      if (p.atividade_id) {
        planejamentosMap.set(p.atividade_id, p);
      }
    });

    const grouped = (todasAtividades || []).reduce((acc, ativ) => {
      const etapa = ativ.etapa || 'Sem Etapa';
      if (!acc[etapa]) {
        acc[etapa] = [];
      }
      acc[etapa].push(ativ);
      return acc;
    }, {});

    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
      const indexA = ETAPAS_ORDER.indexOf(a);
      const indexB = ETAPAS_ORDER.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return {
      atividadesAgrupadas: sortedGroupKeys.map(key => ({
        etapa: key,
        atividades: grouped[key]
      })),
      planejamentosExistentesMap: planejamentosMap,
    };
  }, [todasAtividades, todosPlanejamentos]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedEtapas([]);
        setMetodoData('agenda');
        setDataInicioManual('');
        setIsSubmitting(false);
      }, 150);
    }
  }, [isOpen]);


  // As funções acima referenciavam selectedAtividades, mas agora usamos selectedEtapas
  // Se necessário, adapte a lógica para seleção de etapas

  const handleSubmit = async () => {
    console.log('🟢 Cliquei no botão de planejar!');
    if (!user) {
      alert("Você precisa estar logado para planejar atividades.");
      return;
    }
    if (!executorPrincipal) {
      alert("Selecione um Executor Principal.");
      return;
    }
    if (selectedEtapas.length === 0) {
      alert("Selecione pelo menos uma etapa.");
      return;
    }
    if (metodoData === 'manual' && (!dataInicioManual || !isValid(new Date(dataInicioManual)))) {
      alert("Selecione uma data de início válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🎯 Iniciando planejamento de documentação agrupado...');

      const atividadesParaPlanejar = todasAtividades
        .filter(ativ => selectedEtapas.includes(ativ.etapa));

      if (atividadesParaPlanejar.length === 0) {
        throw new Error('Nenhuma atividade encontrada para as etapas selecionadas.');
      }

      // Soma total de horas das atividades
      const tempo_planejado = atividadesParaPlanejar.reduce((acc, a) => acc + (Number(a.tempo) || 0), 0);
      // Lista de subdisciplinas únicas
      const subdisciplinasUnicas = Array.from(new Set(atividadesParaPlanejar.map(a => a.subdisciplina))).filter(Boolean);
      const subdisciplinas = subdisciplinasUnicas.map((nome, idx) => ({
        id: idx,
        nome,
        etapa: null,
        tempo: null
      }));

      // Datas planejadas (usar lógica simplificada: início = hoje/manual, término = hoje/manual + 1 dia por atividade)
      let inicio_planejado;
      if (metodoData === 'manual') {
        inicio_planejado = dataInicioManual;
      } else {
        const hoje = new Date();
        inicio_planejado = hoje.toISOString().slice(0, 10);
      }
      // Término: soma 1 dia por atividade (ajuste conforme necessário)
      let termino_planejado;
      try {
        const dt = new Date(inicio_planejado);
        dt.setDate(dt.getDate() + atividadesParaPlanejar.length - 1);
        termino_planejado = dt.toISOString().slice(0, 10);
      } catch {
        termino_planejado = inicio_planejado;
      }


      // Buscar e-mail do executor principal se vier como id
      let executorPrincipalEmail = executorPrincipal;
      if (usuarios && executorPrincipal && executorPrincipal !== '' && !executorPrincipal.includes('@')) {
        const found = usuarios.find(u => String(u.id) === String(executorPrincipal));
        if (found) executorPrincipalEmail = found.email;
      }


      // Distribuir as horas planejadas entre os dias do período
      // Buscar todos os planejamentos ativos do executor (atividades e documentos)
      let cargaDiariaAtual = {};
      try {
        const [planejamentosAtividade, planejamentosDocumento] = await Promise.all([
          PlanejamentoAtividade.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } }),
          PlanejamentoDocumento.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } })
        ]);
        const todosPlanejamentos = [...planejamentosAtividade, ...planejamentosDocumento];
        todosPlanejamentos.forEach(p => {
          if (p.horas_por_dia) {
            let horasPorDia = p.horas_por_dia;
            if (typeof horasPorDia === 'string') {
              try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = {}; }
            }
            if (typeof horasPorDia === 'object' && horasPorDia !== null) {
              Object.entries(horasPorDia).forEach(([data, horas]) => {
                cargaDiariaAtual[data] = (cargaDiariaAtual[data] || 0) + Number(horas);
              });
            }
          }
        });
      } catch { }

      // Usar a função global que respeita a carga diária
      const { distribuicao: horas_por_dia } = distribuirHorasPorDias(
        inicio_planejado,
        tempo_planejado,
        8,
        cargaDiariaAtual,
        true // considerar apenas dias úteis
      );

      // Buscar nome do arquivo do documento

      let nomeArquivoDocumento = '';
      try {
        const doc = await Documento.get(documentoId);
        console.log('[DEBUG] Documento.get(documentoId) retornou:', doc);
        if (doc && doc.arquivo) {
          nomeArquivoDocumento = doc.arquivo;
        } else if (doc && doc.numero) {
          nomeArquivoDocumento = doc.numero;
        } else {
          nomeArquivoDocumento = `Documento #${documentoId}`;
        }
      } catch (e) {
        console.warn('Não foi possível buscar o nome do arquivo do documento:', e);
        nomeArquivoDocumento = `Documento #${documentoId}`;
      }

      const payload = {
        documento_id: documentoId,
        empreendimento_id: empreendimentoId,
        etapa: selectedEtapas.join(','),
        executores: [executorPrincipalEmail],
        executor_principal: executorPrincipalEmail,
        subdisciplinas,
        tempo_planejado,
        inicio_planejado,
        termino_planejado,
        horas_por_dia: JSON.stringify(horas_por_dia),
        status: 'nao_iniciado',
        arquivo: nomeArquivoDocumento
      };
      // Remove qualquer campo 'descritivo' do payload, caso exista
      if ('descritivo' in payload) delete payload.descritivo;

      console.log('📤 Payload enviado para PlanejamentoDocumento.create:', payload);
      try {
        const result = await retryWithExtendedBackoff(() => PlanejamentoDocumento.create(payload));
        console.log('✅ Resposta do PlanejamentoDocumento.create:', result);
        alert(`✅ Planejamento agrupado salvo para o documento!\nTotal de horas: ${tempo_planejado.toFixed(1)}h`);
        onSave();
        setTimeout(() => {
          onClose();
        }, 100);
      } catch (err) {
        let msg = 'Erro desconhecido ao criar planejamento.';
        if (err) {
          if (typeof err === 'string') msg = err;
          else if (err.message) msg = err.message;
          else if (err.details) msg = err.details;
          else if (err.error) msg = err.error;
          else msg = JSON.stringify(err);
        }
        console.error('❌ Erro detalhado do PlanejamentoDocumento.create:', err);
        alert(`Erro ao criar planejamento: ${msg}`);
        throw err;
      }
    } catch (error) {
      let msg = 'Erro desconhecido ao planejar atividades.';
      if (error) {
        if (typeof error === 'string') msg = error;
        else if (error.message) msg = error.message;
        else if (error.details) msg = error.details;
        else if (error.error) msg = error.error;
        else msg = JSON.stringify(error);
      }
      console.error('❌ Erro ao planejar atividades de documentação:', error);
      alert(`Erro ao planejar atividades: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHorasSelecionadas = useMemo(() => {
    let total = 0;
    todasAtividades.forEach(ativ => {
      if (selectedEtapas.includes(ativ.etapa)) {
        total += Number(ativ.tempo) || 0;
      }
    });
    return Number(total) || 0;
  }, [selectedEtapas, todasAtividades]);

  // Calcular horas_por_dia para exibição (usando a função global e carga real do executor)
  const atividadesParaPlanejar = todasAtividades.filter(ativ => selectedEtapas.includes(ativ.etapa));
  const tempo_planejado = atividadesParaPlanejar.reduce((acc, a) => acc + (Number(a.tempo) || 0), 0);
  let inicio_planejado;
  if (metodoData === 'manual' && dataInicioManual) {
    inicio_planejado = dataInicioManual;
  } else {
    const hoje = new Date();
    inicio_planejado = hoje.toISOString().slice(0, 10);
  }
  // Buscar carga real do executor para exibição
  const [horasPorDiaExibicao, setHorasPorDiaExibicao] = useState({});
  useEffect(() => {
    let isMounted = true;
    async function calcularHorasPorDiaExibicao() {
      let cargaDiariaAtual = {};
      let executorPrincipalEmail = executorPrincipal;
      if (usuarios && executorPrincipal && executorPrincipal !== '' && !executorPrincipal.includes('@')) {
        const found = usuarios.find(u => String(u.id) === String(executorPrincipal));
        if (found) executorPrincipalEmail = found.email;
      }
      try {
        const [planejamentosAtividade, planejamentosDocumento] = await Promise.all([
          PlanejamentoAtividade.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } }),
          PlanejamentoDocumento.filter({ executor_principal: executorPrincipalEmail, status: { $ne: 'concluido' } })
        ]);
        const todosPlanejamentos = [...planejamentosAtividade, ...planejamentosDocumento];
        todosPlanejamentos.forEach(p => {
          if (p.horas_por_dia) {
            let horasPorDia = p.horas_por_dia;
            if (typeof horasPorDia === 'string') {
              try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = {}; }
            }
            if (typeof horasPorDia === 'object' && horasPorDia !== null) {
              Object.entries(horasPorDia).forEach(([data, horas]) => {
                cargaDiariaAtual[data] = (cargaDiariaAtual[data] || 0) + Number(horas);
              });
            }
          }
        });
      } catch { }
      const { distribuicao: horas_por_dia } = distribuirHorasPorDias(
        inicio_planejado,
        tempo_planejado,
        8,
        cargaDiariaAtual,
        true
      );
      if (isMounted) setHorasPorDiaExibicao(horas_por_dia);
    }
    if (executorPrincipal && tempo_planejado > 0 && inicio_planejado) {
      calcularHorasPorDiaExibicao();
    } else {
      setHorasPorDiaExibicao({});
    }
    return () => { isMounted = false; };
  }, [executorPrincipal, tempo_planejado, inicio_planejado, usuarios, selectedEtapas, metodoData, dataInicioManual]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="dialog-overlay" />
        <DialogContent className="dialog-content">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Planejamento por Documento{documentoId ? ` - ${documentoId}` : ''}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            <div className="space-y-4 py-4 overflow-y-auto max-h-[65vh]">
              {/* Cabeçalho do documento */}
              <div className="p-3 rounded bg-blue-50 border border-blue-200 mb-2">
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {documentoId}
                </div>
                <div className="mt-2 text-sm text-blue-900">
                  <b>Total planejado:</b> {tempo_planejado}h
                  {tempo_planejado > 0 && (
                    <>
                      <br />
                      <b>Alocação por dia:</b>
                      <ul className="ml-4 mt-1 list-disc">
                        {Object.entries(horasPorDiaExibicao).map(([data, horas]) => (
                          <li key={data}>{data}: {horas}h</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              {/* Método de cálculo da data */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="font-semibold">Método de Cálculo da Data de Início</Label>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="metodo_data"
                      value="agenda"
                      checked={metodoData === 'agenda'}
                      onChange={() => setMetodoData('agenda')}
                    />
                    Agenda do Executor
                    <span className="text-xs text-gray-500 ml-2">Calcula a data de início com base na última tarefa planejada do executor selecionado, para evitar sobrecarga.</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="metodo_data"
                      value="manual"
                      checked={metodoData === 'manual'}
                      onChange={() => setMetodoData('manual')}
                    />
                    Data Manual
                  </label>
                  {metodoData === 'manual' && (
                    <div className="mt-2">
                      <Label>Data de Início</Label>
                      <Input
                        type="date"
                        value={dataInicioManual}
                        onChange={e => setDataInicioManual(e.target.value)}
                      />
                      {dataInicioManual && (
                        <div className="mt-1 text-xs text-blue-700">Data de Início Selecionada: {format(new Date(dataInicioManual), 'dd/MM/yyyy')}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Executor principal */}
              <div className="mb-4">
                <Label>Executor Principal</Label>
                <Select value={executorPrincipal} onValueChange={setExecutorPrincipal}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o executor principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios && usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Lista de etapas para seleção */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Selecione as Etapas:</Label>
                  <span className="text-xs text-gray-500">{atividadesAgrupadas.length} etapas disponíveis</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-4 bg-gray-50">
                  {atividadesAgrupadas.map(({ etapa, atividades }) => (
                    <div key={etapa} className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          checked={selectedEtapas.includes(etapa)}
                          onCheckedChange={() => {
                            setSelectedEtapas(prev => prev.includes(etapa)
                              ? prev.filter(e => e !== etapa)
                              : [...prev, etapa]);
                          }}
                        />
                        <span className="font-semibold">{etapa}</span>
                        <span className="text-xs text-gray-500">{atividades.length} atividade(s) • {atividades.reduce((acc, a) => acc + (Number(a.tempo) || 0), 0)}h total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} type="button">Fechar</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                variant="default"
                type="submit"
                aria-label="Cadastrar atividades de documentação"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

import { PlanejamentoAtividade } from '@/entities/PlanejamentoAtividade';
import { format, addDays, parseISO, isWeekend } from 'date-fns';
import { retryWithBackoff } from './apiUtils';

const getProximoDiaUtil = (dataInicial) => {
  let proximaData = addDays(new Date(dataInicial), 1);
  while (isWeekend(proximaData)) {
    proximaData = addDays(proximaData, 1);
  }
  return proximaData;
};

const verificarCargaUsuario = (planejamentos, usuarioEmail, data, maxHorasDia = 8) => {
  if (!Array.isArray(planejamentos)) return { cargaAtual: 0, espacoDisponivel: maxHorasDia };
  
  const dataFormatada = format(new Date(data), 'yyyy-MM-dd');
  const cargaAtual = planejamentos
    .filter(p => p.executor_principal === usuarioEmail && p.horas_por_dia && p.horas_por_dia[dataFormatada])
    .reduce((total, plano) => total + (Number(plano.horas_por_dia[dataFormatada]) || 0), 0);
  return { cargaAtual, espacoDisponivel: Math.max(0, maxHorasDia - cargaAtual) };
};

// Nova função para processar a fila de reagendamento
async function processarFilaDeReagendamento(fila, todosOsPlanejamentos, onProgress) {
  if (!Array.isArray(fila) || !Array.isArray(todosOsPlanejamentos)) {
    return { reagendadas: 0, erros: ['Dados inválidos para processamento'] };
  }

  let reagendadas = 0;
  const erros = [];
  const MAX_TENTATIVAS_DIA = 30;

  while (fila.length > 0) {
    const { atividade, horasParaMover, dataOriginal } = fila.shift();
    if (!atividade || !horasParaMover || !dataOriginal) {
      erros.push('Dados de atividade inválidos encontrados');
      continue;
    }

    let horasRestantes = horasParaMover;
    let proximoDia = getProximoDiaUtil(dataOriginal);
    let tentativas = 0;

    while (horasRestantes > 0 && tentativas < MAX_TENTATIVAS_DIA) {
      const { espacoDisponivel } = verificarCargaUsuario(todosOsPlanejamentos, atividade.executor_principal, proximoDia);

      if (espacoDisponivel > 0) {
        const horasAlocadas = Math.min(horasRestantes, espacoDisponivel);
        const dataFormatada = format(proximoDia, 'yyyy-MM-dd');

        const novasHorasPorDia = { ...(atividade.horas_por_dia || {}) };
        novasHorasPorDia[dataFormatada] = (novasHorasPorDia[dataFormatada] || 0) + horasAlocadas;
        
        atividade.horas_por_dia = novasHorasPorDia;
        horasRestantes -= horasAlocadas;
      }
      
      if (horasRestantes <= 0) {
        break;
      }
      
      proximoDia = getProximoDiaUtil(proximoDia);
      tentativas++;
    }
    
    if (horasRestantes > 0) {
        erros.push(`Não foi possível realocar todas as horas para a atividade: ${atividade.descritivo || atividade.id}`);
    } else {
        try {
          await retryWithBackoff(() => 
              PlanejamentoAtividade.update(atividade.id, { horas_por_dia: atividade.horas_por_dia }),
              2, 500, `update.reagendamento.${atividade.id}`
          );
          reagendadas++;
          if (onProgress) onProgress(`Atividade '${atividade.descritivo}' reagendada.`);
        } catch (error) {
          erros.push(`Erro ao atualizar atividade ${atividade.id}: ${error.message}`);
        }
    }
  }

  return { reagendadas, erros };
}

export const iniciarReagendamento = async (onProgress) => {
  try {
    if (onProgress) onProgress("Carregando planejamentos...");
    const todosOsPlanejamentos = await retryWithBackoff(() => PlanejamentoAtividade.list(null, 5000), 3, 1000);
    
    if (!Array.isArray(todosOsPlanejamentos)) {
      return { status: 'complete', data: { reagendadas: 0, erros: ['Erro ao carregar planejamentos'] } };
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ontem = addDays(hoje, -1);
    const ontemFormatado = format(ontem, 'yyyy-MM-dd');

    if (onProgress) onProgress("Identificando atividades atrasadas...");
    const atividadesAtrasadas = todosOsPlanejamentos
      .filter(plano => plano && plano.status !== 'concluido' && plano.horas_por_dia && plano.horas_por_dia[ontemFormatado] > 0)
      .sort((a, b) => (b.prioridade || 1) - (a.prioridade || 1));

    if (atividadesAtrasadas.length === 0) {
      if (onProgress) onProgress("Nenhuma atividade atrasada encontrada.");
      return { status: 'complete', data: { reagendadas: 0, erros: [] } };
    }

    for (const atividade of atividadesAtrasadas) {
      const horasParaMover = atividade.horas_por_dia[ontemFormatado];
      const proximoDia = getProximoDiaUtil(ontem);
      const { espacoDisponivel } = verificarCargaUsuario(todosOsPlanejamentos, atividade.executor_principal, proximoDia);

      if (espacoDisponivel < horasParaMover) {
        if (onProgress) onProgress(`Conflito detectado para '${atividade.descritivo}'`);
        const dataConflito = format(proximoDia, 'yyyy-MM-dd');
        const conflictingTasks = todosOsPlanejamentos.filter(p => 
          p && p.executor_principal === atividade.executor_principal &&
          p.horas_por_dia && p.horas_por_dia[dataConflito] > 0
        );
        return {
          status: 'conflict',
          data: { overdueTask: atividade, conflictingTasks, targetDate: proximoDia }
        };
      }
    }

    if (onProgress) onProgress("Reagendando atividades sem conflitos...");
    const fila = atividadesAtrasadas
      .filter(at => at && at.horas_por_dia && at.horas_por_dia[ontemFormatado])
      .map(at => ({
        atividade: at,
        horasParaMover: at.horas_por_dia[ontemFormatado],
        dataOriginal: ontem
      }));
    
    // Limpar as horas de ontem das atividades
    for(const item of fila) {
        if (item.atividade && item.atividade.horas_por_dia) {
          delete item.atividade.horas_por_dia[ontemFormatado];
        }
    }

    const resultadoFinal = await processarFilaDeReagendamento(fila, todosOsPlanejamentos, onProgress);
    return { status: 'complete', data: resultadoFinal };
    
  } catch (error) {
    console.error("Erro no reagendamento:", error);
    return { status: 'complete', data: { reagendadas: 0, erros: [error.message || 'Erro desconhecido'] } };
  }
};

export const resolverConflitoDeReagendamento = async (overdueTask, tasksToBump, targetDate, onProgress) => {
  try {
    if (onProgress) onProgress("Aplicando resolução de conflito...");
    const todosOsPlanejamentos = await retryWithBackoff(() => PlanejamentoAtividade.list(null, 5000), 3, 1000);

    if (!Array.isArray(todosOsPlanejamentos) || !overdueTask || !Array.isArray(tasksToBump)) {
      return { status: 'complete', data: { reagendadas: 0, erros: ['Dados inválidos para resolver conflito'] } };
    }

    const ontem = addDays(targetDate, -1);
    const ontemFormatado = format(ontem, 'yyyy-MM-dd');
    const targetDateFormatado = format(targetDate, 'yyyy-MM-dd');
    
    const horasParaMover = overdueTask.horas_por_dia?.[ontemFormatado] || 0;
    
    // 1. Limpar horas das tarefas adiadas no dia do conflito
    const filaReagendamento = [];
    for (const task of tasksToBump) {
      if (task && task.horas_por_dia && task.horas_por_dia[targetDateFormatado]) {
        const horasAdiadas = task.horas_por_dia[targetDateFormatado];
        delete task.horas_por_dia[targetDateFormatado];
        filaReagendamento.push({ atividade: task, horasParaMover: horasAdiadas, dataOriginal: targetDate });
      }
    }
    
    // 2. Alocar a tarefa atrasada no espaço liberado
    if (overdueTask.horas_por_dia) {
      delete overdueTask.horas_por_dia[ontemFormatado];
      overdueTask.horas_por_dia[targetDateFormatado] = (overdueTask.horas_por_dia[targetDateFormatado] || 0) + horasParaMover;
    }
    
    // 3. Atualizar todas as tarefas modificadas no banco
    const tasksToUpdate = [overdueTask, ...tasksToBump].filter(task => task && task.id);
    const updates = tasksToUpdate.map(task => 
      retryWithBackoff(() => 
        PlanejamentoAtividade.update(task.id, { horas_por_dia: task.horas_por_dia }), 2, 500
      )
    );
    await Promise.all(updates);

    // 4. Processar a fila das tarefas que foram adiadas
    if (onProgress) onProgress("Reagendando atividades adiadas...");
    const resultado = await processarFilaDeReagendamento(filaReagendamento, todosOsPlanejamentos, onProgress);

    resultado.reagendadas += 1; 
    
    // Continuar procurando por mais conflitos ou finalizar
    const proximoPasso = await iniciarReagendamento(onProgress);
    if (proximoPasso.status === 'complete') {
        proximoPasso.data.reagendadas += resultado.reagendadas;
        proximoPasso.data.erros.push(...resultado.erros);
    }
    return proximoPasso;
    
  } catch (error) {
    console.error("Erro ao resolver conflito:", error);
    return { status: 'complete', data: { reagendadas: 0, erros: [error.message || 'Erro ao resolver conflito'] } };
  }
};
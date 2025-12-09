
import { format, addDays, parseISO, startOfDay, isValid, differenceInDays, getDay, subDays } from 'date-fns';

export const isWorkingDay = (date) => {
  const day = getDay(date);
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
};

export const getNextWorkingDay = (date, includeSelf = false) => {
  let nextDay = includeSelf ? new Date(date) : addDays(new Date(date), 1);
  while (!isWorkingDay(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
};

export const getPreviousWorkingDay = (date) => {
  let prevDay = subDays(date, 1);
  while (!isWorkingDay(prevDay)) {
    prevDay = subDays(prevDay, 1);
  }
  return prevDay;
};

export const distribuirHorasPorDias = (dataInicio, horasTotais, horasPorDia = 8, cargaExistente = {}) => {
  let horasRestantes = horasTotais;
  
  // **CORREÇÃO CRÍTICA**: Garantir que começamos SEMPRE na data de início ou APÓS ela
  let dataAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  
  // **NOVA VALIDAÇÃO**: Se a data de início não for um dia útil, avançar para o próximo dia útil
  if (!isWorkingDay(dataAtual)) {
    console.log(`⚠️ [distribuirHorasPorDias] Data de início ${format(dataAtual, 'yyyy-MM-dd')} não é dia útil. Avançando...`);
    dataAtual = getNextWorkingDay(dataAtual);
  }

  const distribuicao = {};
  let ultimaDataUsada = null;
  const dataInicioOriginal = new Date(dataAtual); // Preservar para validação

  console.log(`[distribuirHorasPorDias] 🚀 Iniciando distribuição de ${horasTotais}h a partir de ${format(dataAtual, 'yyyy-MM-dd')}`);
  console.log('[distribuirHorasPorDias] 📊 Carga existente inicial:', cargaExistente);

  let loopSafety = 0;

  while (horasRestantes > 0.01 && loopSafety < 365) {
    // **VALIDAÇÃO CRÍTICA**: NUNCA permitir que dataAtual seja anterior à data de início
    if (dataAtual.getTime() < dataInicioOriginal.getTime()) {
      console.error(`🚨 [ERRO CRÍTICO] Tentativa de agendar para data anterior (${format(dataAtual, 'yyyy-MM-dd')}) à data de início (${format(dataInicioOriginal, 'yyyy-MM-dd')})!`);
      dataAtual = new Date(dataInicioOriginal);
      // It's possible that dataInicioOriginal might itself be a non-working day if the initial dataInicio was.
      // Re-evaluate the current day to ensure it's valid after reset.
      if (!isWorkingDay(dataAtual)) {
        dataAtual = getNextWorkingDay(dataAtual);
      }
    }

    if (!isWorkingDay(dataAtual)) {
      dataAtual = addDays(dataAtual, 1);
      loopSafety++;
      continue;
    }

    const diaKey = format(dataAtual, 'yyyy-MM-dd');
    const cargaDoDia = Number(cargaExistente[diaKey]) || 0;
    
    // **CORREÇÃO**: Garantir que NUNCA ultrapasse as 8h diárias
    const capacidadeDisponivel = Math.max(0, horasPorDia - cargaDoDia);

    console.log(`[distribuirHorasPorDias] 📅 Dia ${diaKey}: carga atual ${cargaDoDia.toFixed(2)}h, disponível ${capacidadeDisponivel.toFixed(2)}h`);

    if (capacidadeDisponivel > 0.01) {
      const horasAlocar = Math.min(horasRestantes, capacidadeDisponivel);
      const horasAlocarArredondadas = Math.round(horasAlocar * 100) / 100;
      
      distribuicao[diaKey] = (distribuicao[diaKey] || 0) + horasAlocarArredondadas;
      cargaExistente[diaKey] = (cargaExistente[diaKey] || 0) + horasAlocarArredondadas;
      horasRestantes -= horasAlocarArredondadas;
      horasRestantes = Math.round(horasRestantes * 100) / 100; // Arredondar para evitar problemas de ponto flutuante
      ultimaDataUsada = new Date(dataAtual);
      
      console.log(`[distribuirHorasPorDias]   ✅ Alocando ${horasAlocarArredondadas.toFixed(2)}h em ${diaKey}. Nova carga total do dia: ${cargaExistente[diaKey].toFixed(2)}h. Horas restantes: ${horasRestantes.toFixed(2)}h.`);
      
      // **CORREÇÃO CRÍTICA**: Verificar se o dia atingiu o limite APÓS a alocação
      if (cargaExistente[diaKey] >= horasPorDia - 0.01) {
        console.log(`[distribuirHorasPorDias]   🔒 Dia ${diaKey} atingiu limite de ${horasPorDia}h. Passando para o próximo dia.`);
        dataAtual = addDays(dataAtual, 1);
      }
      // Se ainda há capacidade no dia, pode continuar usando o mesmo dia (dataAtual não é incrementada aqui)
    } else {
      // Se não há capacidade, passar para o próximo dia
      console.log(`[distribuirHorasPorDias]   ⏭️ Dia ${diaKey} sem capacidade. Passando para próximo dia.`);
      dataAtual = addDays(dataAtual, 1);
    }
    
    loopSafety++;
    if (loopSafety >= 365) {
      console.error("[distribuirHorasPorDias] 🛑 Loop de segurança atingido. Interrompendo.");
      break;
    }
  }

  const dataTermino = ultimaDataUsada || dataInicioOriginal;

  console.log(`[distribuirHorasPorDias] ✅ Distribuição concluída.`);
  console.log('[distribuirHorasPorDias]   - Distribuição final:', distribuicao);
  console.log(`[distribuirHorasPorDias]   - Data de início: ${format(dataInicioOriginal, 'yyyy-MM-dd')}`);
  console.log(`[distribuirHorasPorDias]   - Data de término: ${format(dataTermino, 'yyyy-MM-dd')}`);
  console.log('[distribuirHorasPorDias]   - Carga final (acumulada):', cargaExistente);

  // **VALIDAÇÃO FINAL**: Verificar que nenhuma data na distribuição é anterior à data de início
  Object.keys(distribuicao).forEach(data => {
    // Create Date object for comparison, setting time to midnight to avoid time-of-day issues
    const dataObj = new Date(data + 'T00:00:00'); 
    if (dataObj.getTime() < dataInicioOriginal.getTime()) {
      console.error(`🚨 ERRO CRÍTICO: Data ${data} na distribuição é anterior à data de início ${format(dataInicioOriginal, 'yyyy-MM-dd')}!`);
      // Remover a data inválida
      delete distribuicao[data];
    }
  });

  // **VERIFICAÇÃO ADICIONAL**: Validar que nenhum dia ultrapassou o limite
  Object.entries(cargaExistente).forEach(([data, horas]) => {
    if (horas > horasPorDia + 0.01) { // Usar uma pequena tolerância para comparações de ponto flutuante
      console.error(`🚨 ERRO: Dia ${data} ultrapassou o limite! Horas: ${horas.toFixed(2)}h (limite: ${horasPorDia}h)`);
    }
  });

  return { distribuicao, dataTermino };
};

// **NOVA FUNÇÃO**: Para verificar horas disponíveis em um dia específico
export const calcularHorasDisponiveisDia = (data, cargaExistente = {}, horasPorDia = 8) => {
  const diaKey = format(data, 'yyyy-MM-dd');
  const cargaDoDia = Number(cargaExistente[diaKey]) || 0;
  const horasDisponiveis = Math.max(0, horasPorDia - cargaDoDia);
  
  console.log(`[calcularHorasDisponiveisDia] Dia ${diaKey}: ${cargaDoDia.toFixed(2)}h ocupadas, ${horasDisponiveis.toFixed(2)}h disponíveis`);
  
  return horasDisponiveis;
};

export const calcularDataInicioPorPredecessora = (predecessoraId, planejamentos, cargaDiariaExistente = {}, horasPorDia = 8) => {
  if (!predecessoraId) {
    return getNextWorkingDay(new Date());
  }

  // Encontrar a atividade predecessora
  const predecessora = planejamentos.find(p => p.id === predecessoraId || p.analitico_id === predecessoraId);
  
  if (!predecessora || !predecessora.horas_por_dia) {
    console.warn("Predecessora não encontrada ou sem distribuição de horas:", predecessoraId);
    return getNextWorkingDay(new Date());
  }

  // Encontrar o último dia da predecessora
  const diasPredecessora = Object.keys(predecessora.horas_por_dia).sort();
  const ultimoDiaPredecessora = diasPredecessora[diasPredecessora.length - 1];
  
  if (!ultimoDiaPredecessora) {
    return getNextWorkingDay(new Date());
  }

  // **CORREÇÃO**: Usar parseLocalDate para evitar problemas de fuso horário
  const dataUltimoDia = parseLocalDate(ultimoDiaPredecessora);
  
  if (!dataUltimoDia || !isValid(dataUltimoDia)) {
    console.error("Data inválida para o último dia da predecessora:", ultimoDiaPredecessora);
    return getNextWorkingDay(new Date());
  }
  
  // Verificar se há capacidade disponível no último dia da predecessora
  const cargaExistenteUltimoDia = cargaDiariaExistente[ultimoDiaPredecessora] || 0;
  const capacidadeDisponivelUltimoDia = horasPorDia - cargaExistenteUltimoDia;
  
  // Se há capacidade no último dia da predecessora, começar no mesmo dia
  if (capacidadeDisponivelUltimoDia > 0.01) { // Usar uma pequena tolerância
    console.log(`📅 Capacidade disponível no último dia da predecessora (${ultimoDiaPredecessora}): ${capacidadeDisponivelUltimoDia}h`);
    return dataUltimoDia;
  }
  
  // Caso contrário, começar no próximo dia útil
  console.log(`📅 Último dia da predecessora está cheio, começando no próximo dia útil após ${ultimoDiaPredecessora}`);
  return getNextWorkingDay(dataUltimoDia);
};

export const formatDateForDisplay = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatDateForAPI = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
};

// Função para converter string de data para Date local corretamente
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  if (dateString instanceof Date) {
    return dateString;
  }
  
  if (typeof dateString === 'string') {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    try {
      const parsedDate = parseISO(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return new Date(parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000);
      }
    } catch (e) {
      console.error('Erro ao parsear data:', dateString, e);
    }
  }
  
  return null;
};

// **CORREÇÃO**: Função para verificar se uma atividade está atrasada
export const isActivityOverdue = (plano, referenceDate = new Date()) => {
  // Se está concluída, não está atrasada
  if (plano.status === 'concluido') {
    return false;
  }

  // **PRIORIDADE**: Usar data ajustada se existir, senão usar a planejada
  const targetDateString = plano.termino_ajustado || plano.termino_planejado;
  if (!targetDateString) {
    return false;
  }

  try {
    const dataTermino = parseLocalDate(targetDateString);
    if (!dataTermino || !isValid(dataTermino)) {
      return false;
    }

    // **CORREÇÃO**: Comparar apenas as datas (sem horário) para evitar problemas de timezone
    const hoje = startOfDay(referenceDate);
    const dataTerminoSemHora = startOfDay(dataTermino);
    
    // Está atrasada se a data de término foi antes de hoje
    return dataTerminoSemHora < hoje;
  } catch (error) {
    console.error(`Erro ao verificar atraso para plano ${plano.id} com data ${targetDateString}:`, error);
    return false;
  }
};

import { differenceInDays, addDays, isWeekend, format } from 'date-fns';

export const isWorkingDay = (date) => {
  return !isWeekend(date);
};

export const getNextWorkingDay = (date) => {
  let nextDay = addDays(date, 1);
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
};

export const isActivityOverdue = (dataFim) => {
  if (!dataFim) return false;
  const hoje = new Date();
  const dataFimDate = new Date(dataFim);
  return dataFimDate < hoje;
};


export function distribuirHorasPorDias(dataInicio, totalHoras, capacidadeDiaria = 8, cargaDiariaAtual = {}, considerarDiasUteis = true) {
  let horasRestantes = totalHoras;
  let currentDate = new Date(dataInicio);
  const distribuicao = {};
  let tentativas = 0;
  // Limite de tentativas para evitar loop infinito
  const MAX_DIAS = 365;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  while (horasRestantes > 0 && tentativas < MAX_DIAS) {
    tentativas++;
    // Se considerar só dias úteis
    if (considerarDiasUteis && !isWorkingDay(currentDate)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Não alocar em datas passadas
    if (currentDate < hoje) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const key = format(currentDate, 'yyyy-MM-dd');
    const cargaAtual = cargaDiariaAtual[key] || 0;
    // Se o dia já está cheio, pula para o próximo
    if (cargaAtual >= capacidadeDiaria) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    const disponivel = Math.max(0, capacidadeDiaria - cargaAtual);
    if (disponivel > 0) {
      const alocar = Math.min(disponivel, horasRestantes);
      distribuicao[key] = (distribuicao[key] || 0) + alocar;
      horasRestantes -= alocar;
    }
    currentDate = addDays(currentDate, 1);
  }

  return {
    distribuicao,
    dataTermino: new Date(Object.keys(distribuicao).pop() + 'T00:00:00')
  };
}

export const DateCalculator = {
  isWorkingDay,
  getNextWorkingDay,
  isActivityOverdue,
  distribuirHorasPorDias
};
import { parseISO, formatISO, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

function safeParseDate(input) {
  if (!input) return null;
  try {
    const d1 = parseISO(String(input));
    if (d1 && !Number.isNaN(d1.getTime())) return d1;
  } catch { }
  try {
    const d2 = new Date(input);
    if (d2 && !Number.isNaN(d2.getTime())) return d2;
  } catch { }
  return null;
}

function bucketDateByViewMode(date, viewMode) {
  if (!date) return null;
  // Para exibir linhas com mais pontos, usamos granularidade diária
  // mesmo quando a visualização é 'week' ou 'month'.
  return startOfDay(date);
}

// records: PlanejamentoDocumento/PlanejamentoAtividade normalizados, podendo ter horas_por_dia (obj ou JSON)
export function buildCurvaSData(records = [], viewMode = 'month', dateRange) {
  const map = new Map();
  const arr = Array.isArray(records) ? records : [];

  arr.forEach(p => {
    // Normaliza horas_por_dia quando vier como string
    let horasPorDia = p.horas_por_dia;
    if (typeof horasPorDia === 'string') {
      try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = null; }
    }

    // Executado deve vir exclusivamente da coluna tempo_executado
    const executedTotal = Number(p.tempo_executado || 0) || 0;

    if (horasPorDia && typeof horasPorDia === 'object' && Object.keys(horasPorDia).length > 0) {
      // Planejado/Replanejado por dia
      Object.entries(horasPorDia).forEach(([dateStr, horas]) => {
        const parsed = safeParseDate(dateStr);
        if (!parsed) return;
        if (dateRange && (parsed < dateRange.start || parsed > dateRange.end)) return;
        const b = bucketDateByViewMode(parsed, viewMode);
        const dia = formatISO(b, { representation: 'date' });
        const planned = Number(horas) || 0;
        // Se não há distribuição ajustada por dia, mantém replanejado igual ao planejado por dia
        const replanned = planned;
        const item = map.get(dia) || { dia, planejado: 0, replanejado: 0, executado: 0 };
        item.planejado += planned;
        item.replanejado += replanned;
        map.set(dia, item);
      });

      // Executado acumulado: atribui no último dia ou término
      const lastDateKey = Object.keys(horasPorDia).sort().pop();
      const execDateRaw = p.termino_real || p.termino_ajustado || p.termino_planejado || lastDateKey;
      const parsedExec = safeParseDate(execDateRaw);
      if (parsedExec && (!dateRange || (parsedExec >= dateRange.start && parsedExec <= dateRange.end))) {
        const b = bucketDateByViewMode(parsedExec, viewMode);
        const dia = formatISO(b, { representation: 'date' });
        const item = map.get(dia) || { dia, planejado: 0, replanejado: 0, executado: 0 };
        item.executado += executedTotal;
        map.set(dia, item);
      }
    } else {
      // Fallback: usar tempo_planejado em uma data representativa
      const rawDateStr = p.inicio_planejado || p.termino_planejado || p.inicio_ajustado || p.termino_ajustado || p.inicio_real || p.termino_real || null;
      const parsed = safeParseDate(rawDateStr);
      if (!parsed) return;
      if (dateRange && (parsed < dateRange.start || parsed > dateRange.end)) return;
      const b = bucketDateByViewMode(parsed, viewMode);
      const dia = formatISO(b, { representation: 'date' });
      const planned = Number(p.tempo_planejado ?? p.horas_planejadas ?? 0) || 0;
      const replanned = Number(p.tempo_ajustado ?? planned) || planned;
      const item = map.get(dia) || { dia, planejado: 0, replanejado: 0, executado: 0 };
      item.planejado += planned;
      item.replanejado += replanned;
      item.executado += executedTotal;
      map.set(dia, item);
    }
  });

  const rows = Array.from(map.values()).sort((a, b) => (a.dia < b.dia ? -1 : 1));
  let accP = 0, accR = 0, accE = 0;
  return rows.map(r => {
    accP += r.planejado;
    accR += r.replanejado;
    accE += r.executado;
    return { ...r, accPlanejado: accP, accReplanejado: accR, accExecutado: accE };
  });
}

export function summarizeTotals(chartData) {
  if (!chartData || chartData.length === 0) return { totalPlanejado: 0, totalExecutado: 0 };
  const last = chartData[chartData.length - 1];
  return { totalPlanejado: last.accPlanejado || 0, totalExecutado: last.accExecutado || 0 };
}
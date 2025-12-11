import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart as LineChartIcon, RefreshCw, Calendar, Users } from 'lucide-react';
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { buildCurvaSData, summarizeTotals } from '@/lib/curvaS';

const BACKEND_URL = 'http://localhost:3001';

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

function numberToHoursLabel(n) {
  const v = Number(n) || 0;
  if (v < 1 && v > 0) return `${(v * 60).toFixed(1)}min`;
  if (v === 0) return '0h';
  return `${v.toFixed(1)}h`;
}

function CurvaS() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [planejamentos, setPlanejamentos] = useState([]);
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ empreendimento: 'all', usuario: 'all' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Empreendimentos locais
        const emps = await fetch(`${BACKEND_URL}/api/Empreendimento`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => []);

        // Planejamentos (Documentos e Atividades) com filtros
        const params = new URLSearchParams();
        if (filters.empreendimento !== 'all') params.append('empreendimento_id', String(filters.empreendimento));
        if (filters.usuario !== 'all') params.append('executor_principal', String(filters.usuario));
        const [plansDoc, plansAtv] = await Promise.all([
          fetch(`${BACKEND_URL}/api/planejamento-documentos?${params.toString()}`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${BACKEND_URL}/api/planejamento-atividades?${params.toString()}`).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        const plans = [
          ...((Array.isArray(plansDoc) ? plansDoc : []).map(p => ({ ...p, tipo_planejamento: 'documento' }))),
          ...((Array.isArray(plansAtv) ? plansAtv : []).map(p => ({ ...p, tipo_planejamento: 'atividade' })))
        ];
        if (!mounted) return;
        setEmpreendimentos(Array.isArray(emps) ? emps : []);
        // Derivar usuários a partir dos planejamentos (executor_principal e executores)
        const userMap = new Map();
        (Array.isArray(plans) ? plans : []).forEach(p => {
          const principal = (p.executor_principal || '').trim();
          if (principal) userMap.set(principal, { email: principal, nome: principal });
          if (Array.isArray(p.executores)) {
            p.executores.forEach(e => {
              const email = (typeof e === 'string' ? e : e?.email || e)?.trim();
              if (email) userMap.set(email, { email, nome: email });
            });
          }
        });
        setUsuarios(Array.from(userMap.values()));
        setPlanejamentos(Array.isArray(plans) ? plans : []);
      } catch (e) {
        console.warn('Falha ao carregar dados para Curva S:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [filters.empreendimento, filters.usuario]);

  const filtered = useMemo(() => {
    // Aplica filtros e normaliza campos mínimos (horas_por_dia pode vir como string)
    const arr = Array.isArray(planejamentos) ? planejamentos : [];
    return arr
      .map(p => {
        let horasPorDia = p.horas_por_dia;
        if (typeof horasPorDia === 'string') {
          try { horasPorDia = JSON.parse(horasPorDia); } catch { horasPorDia = null; }
        }
        return { ...p, horas_por_dia: horasPorDia };
      })
      .filter(p => {
        const empId = p.empreendimento_id ?? (typeof p.empreendimento === 'object' ? p.empreendimento?.id : p.empreendimento);
        const okEmp = filters.empreendimento === 'all' || empId === filters.empreendimento;
        const userEmail = (p.executor && p.executor.email) || p.executor_principal || null;
        const executores = Array.isArray(p.executores) ? p.executores.map(e => (typeof e === 'string' ? e : (e?.email || e))) : [];
        const okUser = (
          filters.usuario === 'all' ||
          (userEmail && userEmail === filters.usuario) ||
          executores.includes(filters.usuario)
        );
        return okEmp && okUser;
      });
  }, [planejamentos, filters]);

  // Construir séries acumuladas simples: planejado, replanejado, executado
  const dateRange = useMemo(() => {
    if (viewMode === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (viewMode === 'week') return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }, [currentDate, viewMode]);

  const chartData = useMemo(() => buildCurvaSData(filtered, viewMode, dateRange), [filtered, viewMode, dateRange]);

  const { totalPlanejado, totalExecutado } = summarizeTotals(chartData);

  // LOGS TEMPORÁRIOS DE DEPURAÇÃO
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.group('[CurvaS] Depuração de dados');
      console.log('Filtros:', filters);
      console.log('Registros filtrados:', filtered.length);
      filtered.slice(0, 10).forEach((p, idx) => {
        console.log(`#${idx + 1}`, {
          id: p.id,
          tipo: p.tipo_planejamento,
          executor_principal: p.executor_principal,
          empreend: p.empreendimento_id ?? p.empreendimento?.id,
          horas_por_dia: p.horas_por_dia,
          tempo_planejado: p.tempo_planejado,
          tempo_executado: p.tempo_executado,
        });
      });
      console.log('chartData pontos:', chartData.length);
      chartData.slice(0, 20).forEach(r => console.log('bucket', r.dia, 'planejado:', r.planejado, 'accP:', r.accPlanejado));
      console.log('Totais:', { totalPlanejado, totalExecutado });
      console.groupEnd();
    } catch { }
  }

  const atrasadasCount = useMemo(() => {
    return (filtered || []).filter(p => {
      const status = p.status;
      return status === 'atrasado' || status === 'replanejado_atrasado';
    }).length;
  }, [filtered]);

  const usuariosOrdenados = useMemo(() => {
    return [...usuarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [usuarios]);

  const empsOrdenados = useMemo(() => {
    return [...empreendimentos].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [empreendimentos]);

  const width = 900;
  const height = 320;
  const padding = { left: 50, right: 20, top: 20, bottom: 30 };
  const maxY = Math.max(totalPlanejado, totalExecutado, 1);

  function xScale(i, n) {
    const innerW = width - padding.left - padding.right;
    if (n <= 1) return padding.left;
    return padding.left + (innerW * i) / (n - 1);
  }
  function yScale(v) {
    const innerH = height - padding.top - padding.bottom;
    const ratio = maxY > 0 ? v / maxY : 0;
    return height - padding.bottom - ratio * innerH;
  }

  function pathFromSeries(series, color) {
    if (!series.length) return null;
    // Caso tenha só um ponto, desenha uma linha horizontal para dar visibilidade
    if (series.length === 1) {
      const y = yScale(series[0].y);
      return <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={color} strokeWidth="2" />;
    }
    const d = series.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i, series.length)} ${yScale(pt.y)}`).join(' ');
    return <path d={d} fill="none" stroke={color} strokeWidth="2" />;
  }

  const seriesP = chartData.map(r => ({ x: r.dia, y: r.accPlanejado }));
  const seriesR = chartData.map(r => ({ x: r.dia, y: r.accReplanejado }));
  const seriesE = chartData.map(r => ({ x: r.dia, y: r.accExecutado }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">Calendário</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900 flex items-center gap-2"><LineChartIcon className="w-4 h-4 text-purple-600" /> Curva S</span>
        </div>
        <div className="flex items-center gap-2">
          <button className={`px-2 py-1 text-sm rounded ${viewMode === 'day' ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700'}`} onClick={() => setViewMode('day')}>Dia</button>
          <button className={`px-2 py-1 text-sm rounded ${viewMode === 'week' ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700'}`} onClick={() => setViewMode('week')}>Semana</button>
          <button className={`px-2 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700'}`} onClick={() => setViewMode('month')}>Mês</button>
          <button className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 flex items-center gap-1" onClick={() => window.location.reload()}><RefreshCw className="w-3 h-3" /> Atualizar</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select className="border rounded px-2 py-1 text-sm" value={filters.empreendimento} onChange={e => setFilters(f => ({ ...f, empreendimento: e.target.value }))}>
            <option value="all">Todos os Empreendimentos</option>
            {empsOrdenados.map(e => (
              <option key={String(e.id ?? e.nome ?? e.nome_fantasia)} value={e.id}>{e.nome || e.nome_fantasia || `Empreendimento ${e.id}`}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <select className="border rounded px-2 py-1 text-sm" value={filters.usuario} onChange={e => setFilters(f => ({ ...f, usuario: e.target.value }))}>
            <option value="all">Todos os Usuários</option>
            {usuariosOrdenados.map(u => (
              <option key={String(u.email ?? u.nome)} value={u.email}>{u.nome || u.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-800">Curva S - Progresso do Projeto</div>
          <div className="text-right text-sm">
            <div className="text-gray-600">Progresso Geral</div>
            <div className="text-purple-600 font-bold">{numberToHoursLabel(totalExecutado)} / {numberToHoursLabel(totalPlanejado)}</div>
          </div>
        </div>
        <svg width={width} height={height}>
          {/* Eixos */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#ddd" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#ddd" />
          {/* Séries acumuladas */}
          {pathFromSeries(seriesP.map(s => ({ y: s.y })), '#3b82f6')}
          {pathFromSeries(seriesR.map(s => ({ y: s.y })), '#f59e0b')}
          {pathFromSeries(seriesE.map(s => ({ y: s.y })), '#10b981')}
        </svg>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-blue-500" /> Planejado</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-amber-500" /> Replanejado</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-emerald-500" /> Executado</span>
        </div>
      </div>

      {atrasadasCount > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
          <div className="font-semibold flex items-center gap-2"><span className="inline-flex w-5 h-5 items-center justify-center bg-red-100 text-red-600 rounded">!</span> OS Atrasadas ({atrasadasCount})</div>
          <p className="text-sm mt-2">Estas OS estão impactando a data de entrega:</p>
          <div className="mt-3 flex items-center justify-between bg-white/70 border border-red-200 rounded p-3">
            <div>
              <div className="font-semibold">Sem empreendimento</div>
              <div className="text-xs text-red-600">{atrasadasCount} OSs atrasadas</div>
            </div>
            <div className="bg-red-600 text-white rounded px-2 py-1 text-sm font-bold">{atrasadasCount}</div>
          </div>
          <div className="mt-3 text-right text-sm font-semibold">Total: {atrasadasCount} OS atrasadas</div>
        </div>
      )}
    </div>
  );
}

export default CurvaS;

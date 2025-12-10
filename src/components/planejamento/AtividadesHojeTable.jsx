import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Execucao } from '@/entities/all';

function toSeconds(tempoTotalSegundos, tempoExecutadoHoras) {
  if (tempoExecutadoHoras != null && !isNaN(Number(tempoExecutadoHoras))) {
    return Math.max(0, Number(tempoExecutadoHoras) * 3600);
  }
  return Math.max(0, Number(tempoTotalSegundos || 0));
}

function formatTempo(segundos) {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const minutos = segundos / 60;
  if (minutos < 60) return `${minutos.toFixed(1)}min`;
  return `${(minutos / 60).toFixed(1)}h`;
}

function formatDateLong(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusPill(status) {
  const s = (status || '').toLowerCase();
  if (s === 'concluido' || s === 'finalizado') return { text: 'Finalizado', cls: 'bg-green-100 text-green-700' };
  if (s === 'paralisado' || s === 'pausado') return { text: 'Paralisado', cls: 'bg-rose-100 text-rose-700' };
  if (s === 'em_andamento' || s === 'em_execucao') return { text: 'Em andamento', cls: 'bg-blue-100 text-blue-700' };
  return { text: status || '—', cls: 'bg-gray-100 text-gray-700' };
}

export default function AtividadesHojeTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataRef, setDataRef] = useState(() => new Date());

  const diaStr = useMemo(() => {
    const d = new Date(dataRef);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [dataRef]);

  const fetchDia = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const lista = await Execucao.list({ dia: diaStr });
      const arr = Array.isArray(lista) ? lista : [];
      arr.sort((a, b) => String(b.inicio || b.created_at).localeCompare(String(a.inicio || a.created_at)));
      setItems(arr);
    } catch (err) {
      setError('Falha ao carregar atividades');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [diaStr]);

  useEffect(() => { fetchDia(); }, [fetchDia]);
  useEffect(() => {
    const handler = () => fetchDia();
    window.addEventListener('execucao:updated', handler);
    return () => window.removeEventListener('execucao:updated', handler);
  }, [fetchDia]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.usuario || it.executor_principal || 'Sem Usuário';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    // Ordena usuários por nome
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR', { sensitivity: 'base' }));
  }, [items]);

  const totalDoDia = useCallback((arr) => {
    const totalSeg = (arr || []).reduce((acc, it) => acc + toSeconds(it.tempo_total, it.tempo_executado), 0);
    return formatTempo(totalSeg);
  }, []);

  const goPrevDay = () => setDataRef(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  const goNextDay = () => setDataRef(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  const goToday = () => setDataRef(new Date());

  return (
    <div className="mt-8">
      {/* Cabeçalho com data e navegação */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <h3 className="text-lg font-semibold text-gray-900">Atividades de {formatDateLong(new Date(dataRef))}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrevDay} className="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50">◀</button>
          <button onClick={goToday} className="px-3 py-1 rounded border text-gray-600 hover:bg-gray-50">Hoje</button>
          <button onClick={goNextDay} className="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50">▶</button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="bg-white border rounded-lg shadow-sm p-6 text-gray-500">Carregando…</div>
      ) : error ? (
        <div className="bg-white border rounded-lg shadow-sm p-6 text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white border rounded-lg shadow-sm p-6 text-gray-600">Nenhuma atividade registrada neste dia</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([usuario, arr]) => (
            <div key={usuario} className="bg-white border rounded-lg shadow-sm">
              {/* Cabeçalho do usuário */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/70">
                <div className="font-semibold text-gray-800">{usuario}</div>
                <div className="text-xs">
                  <span className="mr-2 text-gray-500">Total do dia:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{totalDoDia(arr)}</span>
                </div>
              </div>
              {/* Itens */}
              <div className="divide-y">
                {arr.map((it) => {
                  const seg = toSeconds(it.tempo_total, it.tempo_executado);
                  const s = statusPill(it.status);
                  const titulo = it.atividade_nome || it.documento_nome || it.descricao || 'Atividade';
                  const ajudando = it.usuario_ajudado ? String(it.usuario_ajudado).trim() : '';
                  return (
                    <div key={it.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 pr-3">
                        <div className="text-sm text-gray-800 font-medium truncate">{titulo}</div>
                        {ajudando && (
                          <div className="text-xs text-indigo-600 mt-1 truncate">Ajudando: {ajudando}</div>
                        )}
                        {it.observacao && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">{it.observacao}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.text}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{formatTempo(seg)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

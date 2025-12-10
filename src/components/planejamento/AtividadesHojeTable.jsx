import React, { useEffect, useState, useCallback } from 'react';
import { Execucao } from '@/entities/all';

function formatTempo(tempoTotalSegundos, tempoExecutadoHoras) {
  // Prioriza tempo_executado (horas) quando disponível
  let segundos = 0;
  if (tempoExecutadoHoras != null && !isNaN(Number(tempoExecutadoHoras))) {
    segundos = Number(tempoExecutadoHoras) * 3600;
  } else {
    segundos = Number(tempoTotalSegundos || 0);
  }
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const minutos = segundos / 60;
  if (minutos < 60) return `${minutos.toFixed(1)}min`;
  return `${(minutos / 60).toFixed(1)}h`;
}

export default function AtividadesHojeTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHoje = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hojeStr = new Date().toISOString().slice(0, 10);
      const lista = await Execucao.list({ dia: hojeStr });
      const filtrados = Array.isArray(lista) ? lista : [];
      filtrados.sort((a, b) => String(b.inicio || b.created_at).localeCompare(String(a.inicio || a.created_at)));
      setItems(filtrados);
    } catch (err) {
      setError('Falha ao carregar atividades de hoje');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoje();
  }, [fetchHoje]);

  useEffect(() => {
    const handler = () => fetchHoje();
    window.addEventListener('execucao:updated', handler);
    return () => window.removeEventListener('execucao:updated', handler);
  }, [fetchHoje]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900">Minhas Atividades de Hoje</h3>
      </div>
      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700 font-medium">Atividade</th>
              <th className="px-4 py-2 text-left text-gray-700 font-medium">Observação</th>
              <th className="px-4 py-2 text-left text-gray-700 font-medium">Status</th>
              <th className="px-4 py-2 text-right text-gray-700 font-medium">Duração</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-gray-500" colSpan={4}>Carregando…</td></tr>
            ) : error ? (
              <tr><td className="px-4 py-4 text-red-600" colSpan={4}>{error}</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-4 py-8 text-gray-600 text-center" colSpan={4}>Nenhuma atividade registrada neste dia</td></tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{item.atividade_nome || 'Atividade'}</div>
                    <div className="text-xs text-gray-500">{item.inicio ? new Date(item.inicio).toLocaleTimeString() : '-'}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{item.observacao || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${item.status === 'concluido' || item.status === 'finalizado' ? 'bg-green-100 text-green-700' : item.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{item.status || '—'}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-blue-600">
                    {formatTempo(item.tempo_total, item.tempo_executado)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

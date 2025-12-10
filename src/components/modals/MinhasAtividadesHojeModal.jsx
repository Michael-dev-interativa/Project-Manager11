import React, { useEffect, useState } from 'react';
import { Execucao } from '@/entities/all';

export default function MinhasAtividadesHojeModal({ onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchHoje = async () => {
      setIsLoading(true);
      try {
        const all = await Execucao.list();
        const hojeStr = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
        const hojeItems = (all || []).filter(e => {
          const inicio = e.inicio || e.created_at;
          const dt = inicio ? String(inicio).slice(0, 10) : null;
          return dt === hojeStr;
        });
        setItems(hojeItems);
      } catch (e) {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHoje();
  }, []);

  const formatHoras = (tempo_total) => {
    const h = Number(tempo_total || 0) / 3600; // tempo_total em segundos
    if (h < 1) return `${(h * 60).toFixed(1)}min`;
    return `${h.toFixed(1)}h`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[720px] max-w-[90vw]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Minhas Atividades de Hoje</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="text-gray-500">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="text-gray-600">Nenhuma atividade registrada hoje.</div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{item.atividade_nome || 'Atividade'}</div>
                      <div className="text-xs text-gray-600">{item.observacao || 'Sem observação'}</div>
                    </div>
                    <div className="text-sm text-blue-600 font-medium">{formatHoras(item.tempo_total)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Fechar</button>
        </div>
      </div>
    </div>
  );
}

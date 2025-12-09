import React, { useEffect, useState } from "react";
import { Execucao, PlanejamentoAtividade, PlanejamentoDocumento } from '../entities/all';

// Função utilitária exportada para iniciar uma execução a partir de qualquer lugar
export async function iniciarExecucao(atividade) {
  try {
    let result;
    if (atividade.tipo === 'atividade' || atividade.atividade) {
      const payload = {
        acao: 'iniciar',
        status: 'em_andamento',
        inicio_real: new Date().toISOString(),
      };
      result = await PlanejamentoAtividade.update(atividade.id, payload);
      return result;
    }
    if (atividade.tipo === 'documento' || atividade.arquivo || atividade.documento_id) {
      const payload = {
        acao: 'iniciar',
        status: 'em_andamento',
        inicio_real: new Date().toISOString(),
      };
      result = await PlanejamentoDocumento.update(atividade.id, payload);
      return result;
    }
    throw new Error('Tipo de atividade desconhecido para iniciar execução');
  } catch (err) {
    throw err;
  }
}

export default function ExecucaoModal({ atividade, onClose, onPause, onFinish, onReload }) {
  const [minimizado, setMinimizado] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!ativo) return;
    const timer = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [ativo]);

  const formatTime = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h} : ${m} : ${sec}`;
  };

  const finalizarAtividade = async () => {
    try {
      console.log('[FINALIZAR] Clique no botão Finalizar:', atividade);
      let registroAtual = null;
      if (atividade.atividade_id || atividade.tipo === 'atividade') {
        registroAtual = await PlanejamentoAtividade.filter ? await PlanejamentoAtividade.filter({ id: atividade.id }) : atividade;
        console.log('[FINALIZAR] Registro atual PlanejamentoAtividade:', registroAtual);
        // Calcular horas executadas com fallback: timer local OU diferença entre termino e inicio_real
        // Persistir o tempo do timer do modal como fonte de verdade
        const horasTimer = Number((segundos / 3600).toFixed(4));
        const horasPersistir = horasTimer > 0 ? horasTimer : 0;
        const payload = {
          acao: 'finalizar',
          // Alinhar com backend que usa 'finalizado'
          status: 'finalizado',
          termino_real: new Date().toISOString(),
          // Persistir em horas do timer
          tempo_executado: horasPersistir,
          executor_principal: registroAtual.executor_principal || '',
        };
        console.log('[FINALIZAR] Payload PlanejamentoAtividade:', payload);
        try {
          const result = await PlanejamentoAtividade.update(atividade.id, payload);
          console.log('[FINALIZAR] Resultado do update PlanejamentoAtividade:', result);
          if (!result || result.error) {
            alert('Erro ao finalizar atividade: ' + (result?.error || 'Falha desconhecida'));
            return;
          }
        } catch (err) {
          console.error('[FINALIZAR] Erro no update PlanejamentoAtividade:', err);
          alert('Erro ao finalizar atividade: ' + err.message);
          return;
        }
      } else if (atividade.documento_id || atividade.tipo === 'documento') {
        registroAtual = await PlanejamentoDocumento.filter ? await PlanejamentoDocumento.filter({ id: atividade.id }) : atividade;
        console.log('[FINALIZAR] Registro atual PlanejamentoDocumento:', registroAtual);
        const horasTimer = Number((segundos / 3600).toFixed(4));
        const horasPersistir = horasTimer > 0 ? horasTimer : 0;
        const payload = {
          acao: 'finalizar',
          status: 'finalizado',
          termino_real: new Date().toISOString(),
          tempo_executado: horasPersistir,
          executor_principal: registroAtual.executor_principal || '',
        };
        console.log('[FINALIZAR] Payload PlanejamentoDocumento:', payload);
        try {
          const result = await PlanejamentoDocumento.update(atividade.id, payload);
          console.log('[FINALIZAR] Resultado do update PlanejamentoDocumento:', result);
          if (!result || result.error) {
            alert('Erro ao finalizar documento: ' + (result?.error || 'Falha desconhecida'));
            return;
          }
        } catch (err) {
          console.error('[FINALIZAR] Erro no update PlanejamentoDocumento:', err);
          alert('Erro ao finalizar documento: ' + err.message);
          return;
        }
      }
      // Buscar status atualizado do backend após finalizar e disparar atualizações
      try {
        if (atividade.tipo === 'documento' || atividade.documento_id) {
          // Alguns backends não expõem GET /:id; usar filtro por id
          const response = await fetch(`http://localhost:3001/api/planejamento-documentos?id=${atividade.id}`);
          const data = await response.json();
          const atualizado = Array.isArray(data) ? data[0] : data;
          onFinish && onFinish(atualizado || { ...atividade, status: 'finalizado' });
        } else {
          const response = await fetch(`http://localhost:3001/api/planejamento-atividades?id=${atividade.id}`);
          const data = await response.json();
          const atualizado = Array.isArray(data) ? data[0] : data;
          onFinish && onFinish(atualizado || { ...atividade, status: 'finalizado' });
        }
      } catch (e) {
        onFinish && onFinish({ ...atividade, status: 'finalizado' });
      }
      onReload && onReload();
    } catch (err) {
      console.error('Erro ao finalizar atividade:', err);
    }
  };

  const iniciarAtividade = async () => {
    try {
      console.log('Iniciando atividade:', atividade);
      let result;
      if (atividade.tipo === 'atividade' || atividade.atividade) {
        const payload = {
          acao: 'iniciar',
          status: 'em_andamento',
          inicio_real: new Date().toISOString(),
        };
        console.log('Payload PlanejamentoAtividade (iniciar):', payload);
        result = await PlanejamentoAtividade.update(atividade.id, payload);
        alert('PUT PlanejamentoAtividade (iniciar): ' + JSON.stringify(result));
      }
      if (atividade.tipo === 'documento' || atividade.arquivo) {
        const payload = {
          acao: 'iniciar',
          status: 'em_andamento',
          inicio_real: new Date().toISOString(),
        };
        console.log('Payload PlanejamentoDocumento (iniciar):', payload);
        result = await PlanejamentoDocumento.update(atividade.id, payload);
        alert('PUT PlanejamentoDocumento (iniciar): ' + JSON.stringify(result));
      }
    } catch (err) {
      alert('Erro ao iniciar atividade: ' + (err.message || err));
    }
  };

  // Removido botão 'Iniciar' do modal, mantendo apenas Finalizar e Pausar
  return (
    <div className="fixed left-4 bottom-4 z-50">
      {minimizado ? (
        <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 cursor-pointer min-w-[120px] max-w-[90vw]" style={{ pointerEvents: 'auto', position: 'relative' }} onClick={() => setMinimizado(false)}>
          <span className="text-blue-600 font-mono text-lg">{formatTime(segundos)}</span>
          <span className="text-gray-500 text-xs">Atividade</span>
          <button className="text-gray-500 hover:text-gray-700 text-xl ml-2" onClick={e => { e.stopPropagation(); onClose(); }} title="Fechar">×</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[90vw] flex flex-col" style={{ pointerEvents: 'auto', position: 'relative' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-lg">Atividade em Andamento</div>
            <button className="text-gray-500 hover:text-gray-700 text-xl ml-2" onClick={onClose} style={{ position: 'absolute', top: 8, right: 16 }}>×</button>
            <button className="text-gray-500 hover:text-gray-700 text-xl ml-2" onClick={() => setMinimizado(true)} title="Minimizar" style={{ position: 'absolute', top: 8, right: 44 }}>_</button>
          </div>
          <div className="mb-3 text-gray-700">{atividade?.atividade || atividade?.atividade_nome || atividade?.atividade_id_nome || atividade?.documento_nome || atividade?.documentoNumero || atividade?.arquivo || atividade?.descricao || "Atividade"}</div>
          <div className="text-blue-600 font-mono text-2xl mb-4">{formatTime(segundos)}</div>
          <div className="flex gap-2">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded font-semibold flex items-center gap-2"
              onClick={finalizarAtividade}
            >
              <span style={{ fontSize: 18 }}>■</span> Finalizar
            </button>
            <button
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold flex items-center gap-2"
              onClick={() => { setAtivo(false); onPause && onPause(); }}
            >
              <span style={{ fontSize: 18 }}>⏸</span> Pausar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

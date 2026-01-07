import React from 'react';

export default function PrevisaoEntregaModal({ isOpen, onClose, planejamentos, execucoes, cargaDiaria }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9999 }}>
      <div style={{ background: '#fff', margin: '5% auto', padding: 32, borderRadius: 8, maxWidth: 500 }}>
        <h2>Previsão de Entrega</h2>
        <p>Este é um modal placeholder. Implemente o conteúdo conforme necessário.</p>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

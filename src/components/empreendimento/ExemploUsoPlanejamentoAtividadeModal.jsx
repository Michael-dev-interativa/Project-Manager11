import React, { useState } from 'react';
import PlanejamentoAtividadeModal from './PlanejamentoAtividadeModal';

export default function ExemploUsoPlanejamentoAtividadeModal({ atividade, usuarios, empreendimentoId, documentos, onPlanejamentoCriado }) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <div>
      <button onClick={() => setModalAberto(true)}>
        Planejar Atividade
      </button>
      <PlanejamentoAtividadeModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        atividade={atividade}
        usuarios={usuarios}
        empreendimentoId={empreendimentoId}
        documentos={documentos}
        onSuccess={onPlanejamentoCriado}
      />
    </div>
  );
}

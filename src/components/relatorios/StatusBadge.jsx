import React from 'react';
import { Badge } from '@/components/ui/badge';

function getStatusMeta(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('conclu') || s === 'finalizado') {
    return { label: 'Concluído', classes: 'bg-green-100 text-green-700 border border-green-200' };
  }
  if (s.includes('atras')) {
    return { label: 'Atrasado', classes: 'bg-red-100 text-red-700 border border-red-200' };
  }
  if (s.includes('paus') || s.includes('paralis')) {
    return { label: 'Paralisado', classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200' };
  }
  if (s.includes('andamento') || s.includes('progresso')) {
    return { label: 'Em andamento', classes: 'bg-blue-100 text-blue-700 border border-blue-200' };
  }
  return { label: 'Pendente', classes: 'bg-gray-100 text-gray-700 border border-gray-200' };
}

export default function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return (
    <Badge variant="outline" className={meta.classes}>
      {meta.label}
    </Badge>
  );
}

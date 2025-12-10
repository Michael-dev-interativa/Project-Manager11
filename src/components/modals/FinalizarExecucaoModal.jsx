import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function FinalizarExecucaoModal({ open, planejamento, projeto, onCancel, onConfirm }) {
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!open) setObservacao('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel && onCancel(); }}>
      <DialogOverlay className="dialog-overlay" />
      <DialogContent className="dialog-content">
        <DialogHeader>
          <DialogTitle>Finalizar Atividade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Planejamento</Label>
            <Input value={planejamento || projeto || ''} readOnly className="bg-gray-100" />
          </div>
          <div>
            <Label className="mb-1 block">Observações (opcional)</Label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione comentários sobre esta execução..."
              className="w-full h-28 border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border bg-white text-gray-700">Cancelar</button>
          <button onClick={() => onConfirm && onConfirm(observacao)} className="px-4 py-2 rounded bg-red-500 text-white font-semibold flex items-center gap-2">
            <span style={{ fontSize: 16 }}>■</span> Finalizar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

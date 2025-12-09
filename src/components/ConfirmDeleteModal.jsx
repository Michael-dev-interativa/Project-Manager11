import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

function ConfirmDeleteModal({ isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
        </DialogHeader>
        <p>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
        <DialogFooter>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={onConfirm}>Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteModal;
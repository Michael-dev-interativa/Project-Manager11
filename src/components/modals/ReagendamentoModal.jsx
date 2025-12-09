import React from 'react';
import { X } from 'lucide-react';

export default function ReagendamentoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Reagendar Atividade</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-gray-500">Modal de reagendamento em desenvolvimento...</p>
      </div>
    </div>
  );
}
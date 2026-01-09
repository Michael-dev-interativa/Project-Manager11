import React, { useState, useEffect } from 'react';
import { X } from "lucide-react";
import { motion } from "framer-motion";

// ✅ URL BASE DA API
import { getApiBase } from '../../utils/apiBase'
const API_BASE_URL = getApiBase();
const EMPREENDIMENTO_ENDPOINT = 'Empreendimento';

// ✅ FUNÇÕES DE CRUD SIMPLIFICADAS
const EmpreendimentoDB = {
  // Criar novo empreendimento
  create: async (data) => {
    console.log('📤 Enviando dados para criar:', data);

    const response = await fetch(`${API_BASE_URL}/${EMPREENDIMENTO_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro da API:', error);
      throw new Error(error.error || 'Erro ao criar empreendimento');
    }

    const result = await response.json();
    console.log('✅ Resultado da API:', result);
    return result;
  },

  // Atualizar empreendimento existente
  update: async (id, data) => {
    console.log('📤 Enviando dados para atualizar:', id, data);

    const response = await fetch(`${API_BASE_URL}/${EMPREENDIMENTO_ENDPOINT}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro da API:', error);
      throw new Error(error.error || 'Erro ao atualizar empreendimento');
    }

    const result = await response.json();
    console.log('✅ Resultado da API:', result);
    return result;
  }
};

export default function EmpreendimentoForm({
  empreendimento,
  onSuccess,
  onClose
}) {
  // Estado inicial sempre definido - APENAS CAMPOS DO SEU BANCO
  const getInitialFormData = () => ({
    nome: '',
    cliente: '',
    endereco: '',
    status: 'em_planejamento'
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualizar formData quando empreendimento prop mudar
  useEffect(() => {
    if (empreendimento) {
      setFormData({
        nome: empreendimento.nome || '',
        cliente: empreendimento.cliente || '',
        endereco: empreendimento.endereco || '',
        status: empreendimento.status || 'em_planejamento'
      });
    } else {
      setFormData(getInitialFormData());
    }
  }, [empreendimento]);

  // Função para alterar campos do formulário
  const handleInputChange = (field, value) => {
    console.log(`🔄 Campo alterado: ${field} = "${value}"`);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Campos obrigatórios
    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome do empreendimento é obrigatório';
    }
    if (!formData.cliente?.trim()) {
      newErrors.cliente = 'Cliente é obrigatório';
    }

    console.log('🔍 Validação:', { formData, newErrors });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🔄 Iniciando submit do formulário...');
    console.log('🔄 FormData atual:', formData);

    if (!validateForm()) {
      console.log('❌ Formulário possui erros de validação');
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ Preparar dados apenas com campos do banco
      const dataToSend = {
        nome: formData.nome.trim(),
        cliente: formData.cliente.trim(),
        endereco: formData.endereco?.trim() || '',
        status: formData.status || 'em_planejamento'
      };

      console.log('🚀 Dados a serem enviados:', dataToSend);

      let resultado;

      if (empreendimento?.id) {
        // Editar empreendimento existente
        console.log('🔄 Atualizando empreendimento:', empreendimento.id);
        resultado = await EmpreendimentoDB.update(empreendimento.id, dataToSend);
      } else {
        // Criar novo empreendimento
        console.log('🔄 Criando novo empreendimento:', dataToSend);
        resultado = await EmpreendimentoDB.create(dataToSend);
      }

      console.log('✅ Operação concluída:', resultado);

      // Mostrar mensagem de sucesso
      alert('✅ Empreendimento salvo com sucesso!');

      // Chamar callback de sucesso
      if (onSuccess && typeof onSuccess === 'function') {
        console.log('🔄 Chamando onSuccess...');
        await onSuccess(resultado);
      }

      // Fechar o modal após sucesso
      if (onClose && typeof onClose === 'function') {
        console.log('🔄 Fechando modal...');
        onClose();
      }

    } catch (error) {
      console.error('❌ Erro ao salvar empreendimento:', error);

      let errorMessage = 'Erro ao salvar empreendimento.';

      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Servidor offline. Execute: node src/entities/working-server.js';
      } else if (error.message?.includes('404')) {
        errorMessage = `Rota /api/${EMPREENDIMENTO_ENDPOINT} não encontrada.`;
      } else if (error.message?.includes('400')) {
        errorMessage = error.message || 'Dados inválidos.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert('❌ ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garantir que formData sempre existe para o render
  const safeFormData = formData || getInitialFormData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {empreendimento ? "Editar Empreendimento" : "Novo Empreendimento"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nome do Empreendimento */}
          <div className="space-y-1">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
              Nome do Empreendimento *
            </label>
            <input
              id="nome"
              type="text"
              value={safeFormData.nome}
              onChange={(e) => handleInputChange("nome", e.target.value)}
              placeholder="Digite o nome do empreendimento"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.nome ? 'border-red-500' : 'border-gray-300'
                }`}
              required
            />
            {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
              Cliente *
            </label>
            <input
              id="cliente"
              type="text"
              value={safeFormData.cliente}
              onChange={(e) => handleInputChange("cliente", e.target.value)}
              placeholder="Nome do cliente"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.cliente ? 'border-red-500' : 'border-gray-300'
                }`}
              required
            />
            {errors.cliente && <p className="text-xs text-red-500">{errors.cliente}</p>}
          </div>

          {/* Endereço */}
          <div className="space-y-1">
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              id="endereco"
              type="text"
              value={safeFormData.endereco}
              onChange={(e) => handleInputChange("endereco", e.target.value)}
              placeholder="Endereço completo do empreendimento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={safeFormData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="em_planejamento">Em Planejamento</option>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="concluido">Concluído</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>

        </form>
      </motion.div>
    </motion.div>
  );
}
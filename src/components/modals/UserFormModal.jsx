import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, User, Mail, Shield, Eye, EyeOff } from 'lucide-react';

const UserFormModal = ({ isOpen, onClose, onSave, editingUser }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    full_name: '',
    role: 'user',
    ativo: true,
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        ...editingUser,
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        full_name: '',
        role: 'user',
        ativo: true,
        password: '',
        confirmPassword: ''
      });
    }
    setErrors({});
  }, [editingUser, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!editingUser && !formData.password) {
      newErrors.password = 'Senha é obrigatória para novos usuários';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('Salvando usuário:', formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="card-style m-0 border-0 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.nome ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nome do usuário"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                />
              </div>
              {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome completo do usuário"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Papel *
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                >
                  <option value="user">Usuário</option>
                  <option value="lider">Líder</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite a senha"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {formData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirme a senha"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => handleChange('ativo', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Usuário ativo
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Mail, Shield, User, Calendar, Edit, Trash2 } from 'lucide-react';

const UserDetailsModal = ({ isOpen, onClose, user, onEdit, onDelete, currentUser }) => {
  if (!isOpen || !user) return null;

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'lider': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'lider': return 'Líder';
      case 'user': return 'Usuário';
      default: return 'Indefinido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="card-style m-0 border-0 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Detalhes do Usuário</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {user.nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{user.nome}</h3>
                <p className="text-gray-600">{user.full_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${user.ativo ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className={`text-sm ${user.ativo ? 'text-green-600' : 'text-gray-500'}`}>
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Papel no Sistema</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                    {getRoleText(user.role)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">ID do Usuário</p>
                  <p className="font-medium">#{user.id}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Estatísticas</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">--</p>
                  <p className="text-sm text-gray-500">Projetos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">--</p>
                  <p className="text-sm text-gray-500">Horas</p>
                </div>
              </div>
            </div>

            {currentUser?.role === 'admin' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    onEdit(user);
                    onClose();
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => {
                    onDelete(user);
                    onClose();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
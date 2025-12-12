import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import UsuarioForm from '@/components/usuarios/UsuarioForm';
import UsuarioCard from '@/components/usuarios/UsuarioCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Usuario } from "@/entities/all";

export default function Usuarios() {
  // Estado para controlar edição
  const [editId, setEditId] = useState(null);
  // (Removido bloco duplicado de useState)
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', cargo: '', perfil: 'user', status: 'ativo' });
  const [isEdit, setIsEdit] = useState(false);

  // Handler para editar usuário
  function handleEdit(usuario) {
    setFormData({
      nome: usuario.nome || '',
      email: usuario.email || '',
      cargo: usuario.cargo || '',
      perfil: usuario.perfil || 'user',
      status: usuario.status || 'ativo',
    });
    setIsEdit(true);
    setEditId(usuario.id);
    setModalOpen(true);
  }

  // Handler para deletar usuário
  async function handleDelete(usuario) {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome || usuario.email}"?`)) {
      try {
        await Usuario.delete(usuario.id);
        loadUsuarios();
      } catch (err) {
        alert('Erro ao excluir usuário!');
      }
    }
  }

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Função para lidar com mudanças nos campos do formulário

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked ? 'ativo' : 'inativo',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  }

  // Filtro de usuários para busca e status (campos do backend real)
  const filteredUsuarios = usuarios.filter((u) => {
    const matchSearch =
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'ativo' && u.status === 'ativo') ||
      (statusFilter === 'inativo' && u.status !== 'ativo');
    return matchSearch && matchStatus;
  });


  useEffect(() => {
    loadUsuarios();
  }, []);

  // Função para carregar usuários
  async function loadUsuarios() {
    setLoading(true);
    setError(null);
    try {
      const data = await Usuario.list();
      setUsuarios(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  }

  // Função para submit do formulário
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (isEdit && editId) {
        await Usuario.update(editId, formData);
      } else {
        await Usuario.create(formData);
      }
      setModalOpen(false);
      setIsEdit(false);
      setEditId(null);
      loadUsuarios();
    } catch (err) {
      alert('Erro ao salvar usuário!');
    }
  }



  const openCreateModal = () => {
    setFormData({ nome: '', email: '', cargo: '', perfil: 'user', status: 'ativo' });
    setIsEdit(false);
    setEditId(null);
    setModalOpen(true);
  };
  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-600">Carregando usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-lg text-red-600">{error}</p>
        <Button onClick={loadUsuarios} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
              <p className="text-gray-600 mt-1">Gerencie os usuários do sistema</p>
            </div>
          </div>
          <Button className="flex items-center gap-2 h-10 px-5 text-white" onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>
        {modalOpen && (
          <UsuarioForm
            usuario={isEdit ? usuarios.find(u => u.id === editId) : null}
            onSubmit={async (data) => {
              // Forçar todos os campos esperados pelo backend
              const payload = {
                nome: data.nome || '',
                email: data.email || '',
                cargo: data.cargo || '',
                departamento: data.departamento || '',
                telefone: data.telefone || '',
                data_admissao: data.data_admissao || null,
                status: data.status || 'ativo',
                perfil: data.perfil || 'user',
                senha: data.senha || ''
              };
              if (isEdit && editId) {
                await Usuario.update(editId, payload);
              } else {
                await Usuario.create(payload);
              }
              setModalOpen(false);
              setIsEdit(false);
              setEditId(null);
              loadUsuarios();
            }}
            onCancel={() => setModalOpen(false)}
          />
        )}


        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 justify-items-stretch items-start w-full">
          {filteredUsuarios.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhum usuário encontrado ou cadastrado no sistema
              </p>
            </div>
          ) : (
            filteredUsuarios.map((usuario) => (
              <UsuarioCard
                key={usuario.id}
                usuario={usuario}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
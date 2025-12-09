import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Usuario } from "@/entities/all";
import { Activity, BarChart3, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
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
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const nome = usuario.nome || '';
    const email = usuario.email || '';
    const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || 
                         (statusFilter === 'ativo' && usuario.ativo) ||
                         (statusFilter === 'inativo' && !usuario.ativo);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Button onClick={loadUsuarios} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="p-6 md:p-8 h-full">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
                  <p className="text-gray-600 mt-1">
                    Gerencie os usuários do sistema e suas permissões
                  </p>
                </div>
              </div>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                    <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {usuarios.filter(u => u.ativo).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Administradores</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {usuarios.filter(u => u.role === 'admin').length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Inativos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {usuarios.filter(u => !u.ativo).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nome, email..."
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
            </CardContent>
          </Card>

          {/* Lista/Tabela de Usuários */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                Gerencie todos os usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsuarios.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'todos' 
                      ? 'Nenhum usuário encontrado com os filtros aplicados' 
                      : 'Nenhum usuário cadastrado no sistema'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-gray-600">Usuário</th>
                        <th className="text-left p-4 font-medium text-gray-600">Email</th>
                        <th className="text-left p-4 font-medium text-gray-600">Departamento</th>
                        <th className="text-left p-4 font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 font-medium text-gray-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsuarios.map((usuario) => (
                        <tr key={usuario.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {(usuario.nome || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{usuario.nome || 'Nome não informado'}</p>
                                <p className="text-sm text-gray-500">{usuario.cargo || 'Cargo não informado'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-600">{usuario.email || 'Email não informado'}</span>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={usuario.role === 'admin' ? 'destructive' : 'secondary'}
                            >
                              {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={usuario.ativo ? 'default' : 'secondary'}
                            >
                              {usuario.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" title="Visualizar">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise de Concepção - Nova Seção */}
          <div className="mt-8">
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Análise de Concepção</h2>
                  <p className="text-gray-600 mt-1">
                    Análise detalhada de performance e métricas do sistema
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Projetos Ativos</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Eficiência Média</p>
                      <p className="text-2xl font-bold text-green-600">87%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                      <p className="text-2xl font-bold text-orange-600">4.2h</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Alertas</p>
                      <p className="text-2xl font-bold text-red-600">3</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* Gráfico de Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance por Período
                  </CardTitle>
                  <CardDescription>
                    Análise de performance dos últimos 6 meses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Gráfico de performance será implementado aqui</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Análise de Tendências */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Tendências de Produtividade
                  </CardTitle>
                  <CardDescription>
                    Identificação de padrões e tendências
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-800">Tendência Positiva</p>
                        <p className="text-sm text-green-600">Aumento de 12% na eficiência</p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-800">Estabilidade</p>
                        <p className="text-sm text-blue-600">Tempo médio mantido</p>
                      </div>
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium text-orange-800">Atenção Necessária</p>
                        <p className="text-sm text-orange-600">Alguns projetos atrasados</p>
                      </div>
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Relatórios Detalhados */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Relatórios Detalhados</CardTitle>
                  <CardDescription>
                    Acesse relatórios específicos para análise aprofundada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                      <span>Relatório de Performance</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                      <span>Análise de Tendências</span>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 text-purple-600" />
                      <span>Relatório Executivo</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
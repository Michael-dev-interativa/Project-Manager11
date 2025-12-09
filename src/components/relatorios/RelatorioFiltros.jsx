
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, CalendarIcon, Users, X } from "lucide-react";
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Usuario } from "@/entities/all";

export default function RelatorioFiltros({ filtros, onFiltrosChange, podeVerTodosUsuarios, usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const setFiltros = useCallback((updater) => {
    onFiltrosChange(typeof updater === 'function' ? updater(filtros) : updater);
  }, [filtros, onFiltrosChange]);

  const loadUsuarios = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await Usuario.list();
      setUsuarios(data.filter(u => u.status === 'ativo'));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []); // No external dependencies, so empty array

  useEffect(() => {
    if (podeVerTodosUsuarios) {
      loadUsuarios();
    } else {
      // Para colaboradores, usar apenas o próprio usuário
      setFiltros(prev => ({
        ...prev,
        usuarios: [usuarioAtual?.email].filter(Boolean)
      }));
    }
  }, [podeVerTodosUsuarios, usuarioAtual, loadUsuarios, setFiltros]); // Added loadUsuarios and setFiltros

  const handlePeriodoChange = (periodo) => {
    setFiltros(prev => ({ ...prev, periodo }));
  };

  const handleDataChange = (data) => {
    setFiltros(prev => ({ ...prev, dataInicio: data }));
  };

  const handleUsuarioToggle = (email) => {
    setFiltros(prev => ({
      ...prev,
      usuarios: prev.usuarios.includes(email)
        ? prev.usuarios.filter(u => u !== email)
        : [...prev.usuarios, email]
    }));
  };

  const handleRemoverUsuario = (email) => {
    setFiltros(prev => ({
      ...prev,
      usuarios: prev.usuarios.filter(u => u !== email)
    }));
  };

  const getDataDisplay = () => {
    if (filtros.periodo === 'semana') {
      const inicio = startOfWeek(filtros.dataInicio, { locale: ptBR });
      const fim = endOfWeek(filtros.dataInicio, { locale: ptBR });
      return `${format(inicio, 'dd/MM')} - ${format(fim, 'dd/MM/yyyy')}`;
    } else {
      return format(filtros.dataInicio, 'MMMM yyyy', { locale: ptBR });
    }
  };

  return (
    <Card className="bg-white border-0 shadow-lg mb-6">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Filter className="w-5 h-5 text-purple-600" />
          Filtros do Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Período */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Período</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filtros.periodo === 'semana' ? 'default' : 'outline'}
                onClick={() => handlePeriodoChange('semana')}
                className="flex-1"
              >
                Semana
              </Button>
              <Button
                size="sm"
                variant={filtros.periodo === 'mes' ? 'default' : 'outline'}
                onClick={() => handlePeriodoChange('mes')}
                className="flex-1"
              >
                Mês
              </Button>
            </div>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {getDataDisplay()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filtros.dataInicio}
                  onSelect={handleDataChange}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tipo de Relatório */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <Select value={filtros.tipoRelatorio} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoRelatorio: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detalhado">Detalhado</SelectItem>
                <SelectItem value="resumo">Resumo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuários (apenas para admin/lider) */}
          {podeVerTodosUsuarios && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Usuários</label>
              <Select onValueChange={handleUsuarioToggle}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuários..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(usuario => (
                    <SelectItem
                      key={usuario.id}
                      value={usuario.email}
                      disabled={filtros.usuarios.includes(usuario.email)}
                    >
                      {usuario.nome || usuario.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Usuários Selecionados */}
        {podeVerTodosUsuarios && filtros.usuarios.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Usuários Selecionados:</label>
            <div className="flex flex-wrap gap-2">
              {filtros.usuarios.map(email => {
                const usuario = usuarios.find(u => u.email === email);
                return (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {usuario?.nome || email}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() => handleRemoverUsuario(email)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

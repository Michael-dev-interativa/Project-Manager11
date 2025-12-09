import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, TrendingUp, AlertCircle, Building2, User as UserIcon, MessageSquare } from 'lucide-react';

import { Execucao, Usuario, Empreendimento, Atividade, Documento, PlanejamentoAtividade } from "@/entities/all";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, parseISO, isAfter, isBefore, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, RefreshCw, Filter, ChevronDown, ChevronRight, TrendingDown } from 'lucide-react';
import { retryWithBackoff, delay } from '../components/utils/apiUtils';

export default function Relatorios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [execucoes, setExecucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    usuario: '',
    empreendimento: '',
    periodo: 'mes'
  });
  const [dataInicio, setDataInicio] = useState(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState(endOfMonth(new Date()));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usuariosData, empreendimentosData, execucoesData] = await Promise.all([
        Usuario.list(),
        Empreendimento.list(),
        Execucao.list()
      ]);

      setUsuarios(usuariosData || []);
      setEmpreendimentos(empreendimentosData || []);
      setExecucoes(execucoesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados dos relatórios:', error);
      setError('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((key, value) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handlePeriodoChange = useCallback((periodo) => {
    const today = new Date();
    
    switch (periodo) {
      case 'semana':
        setDataInicio(startOfWeek(today, { locale: ptBR }));
        setDataFim(endOfWeek(today, { locale: ptBR }));
        break;
      case 'mes':
        setDataInicio(startOfMonth(today));
        setDataFim(endOfMonth(today));
        break;
      case 'custom':
        // Manter datas atuais para seleção customizada
        break;
      default:
        break;
    }
    
    handleFilterChange('periodo', periodo);
  }, [handleFilterChange]);

  const exportarRelatorio = useCallback(async (formato = 'csv') => {
    try {
      console.log('Exportando relatório em formato:', formato);
      // Aqui você implementaria a lógica de exportação
      alert(`Exportação em ${formato.toUpperCase()} será implementada em breve`);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    }
  }, []);

  const aplicarFiltros = useCallback(() => {
    if (!execucoes.length) return [];

    return execucoes.filter(execucao => {
      // Filtro por usuário
      if (filtros.usuario && execucao.usuario_id !== parseInt(filtros.usuario)) {
        return false;
      }

      // Filtro por empreendimento
      if (filtros.empreendimento && execucao.empreendimento_id !== parseInt(filtros.empreendimento)) {
        return false;
      }

      // Filtro por período
      if (execucao.data_execucao) {
        const dataExecucao = parseISO(execucao.data_execucao);
        return isWithinInterval(dataExecucao, {
          start: dataInicio,
          end: dataFim
        });
      }

      return true;
    });
  }, [execucoes, filtros, dataInicio, dataFim]);

  const execucoesFiltradas = aplicarFiltros();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Análise e acompanhamento de execuções
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportarRelatorio('csv')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => exportarRelatorio('pdf')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro por Usuário */}
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select 
                value={filtros.usuario} 
                onValueChange={(value) => handleFilterChange('usuario', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os usuários</SelectItem>
                  {usuarios.map(usuario => (
                    <SelectItem key={usuario.id} value={usuario.id.toString()}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Empreendimento */}
            <div className="space-y-2">
              <Label>Empreendimento</Label>
              <Select 
                value={filtros.empreendimento} 
                onValueChange={(value) => handleFilterChange('empreendimento', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os empreendimentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os empreendimentos</SelectItem>
                  {empreendimentos.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select 
                value={filtros.periodo} 
                onValueChange={handlePeriodoChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão de aplicar filtros */}
            <div className="flex items-end">
              <Button 
                onClick={loadData} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Seleção de datas customizada */}
          {filtros.periodo === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Execuções</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execucoesFiltradas.length}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Executadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {execucoesFiltradas.reduce((total, exec) => total + (exec.horas_executadas || 0), 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo total executado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(execucoesFiltradas.map(exec => exec.usuario_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Execuções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Execuções Detalhadas
          </CardTitle>
          <CardDescription>
            Lista completa das execuções no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {execucoesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma execução encontrada para os filtros selecionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Data</th>
                    <th className="text-left p-4">Usuário</th>
                    <th className="text-left p-4">Empreendimento</th>
                    <th className="text-left p-4">Atividade</th>
                    <th className="text-left p-4">Horas</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {execucoesFiltradas.map((execucao, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {execucao.data_execucao ? format(parseISO(execucao.data_execucao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </td>
                      <td className="p-4">
                        {usuarios.find(u => u.id === execucao.usuario_id)?.nome || '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {empreendimentos.find(e => e.id === execucao.empreendimento_id)?.nome || '-'}
                        </div>
                      </td>
                      <td className="p-4">{execucao.atividade || '-'}</td>
                      <td className="p-4">{execucao.horas_executadas || 0}h</td>
                      <td className="p-4">
                        <Badge variant={execucao.status === 'concluida' ? 'success' : 'secondary'}>
                          {execucao.status || 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

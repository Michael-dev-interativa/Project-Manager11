import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, TrendingUp, AlertCircle, Building2, User as UserIcon, MessageSquare } from 'lucide-react';

// Removido uso de entidades locais; vamos consumir o backend via REST
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/relatorios/StatusBadge";
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
    usuario: 'all',
    empreendimento: 'all',
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
      // Busca via backend local
      const [usuariosRes, empreendimentosRes, execucoesRes] = await Promise.all([
        fetch('http://localhost:3001/api/Usuario', { credentials: 'include' }),
        fetch('http://localhost:3001/api/Empreendimento', { credentials: 'include' }),
        fetch('http://localhost:3001/api/Execucao', { credentials: 'include' })
      ]);

      if (!usuariosRes.ok || !empreendimentosRes.ok || !execucoesRes.ok) {
        throw new Error('Falha ao buscar dados do backend');
      }

      const usuariosData = await usuariosRes.json();
      const empreendimentosData = await empreendimentosRes.json();
      const execucoesRaw = await execucoesRes.json();

      // Normalizações:
      // - `usuario`: pode vir em diferentes colunas; backend já normaliza
      // - `tempo_total`: segundos -> horas
      // - `data_execucao`: derivar de `inicio` quando disponível
      const execucoesData = (execucoesRaw || []).map(e => {
        const tempoSeg = Number(e.tempo_total || 0);
        const horas = tempoSeg > 0 ? (tempoSeg / 3600) : 0;
        const inicioISO = e.inicio || e.data_execucao || null;
        return {
          ...e,
          horas_executadas: Number(horas.toFixed(2)),
          data_execucao: inicioISO || null,
          usuario_id: e.usuario_id ?? null, // pode não existir; usamos `usuario` como string
        };
      });

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

  // Mover aplicação de filtros para cima para evitar TDZ
  const aplicarFiltros = useCallback(() => {
    if (!execucoes.length) return [];

    return execucoes.filter(execucao => {
      // Filtro por usuário
      if (filtros.usuario && filtros.usuario !== 'all') {
        // Tenta comparar por id se existir; senão, compara por email/nome quando disponível
        const idMatch = execucao.usuario_id && execucao.usuario_id === parseInt(filtros.usuario);
        const usuarioObj = usuarios.find(u => u.id?.toString() === filtros.usuario);
        const strMatch = usuarioObj && (execucao.usuario === usuarioObj.email || execucao.usuario === usuarioObj.nome);
        if (!idMatch && !strMatch) return false;
      }

      // Filtro por empreendimento
      if (filtros.empreendimento && filtros.empreendimento !== 'all' && execucao.empreendimento_id !== parseInt(filtros.empreendimento)) {
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
  }, [execucoes, filtros, dataInicio, dataFim, usuarios]);

  const exportarRelatorio = useCallback((formato = 'csv') => {
    try {
      const execs = aplicarFiltros();
      const rows = execs.map(exec => {
        const usuarioNome = usuarios.find(u => u.id === exec.usuario_id)?.nome || exec.usuario || 'N/A';
        const empreendimentoNome = empreendimentos.find(e => e.id === exec.empreendimento_id)?.nome || 'N/A';
        const dataStr = exec.data_execucao ? format(parseISO(exec.data_execucao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
        return {
          Data: dataStr,
          Usuário: usuarioNome,
          Empreendimento: empreendimentoNome,
          Atividade: exec.atividade || exec.atividade_nome || '-',
          Horas: (exec.horas_executadas || 0).toFixed(2),
          Status: exec.status || 'Pendente'
        };
      });

      if (formato === 'csv') {
        // Usar delimitador ';' (Excel pt-BR) e BOM para evitar problemas de acentuação
        const headers = Object.keys(rows[0] || { Data: '', Usuário: '', Empreendimento: '', Atividade: '', Horas: '', Status: '' });
        const delimiter = ';';
        const escapeCell = (val) => {
          const s = String(val ?? '')
            .replace(/\r?\n/g, ' ')
            .replace(/"/g, '""');
          return /[";\n]/.test(s) ? `"${s}"` : s;
        };
        const csvBody = [headers.join(delimiter)]
          .concat(
            rows.map(r => headers.map(h => escapeCell(r[h])).join(delimiter))
          )
          .join('\r\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_execucoes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      if (formato === 'pdf') {
        // Exportação simples via impressão do conteúdo em uma nova janela
        const htmlTable = `
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Relatório de Execuções</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                h1 { font-size: 18px; margin-bottom: 12px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                th { background: #f5f5f5; text-align: left; }
              </style>
            </head>
            <body>
              <h1>Relatório de Execuções</h1>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Usuário</th>
                    <th>Empreendimento</th>
                    <th>Atividade</th>
                    <th>Horas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                    <tr>
                      <td>${r.Data}</td>
                      <td>${r["Usuário"]}</td>
                      <td>${r.Empreendimento}</td>
                      <td>${r.Atividade}</td>
                      <td>${r.Horas}</td>
                      <td>${r.Status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <script>window.onload = () => { window.print(); }<\/script>
            </body>
          </html>`;
        const win = window.open('', '_blank');
        if (win) {
          win.document.open();
          win.document.write(htmlTable);
          win.document.close();
        }
        return;
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório.');
    }
  }, [usuarios, empreendimentos, aplicarFiltros]);

  // Helper para normalizar e exibir status amigável
  const formatStatus = useCallback((exec) => {
    let s = exec.status || exec.estado || exec.situacao || '';
    if (!s) {
      const hasTermino = !!exec.termino;
      const hasTempo = (exec.tempo_total ?? 0) > 0;
      if (hasTermino && hasTempo) s = 'concluido';
      else if (hasTempo && !hasTermino) s = 'em_andamento';
      else s = 'pendente';
    }
    return s;
  }, []);

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
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
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
      <Card className="overflow-hidden">
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
                  <SelectItem value="all">Todos os usuários</SelectItem>
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
                  <SelectItem value="all">Todos os empreendimentos</SelectItem>
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
                  <PopoverContent className="w-80 md:w-96 p-2 z-50 bg-white shadow-lg rounded-md" align="start" side="bottom" sideOffset={8}>
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                      className="rounded-md border border-gray-200"
                      classNames={{
                        caption: 'text-center font-medium',
                        nav_button: 'rounded-md hover:bg-gray-100',
                        head_cell: 'text-gray-500 text-xs font-medium',
                        table: 'w-full',
                        row: 'mt-2',
                        day: 'rounded-md hover:bg-gray-100 transition-colors',
                        day_selected: 'bg-blue-600 text-white rounded-md hover:bg-blue-700',
                        day_today: 'border border-gray-300',
                      }}
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
                  <PopoverContent className="w-80 md:w-96 p-2 z-50 bg-white shadow-lg rounded-md" align="start" side="bottom" sideOffset={8}>
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      locale={ptBR}
                      className="rounded-md border border-gray-200"
                      classNames={{
                        caption: 'text-center font-medium',
                        nav_button: 'rounded-md hover:bg-gray-100',
                        head_cell: 'text-gray-500 text-xs font-medium',
                        table: 'w-full',
                        row: 'mt-2',
                        day: 'rounded-md hover:bg-gray-100 transition-colors',
                        day_selected: 'bg-blue-600 text-white rounded-md hover:bg-blue-700',
                        day_today: 'border border-gray-300',
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Resumo no estilo desejado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execucoesFiltradas.length}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
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
            <p className="text-xs text-muted-foreground">Tempo total executado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {execucoesFiltradas.filter(e => String(e.status || '').toLowerCase().includes('atras')).length}
            </div>
            <p className="text-xs text-muted-foreground">Somatório no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Concluídas</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {execucoesFiltradas.filter(e => {
                const s = String(e.status || '').toLowerCase();
                return s === 'concluido' || s === 'finalizado' || s === 'concluida';
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Finalizadas no período</p>
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
                        {usuarios.find(u => u.id === execucao.usuario_id)?.nome || execucao.usuario || '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {empreendimentos.find(e => e.id === execucao.empreendimento_id)?.nome || execucao.empreendimento_nome || '-'}
                        </div>
                      </td>
                      <td className="p-4">{execucao.atividade || execucao.atividade_nome || execucao.documento_nome || execucao.descritivo || '-'}</td>
                      <td className="p-4">{(execucao.horas_executadas || 0).toFixed(2)}h</td>
                      <td className="p-4">
                        <StatusBadge status={formatStatus(execucao)} />
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

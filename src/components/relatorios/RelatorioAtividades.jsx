
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, User, Building2, Download, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Execucao, Analitico, Usuario, Empreendimento, Documento } from "@/entities/all";

export default function RelatorioAtividades({ filtros, podeVerTodosUsuarios, usuarioAtual }) {
  const [execucoes, setExecucoes] = useState([]);
  const [dadosEnriquecidos, setDadosEnriquecidos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const enriquecerDados = useCallback(async (execucoesData) => {
    try {
      // Carregar dados relacionados
      const [analiticos, usuarios, empreendimentos, documentos] = await Promise.all([
        Analitico.list(null, 5000),
        Usuario.list(),
        Empreendimento.list(),
        Documento.list(null, 5000)
      ]);

      // Criar mapas
      const analiticosMap = analiticos.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
      const usuariosMap = usuarios.reduce((acc, item) => ({ ...acc, [item.email]: item }), {});
      const empreendimentosMap = empreendimentos.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
      const documentosMap = documentos.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

      // Enriquecer execuções
      const dadosEnriquecidos = execucoesData.map(exec => {
        const analitico = exec.analitico_id ? analiticosMap[exec.analitico_id] : null;
        const documento = analitico?.documento_id ? documentosMap[analitico.documento_id] : null;
        const empreendimento = exec.empreendimento_id ? empreendimentosMap[exec.empreendimento_id] : null;
        const usuario = usuariosMap[exec.usuario];

        return {
          ...exec,
          analitico,
          documento,
          empreendimento,
          usuario,
          nomeAtividade: exec.descritivo || 'Atividade não identificada',
          tempoFormatado: exec.tempo_total ? `${exec.tempo_total.toFixed(1)}h` : '0h',
          dataFormatada: exec.inicio ? format(new Date(exec.inicio), 'dd/MM/yyyy HH:mm') : 'N/A',
          dataApenas: exec.inicio ? format(new Date(exec.inicio), 'dd/MM/yyyy') : 'N/A'
        };
      });

      setDadosEnriquecidos(dadosEnriquecidos);

    } catch (error) {
      console.error("Erro ao enriquecer dados:", error);
    }
  }, []); // Dependencies: Analitico, Usuario, Empreendimento, Documento are stable imports.

  const loadRelatorio = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calcular intervalo de datas
      let dataInicio, dataFim;
      if (filtros.periodo === 'semana') {
        dataInicio = startOfWeek(filtros.dataInicio, { locale: ptBR });
        dataFim = endOfWeek(filtros.dataInicio, { locale: ptBR });
      } else {
        dataInicio = startOfMonth(filtros.dataInicio);
        dataFim = endOfMonth(filtros.dataInicio);
      }

      // Buscar execuções no período
      const todasExecucoes = await Execucao.list("-inicio", 5000);
      
      // Filtrar por período e usuários
      const execucoesFiltradas = todasExecucoes.filter(exec => {
        if (!exec.inicio) return false;
        
        const dataExecucao = new Date(exec.inicio);
        const dentroIntervalo = isWithinInterval(dataExecucao, { start: dataInicio, end: dataFim });
        
        if (!dentroIntervalo) return false;

        // Filtrar por usuários
        if (podeVerTodosUsuarios) {
          if (filtros.usuarios.length > 0) {
            return filtros.usuarios.includes(exec.usuario);
          }
          return true;
        } else {
          // Colaboradores veem apenas suas próprias atividades
          return exec.usuario === usuarioAtual?.email;
        }
      });

      setExecucoes(execucoesFiltradas);

      // Enriquecer dados
      await enriquecerDados(execucoesFiltradas);

    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filtros, podeVerTodosUsuarios, usuarioAtual, enriquecerDados]); // Dependencies for loadRelatorio

  useEffect(() => {
    loadRelatorio();
  }, [loadRelatorio]); // Dependency: loadRelatorio, which is now memoized

  const exportarCSV = () => {
    if (dadosEnriquecidos.length === 0) {
      alert("Não há dados para exportar");
      return;
    }

    const headers = [
      'Data',
      'Usuário',
      'Atividade',
      'Empreendimento',
      'Documento',
      'Tempo (horas)',
      'Status',
      'Usuário Ajudado',
      'Observação'
    ];

    const csvData = dadosEnriquecidos.map(item => [
      item.dataFormatada,
      item.usuario?.nome || item.usuario,
      item.nomeAtividade,
      item.empreendimento?.nome || 'N/A',
      item.documento?.numero || 'N/A',
      item.tempo_total || 0,
      item.status || 'N/A',
      item.usuario_ajudado || 'N/A',
      item.observacao || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const periodoText = filtros.periodo === 'semana' ? 'semana' : 'mes';
    const dataText = format(filtros.dataInicio, filtros.periodo === 'semana' ? 'yyyy-MM-dd' : 'yyyy-MM');
    link.setAttribute('download', `relatorio-atividades-${periodoText}-${dataText}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const colors = {
      "Em andamento": "bg-blue-100 text-blue-800",
      "Finalizado": "bg-green-100 text-green-800",
      "Paralisado": "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const periodoDisplay = filtros.periodo === 'semana' ? 'Semana' : 'Mês';
  const dataDisplay = format(filtros.dataInicio, 
    filtros.periodo === 'semana' ? "'Semana de' dd/MM/yyyy" : "MMMM 'de' yyyy", 
    { locale: ptBR }
  );

  return (
    <Card className="bg-white border-0 shadow-lg">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FileText className="w-5 h-5 text-purple-600" />
            Relatório de Atividades - {periodoDisplay}
          </CardTitle>
          <Button 
            onClick={exportarCSV} 
            variant="outline"
            disabled={dadosEnriquecidos.length === 0}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
        <p className="text-gray-600 text-sm">{dataDisplay}</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : dadosEnriquecidos.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  {podeVerTodosUsuarios && <TableHead>Usuário</TableHead>}
                  <TableHead>Atividade</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuário Ajudado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosEnriquecidos.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{item.dataFormatada}</span>
                      </div>
                    </TableCell>
                    {podeVerTodosUsuarios && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {item.usuario?.nome || item.usuario}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {item.nomeAtividade}
                      </span>
                      {item.observacao && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.observacao}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.empreendimento ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{item.empreendimento.nome}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.documento ? (
                        <span className="text-sm text-blue-600">
                          {item.documento.numero}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.tempoFormatado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.usuario_ajudado ? (
                        <span className="text-sm text-purple-600">
                          {item.usuario_ajudado}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma atividade encontrada
            </h3>
            <p className="text-gray-500">
              Não há registros de atividades para o período selecionado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, User, TrendingUp, Activity, Target, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Execucao, Usuario } from "@/entities/all";

export default function RelatorioResumo({ filtros, podeVerTodosUsuarios, usuarioAtual }) {
  const [resumo, setResumo] = useState({
    totalHoras: 0,
    totalAtividades: 0,
    horasPorUsuario: [],
    horasPorStatus: [],
    horasPorDia: [],
    mediaDiaria: 0,
    usuarioMaisAtivo: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const calcularResumo = useCallback(async () => {
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

      // Buscar execuções
      const todasExecucoes = await Execucao.list("-inicio", 5000);
      const execucoesFiltradas = todasExecucoes.filter(exec => {
        if (!exec.inicio) return false;
        
        const dataExecucao = new Date(exec.inicio);
        const dentroIntervalo = isWithinInterval(dataExecucao, { start: dataInicio, end: dataFim });
        
        if (!dentroIntervalo) return false;

        if (podeVerTodosUsuarios) {
          if (filtros.usuarios.length > 0) {
            return filtros.usuarios.includes(exec.usuario);
          }
          return true;
        } else {
          return exec.usuario === usuarioAtual?.email;
        }
      });

      // Calcular resumo
      const totalHoras = execucoesFiltradas.reduce((sum, exec) => sum + (Number(exec.tempo_total) || 0), 0);
      const totalAtividades = execucoesFiltradas.length;

      // Horas por usuário
      const horasPorUsuario = Object.entries(
        execucoesFiltradas.reduce((acc, exec) => {
          const email = exec.usuario;
          acc[email] = (acc[email] || 0) + (Number(exec.tempo_total) || 0);
          return acc;
        }, {})
      ).map(([email, horas]) => ({
        usuario: email,
        horas: Math.round(horas * 10) / 10,
        atividades: execucoesFiltradas.filter(e => e.usuario === email).length
      })).sort((a, b) => b.horas - a.horas);

      // Horas por status
      const horasPorStatus = Object.entries(
        execucoesFiltradas.reduce((acc, exec) => {
          const status = exec.status || 'N/A';
          acc[status] = (acc[status] || 0) + (Number(exec.tempo_total) || 0);
          return acc;
        }, {})
      ).map(([status, horas]) => ({
        status,
        horas: Math.round(horas * 10) / 10
      }));

      // Horas por dia
      const diasPeriodo = eachDayOfInterval({ start: dataInicio, end: dataFim });
      const horasPorDia = diasPeriodo.map(dia => {
        const dataFormatada = format(dia, 'yyyy-MM-dd');
        const horasDoDia = execucoesFiltradas
          .filter(exec => exec.inicio && format(new Date(exec.inicio), 'yyyy-MM-dd') === dataFormatada)
          .reduce((sum, exec) => sum + (Number(exec.tempo_total) || 0), 0);
        
        return {
          data: format(dia, 'dd/MM'),
          horas: Math.round(horasDoDia * 10) / 10
        };
      });

      const diasComTrabalho = horasPorDia.filter(d => d.horas > 0).length;
      const mediaDiaria = diasComTrabalho > 0 ? totalHoras / diasComTrabalho : 0;

      const usuarioMaisAtivo = horasPorUsuario.length > 0 ? horasPorUsuario[0] : null;

      setResumo({
        totalHoras: Math.round(totalHoras * 10) / 10,
        totalAtividades,
        horasPorUsuario: horasPorUsuario.slice(0, 5), // Top 5
        horasPorStatus,
        horasPorDia: horasPorDia.filter(d => d.horas > 0), // Apenas dias com trabalho
        mediaDiaria: Math.round(mediaDiaria * 10) / 10,
        usuarioMaisAtivo
      });

    } catch (error) {
      console.error("Erro ao calcular resumo:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filtros, podeVerTodosUsuarios, usuarioAtual]);

  useEffect(() => {
    calcularResumo();
  }, [calcularResumo]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Horas</p>
                <p className="text-3xl font-bold text-purple-600">{resumo.totalHoras}h</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Atividades</p>
                <p className="text-3xl font-bold text-blue-600">{resumo.totalAtividades}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Média Diária</p>
                <p className="text-3xl font-bold text-green-600">{resumo.mediaDiaria}h</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usuário Mais Ativo */}
      {podeVerTodosUsuarios && resumo.usuarioMaisAtivo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuário Mais Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {resumo.usuarioMaisAtivo.usuario}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{resumo.usuarioMaisAtivo.horas}h trabalhadas</span>
                  <span>{resumo.usuarioMaisAtivo.atividades} atividades</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Horas por Dia */}
      {resumo.horasPorDia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumo.horasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(label) => `Dia ${label}`}
                    formatter={(value) => [`${value}h`, 'Horas']}
                  />
                  <Bar dataKey="horas" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking de Usuários */}
      {podeVerTodosUsuarios && resumo.horasPorUsuario.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resumo.horasPorUsuario.map((item, index) => (
                <div key={item.usuario} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-gray-900">{item.usuario}</p>
                      <p className="text-sm text-gray-600">{item.atividades} atividades</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {item.horas}h
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status das Atividades */}
      {resumo.horasPorStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumo.horasPorStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between p-2">
                  <span className="text-sm text-gray-700">{item.status}</span>
                  <Badge variant="outline">{item.horas}h</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

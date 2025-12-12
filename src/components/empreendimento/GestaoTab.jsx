import React, { useMemo, useState, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Grid3x3, DollarSign } from "lucide-react";
import { ActivityTimerContext } from "@/components/contexts/ActivityTimerContext";

export default function GestaoTab({ empreendimento, documentos = [], planejamentos = [], atividades = [], execucoes = [], onUpdate, pavimentos = [], usuarios = [] }) {
  const [valorHora, setValorHora] = useState(0);
  const { isAdmin } = useContext(ActivityTimerContext) || { isAdmin: true };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const matrizDisciplinasEtapas = useMemo(() => {
    const etapasOrdenadas = ['Estudo Preliminar', 'Ante-Projeto', 'Projeto Básico', 'Projeto Executivo', 'Liberado para Obra'];
    const disciplinasSet = new Set();
    documentos.forEach(doc => { if (doc.disciplina) disciplinasSet.add(doc.disciplina); });
    const disciplinas = Array.from(disciplinasSet).sort();

    const matriz = {};
    disciplinas.forEach(d => { matriz[d] = {}; etapasOrdenadas.forEach(e => { matriz[d][e] = { horasPlanejadas: 0, horasExecutadas: 0 }; }); });

    const pavimentosMap = {}; (pavimentos || []).forEach(p => { pavimentosMap[p.id] = p; });

    documentos.forEach(doc => {
      const disciplinaDoc = doc.disciplina;
      const subdisciplinasDoc = doc.subdisciplinas || [];
      const fatorDificuldade = doc.fator_dificuldade || 1;
      let areaPavimento = 1;
      if (doc.pavimento_id && pavimentosMap[doc.pavimento_id]) areaPavimento = parseFloat(pavimentosMap[doc.pavimento_id].area) || 1;
      else if (doc.area) areaPavimento = parseFloat(doc.area) || 1;

      const atividadesAplicaveis = (atividades || []).filter(ativ => {
        const isGlobal = !ativ.empreendimento_id;
        const disciplinaMatch = ativ.disciplina === disciplinaDoc;
        const subdisciplinaMatch = (subdisciplinasDoc || []).includes(ativ.subdisciplina);
        return isGlobal && disciplinaMatch && subdisciplinaMatch;
      });

      atividadesAplicaveis.forEach(ativ => {
        const etapa = ativ.etapa; const tempoBase = parseFloat(ativ.tempo) || 0;
        const tempoPlanejado = tempoBase * areaPavimento * fatorDificuldade;
        if (matriz[disciplinaDoc] && matriz[disciplinaDoc][etapa]) matriz[disciplinaDoc][etapa].horasPlanejadas += tempoPlanejado;
      });

      const planejamentosDoDocumento = (planejamentos || []).filter(p => p.documento_id === doc.id);
      planejamentosDoDocumento.forEach(plano => {
        const etapa = plano.etapa; const tempoExecutado = plano.tempo_executado || 0;
        if (matriz[disciplinaDoc] && matriz[disciplinaDoc][etapa]) matriz[disciplinaDoc][etapa].horasExecutadas += tempoExecutado;
      });
    });

    const totaisPorDisciplina = {}; disciplinas.forEach(d => {
      let tp = 0, te = 0; etapasOrdenadas.forEach(e => { tp += matriz[d][e].horasPlanejadas; te += matriz[d][e].horasExecutadas; });
      totaisPorDisciplina[d] = { planejado: tp, executado: te, percentual: tp > 0 ? Math.round((te / tp) * 100) : 0 };
    });
    const totaisPorEtapa = {}; etapasOrdenadas.forEach(e => {
      let tp = 0, te = 0; disciplinas.forEach(d => { tp += matriz[d][e].horasPlanejadas; te += matriz[d][e].horasExecutadas; });
      totaisPorEtapa[e] = { planejado: tp, executado: te, percentual: tp > 0 ? Math.round((te / tp) * 100) : 0 };
    });
    let totalGeralPlanejado = 0, totalGeralExecutado = 0; disciplinas.forEach(d => { totalGeralPlanejado += totaisPorDisciplina[d].planejado; totalGeralExecutado += totaisPorDisciplina[d].executado; });

    return { matriz, disciplinas, etapas: etapasOrdenadas, totaisPorDisciplina, totaisPorEtapa, totalGeral: { planejado: totalGeralPlanejado, executado: totalGeralExecutado, percentual: totalGeralPlanejado > 0 ? Math.round((totalGeralExecutado / totalGeralPlanejado) * 100) : 0 } };
  }, [documentos, atividades, planejamentos, execucoes, pavimentos]);

  React.useEffect(() => {
    const v = parseFloat(empreendimento?.valor_hora);
    if (!isNaN(v) && v >= 0) setValorHora(v);
  }, [empreendimento?.valor_hora]);

  const salvarValorHora = async () => {
    try {
      const payload = { valor_hora: valorHora };
      const res = await fetch(`http://localhost:3001/api/Empreendimento/${empreendimento?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Falha ao salvar valor hora');
    } catch (e) {
      console.error('Erro ao salvar valor por hora:', e);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Configuração de Valor Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="valorHora" className="text-sm font-medium">Valor por Hora (R$/h)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <Input id="valorHora" type="number" min="0" step="0.01" value={valorHora || ''} onChange={(e) => setValorHora(parseFloat(e.target.value) || 0)} className="pl-10" placeholder="0,00" />
              </div>
            </div>
            <button onClick={salvarValorHora} className="mt-6 rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700">Salvar</button>
            {valorHora > 0 && (
              <div className="text-sm text-gray-600 mt-6">
                <span className="font-medium">Total Planejado:</span> {formatCurrency(matrizDisciplinasEtapas.totalGeral.planejado * valorHora)} |
                <span className="font-medium ml-2">Total Executado:</span> {formatCurrency(matrizDisciplinasEtapas.totalGeral.executado * valorHora)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Grid3x3 className="w-5 h-5 text-blue-600" /> Matriz de Horas: Etapas x Disciplinas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold sticky left-0 bg-gray-100 z-10">Etapa / Disciplina</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold bg-blue-50">TOTAL</th>
                  {matrizDisciplinasEtapas.disciplinas.map(disciplina => (<th key={disciplina} className="border border-gray-300 p-3 text-center font-semibold">{disciplina}</th>))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-xs text-gray-600 sticky left-0 bg-gray-50 z-10"></th>
                  <th className="border border-gray-300 p-2 text-xs text-gray-600 bg-blue-50">%</th>
                  {matrizDisciplinasEtapas.disciplinas.map(disciplina => (<th key={disciplina} className="border border-gray-300 p-2 text-xs text-gray-600">Planejado</th>))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50 font-semibold">
                  <td className="border border-gray-300 p-3 sticky left-0 bg-blue-100 z-10">TOTAL</td>
                  <td className="border border-gray-300 p-3 text-center">{matrizDisciplinasEtapas.totalGeral.percentual}%</td>
                  {matrizDisciplinasEtapas.disciplinas.map(disciplina => {
                    const horas = matrizDisciplinasEtapas.totaisPorDisciplina[disciplina].planejado; return (
                      <td key={disciplina} className="border border-gray-300 p-3 text-center">
                        <div>{horas.toFixed(1)}h</div>
                        {valorHora > 0 && (<div className="text-xs text-green-700 font-normal">{formatCurrency(horas * valorHora)}</div>)}
                      </td>
                    );
                  })}
                </tr>
                {matrizDisciplinasEtapas.etapas.map((etapa, idx) => (
                  <tr key={etapa} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-3 font-medium sticky left-0 bg-inherit z-10">{etapa}</td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">{matrizDisciplinasEtapas.totaisPorEtapa[etapa].percentual}%</td>
                    {matrizDisciplinasEtapas.disciplinas.map(disciplina => {
                      const dados = matrizDisciplinasEtapas.matriz[disciplina][etapa]; const temDados = dados.horasPlanejadas > 0; return (
                        <td key={disciplina} className={`border border-gray-300 p-3 text-center ${!temDados ? 'text-gray-400' : ''}`}>
                          <div>{dados.horasPlanejadas > 0 ? dados.horasPlanejadas.toFixed(1) : '0'}</div>
                          {valorHora > 0 && dados.horasPlanejadas > 0 && (<div className="text-xs text-green-700">{formatCurrency(dados.horasPlanejadas * valorHora)}</div>)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matrizDisciplinasEtapas.disciplinas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum dado disponível para exibir a matriz.</p>
              <p className="text-sm mt-2">Cadastre documentos com disciplinas para visualizar as informações.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Grid3x3 className="w-5 h-5 text-green-600" /> Horas Reais Executadas por Etapa e Disciplina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold sticky left-0 bg-gray-100 z-10">Etapa / Disciplina</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold bg-green-50">TOTAL</th>
                  {matrizDisciplinasEtapas.disciplinas.map(disciplina => (<th key={disciplina} className="border border-gray-300 p-3 text-center font-semibold">{disciplina}</th>))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50 font-semibold">
                  <td className="border border-gray-300 p-3 sticky left-0 bg-green-100 z-10">TOTAL</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <div>{matrizDisciplinasEtapas.totalGeral.executado.toFixed(1)}h</div>
                    {valorHora > 0 && (<div className="text-xs text-green-700 font-normal">{formatCurrency(matrizDisciplinasEtapas.totalGeral.executado * valorHora)}</div>)}
                  </td>
                  {matrizDisciplinasEtapas.disciplinas.map(disciplina => {
                    const horas = matrizDisciplinasEtapas.totaisPorDisciplina[disciplina].executado; return (
                      <td key={disciplina} className="border border-gray-300 p-3 text-center">
                        <div>{horas.toFixed(1)}h</div>
                        {valorHora > 0 && horas > 0 && (<div className="text-xs text-green-700 font-normal">{formatCurrency(horas * valorHora)}</div>)}
                      </td>
                    );
                  })}
                </tr>
                {matrizDisciplinasEtapas.etapas.map((etapa, idx) => (
                  <tr key={etapa} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-3 font-medium sticky left-0 bg-inherit z-10">{etapa}</td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">
                      <div>{matrizDisciplinasEtapas.totaisPorEtapa[etapa].executado.toFixed(1)}h</div>
                      {valorHora > 0 && matrizDisciplinasEtapas.totaisPorEtapa[etapa].executado > 0 && (<div className="text-xs text-green-700 font-normal">{formatCurrency(matrizDisciplinasEtapas.totaisPorEtapa[etapa].executado * valorHora)}</div>)}
                    </td>
                    {matrizDisciplinasEtapas.disciplinas.map(disciplina => {
                      const dados = matrizDisciplinasEtapas.matriz[disciplina][etapa]; const temDados = dados.horasExecutadas > 0; return (
                        <td key={disciplina} className={`border border-gray-300 p-3 text-center ${temDados ? 'font-medium text-green-700' : 'text-gray-400'}`}>
                          <div>{dados.horasExecutadas > 0 ? dados.horasExecutadas.toFixed(1) : '0'}</div>
                          {valorHora > 0 && dados.horasExecutadas > 0 && (<div className="text-xs">{formatCurrency(dados.horasExecutadas * valorHora)}</div>)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matrizDisciplinasEtapas.disciplinas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum dado executado disponível.</p>
              <p className="text-sm mt-2">Execute atividades para visualizar as horas reais.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Clock, Calendar, Users, Zap, Upload } from "lucide-react";
import { retryWithBackoff } from "@/components/utils/apiUtils";
import { Atividade } from "@/entities/all";
import { Empreendimento } from "@/entities/all"; // Importar a entidade Empreendimento

export default function ConfiguracaoTab({ empreendimentoId }) { // Prop simplificada
  const [empreendimento, setEmpreendimento] = useState(null);
  const [config, setConfig] = useState({
    horasPorDia: 8,
    incluirFinsDeSemana: false,
    horasSemanais: 40,
    diasTrabalho: 5,
    autoAjustarPrazos: true,
    notificarAtrasos: true,
    margeMSeguranca: 10 // percentual
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEmpreendimento, setIsFetchingEmpreendimento] = useState(true);

  // Importação de atividades (Excel/CSV)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDestino, setImportDestino] = useState('catalogo'); // 'catalogo' | 'projeto'

  useEffect(() => {
    if (empreendimentoId) {
      setIsFetchingEmpreendimento(true);

      Empreendimento.list() // Usar a entidade Empreendimento para buscar
        .then(data => {
          const currentEmp = data.find(e => e.id === empreendimentoId);
          setEmpreendimento(currentEmp || null);
          // Opcional: Carregar configurações existentes para este empreendimento
          // if (currentEmp && currentEmp.configuracoes) {
          //   setConfig(prev => ({ ...prev, ...currentEmp.configuracoes }));
          // }
        })
        .catch(err => {
          console.error("Erro ao buscar empreendimento", err); // Mensagem de erro atualizada
          setEmpreendimento(null);
        })
        .finally(() => setIsFetchingEmpreendimento(false));
    } else {
      setIsFetchingEmpreendimento(false); // No empreendimentoId, nada para buscar
      setEmpreendimento(null);
    }
  }, [empreendimentoId]); // Remover fetchEmpreendimentos do array de dependências

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Aqui você salvaria as configurações no banco de dados, associadas ao empreendimentoId
      // Por exemplo, em uma entidade ConfiguracaoPlanejamento
      console.log("Salvando configurações para empreendimento:", empreendimentoId, config);

      // Simular delay de salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert("Configurações salvas com sucesso!");
      // Não é necessário onRefresh, pois a aba é autônoma
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar configurações. Tente novamente.");
    }
    setIsLoading(false);
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isFetchingEmpreendimento) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Carregando configurações...</p>
      </div>
    );
  }

  // Opcional: Renderizar algo diferente se não houver empreendimentoId ou o empreendimento não for encontrado
  if (!empreendimentoId || !empreendimento) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Nenhum empreendimento selecionado ou encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Importar Atividades via Excel/CSV */}
      <Card className="bg-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            Importar Atividades (Excel/CSV)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Importe atividades para o catálogo global ou para o projeto atual.
              Formato esperado: colunas
              <span className="font-medium"> id_atividade, etapa, disciplina, subdisciplina, atividade, predecessora, tempo, funcao</span>.
            </div>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Arquivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Importar Atividades</h2>
            <div className="space-y-3 mb-4">
              <label className="text-sm font-medium">Destino</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={importDestino}
                onChange={(e) => setImportDestino(e.target.value)}
              >
                <option value="catalogo">Catálogo (global)</option>
                <option value="projeto">Projeto atual ({empreendimento?.nome || 'ID ' + empreendimentoId})</option>
              </select>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mb-4 w-full"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImportModal(false)} disabled={isImporting}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  if (!importFile) {
                    alert('Selecione um arquivo para importar');
                    return;
                  }
                  setIsImporting(true);
                  try {
                    // Import dinâmico para reduzir bundle inicial
                    const XLSX = await import('xlsx');
                    const isCSV = importFile.name.toLowerCase().endsWith('.csv');
                    let rows = [];
                    if (isCSV) {
                      const text = await importFile.text();
                      const lines = text.split('\n').filter(l => l.trim());
                      const sep = lines[0].includes(';') ? ';' : ',';
                      const headers = lines[0].split(sep).map(h => h.trim());
                      for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(sep).map(v => v.trim());
                        const row = {};
                        headers.forEach((h, idx) => row[h] = values[idx] || '');
                        rows.push(row);
                      }
                    } else {
                      const data = await importFile.arrayBuffer();
                      const wb = XLSX.read(data, { type: 'array' });
                      const sheetName = wb.SheetNames[0];
                      const sheet = wb.Sheets[sheetName];
                      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    }

                    const required = ['id_atividade', 'etapa', 'disciplina', 'subdisciplina', 'atividade', 'predecessora', 'tempo', 'funcao'];
                    const normalized = rows.map(r => {
                      const obj = { ...r };
                      // normalizar possíveis variações de cabeçalho
                      obj.id_atividade = obj.id_atividade ?? obj.id ?? obj.codigo ?? '';
                      obj.etapa = obj.etapa ?? obj.fase ?? '';
                      obj.disciplina = obj.disciplina ?? '';
                      obj.subdisciplina = obj.subdisciplina ?? obj.sub_disciplina ?? '';
                      obj.atividade = obj.atividade ?? obj.descricao ?? obj.nome ?? '';
                      obj.predecessora = obj.predecessora ?? obj.predecessor ?? obj.depende ?? '';
                      obj.tempo = obj.tempo ?? obj.duracao ?? obj.duração ?? obj.horas ?? 0;
                      obj.funcao = obj.funcao ?? obj.função ?? '';
                      return obj;
                    });

                    let sucessos = 0, falhas = 0;
                    for (const r of normalized) {
                      try {
                        const payload = {
                          id_atividade: r.id_atividade || null,
                          etapa: r.etapa || '',
                          disciplina: r.disciplina || '',
                          subdisciplina: r.subdisciplina || '',
                          atividade: r.atividade || '',
                          predecessora: r.predecessora || null,
                          tempo: r.tempo ? parseFloat(r.tempo) : 0,
                          funcao: r.funcao || '',
                          origem: importDestino === 'projeto' ? 'projeto' : 'catalogo',
                          empreendimento_id: importDestino === 'projeto' ? empreendimentoId : null
                        };
                        await retryWithBackoff(() => Atividade.create(payload), 3, 500, 'importAtividade');
                        sucessos++;
                      } catch (e) {
                        console.warn('[IMPORT ATIVIDADE] falha:', e);
                        falhas++;
                      }
                    }
                    alert(`Importação concluída!\n\nSucessos: ${sucessos}\nFalhas: ${falhas}`);
                    setShowImportModal(false);
                  } catch (err) {
                    alert(`Erro ao processar arquivo: ${err.message}`);
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={!importFile || isImporting}
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Configurações de Trabalho */}
      <Card className="bg-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Configurações de Jornada de Trabalho {empreendimento?.nome ? `para ${empreendimento.nome}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="horasPorDia">Horas por Dia</Label>
              <Input
                id="horasPorDia"
                type="number"
                step="0.5"
                value={config.horasPorDia}
                onChange={(e) => handleConfigChange('horasPorDia', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Quantas horas de trabalho por dia útil
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horasSemanais">Horas Semanais</Label>
              <Input
                id="horasSemanais"
                type="number"
                value={config.horasSemanais}
                onChange={(e) => handleConfigChange('horasSemanais', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Total de horas trabalhadas por semana
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diasTrabalho">Dias de Trabalho por Semana</Label>
              <Input
                id="diasTrabalho"
                type="number"
                min="1"
                max="7"
                value={config.diasTrabalho}
                onChange={(e) => handleConfigChange('diasTrabalho', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Quantos dias por semana são trabalhados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="margem">Margem de Segurança (%)</Label>
              <Input
                id="margem"
                type="number"
                min="0"
                max="50"
                value={config.margeMSeguranca}
                onChange={(e) => handleConfigChange('margeMSeguranca', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Percentual adicional para prazos
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Incluir Fins de Semana</h4>
                <p className="text-sm text-gray-500">
                  Permitir planejamento de atividades em sábados e domingos
                </p>
              </div>
              <Switch
                checked={config.incluirFinsDeSemana}
                onCheckedChange={(value) => handleConfigChange('incluirFinsDeSemana', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Auto-ajustar Prazos</h4>
                <p className="text-sm text-gray-500">
                  Ajustar automaticamente os prazos quando houver alterações
                </p>
              </div>
              <Switch
                checked={config.autoAjustarPrazos}
                onCheckedChange={(value) => handleConfigChange('autoAjustarPrazos', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Notificar Atrasos</h4>
                <p className="text-sm text-gray-500">
                  Enviar notificações quando atividades estiverem atrasadas
                </p>
              </div>
              <Switch
                checked={config.notificarAtrasos}
                onCheckedChange={(value) => handleConfigChange('notificarAtrasos', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo das Configurações */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Resumo das Configurações</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span><strong>{config.horasPorDia}h</strong> por dia</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span><strong>{config.diasTrabalho}</strong> dias/semana</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span><strong>+{config.margeMSeguranca}%</strong> margem</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Documento } from "@/entities/all";
import retryWithBackoff from "@/utils/retryWithBackoff";

export default function DocumentoForm({
  doc,
  documento,
  empreendimentoId,
  empreendimentoNome,
  onClose,
  onSave,
  disciplinas = [],
  atividades: allAtividades = [],
  pavimentos = [],
  documentos = []
}) {
  // Unificar possível alias vindo do chamador
  const currentDoc = doc || documento || null;
  const [formData, setFormData] = useState({
    numero: "",
    arquivo: "",
    descritivo: "",
    pavimento_id: null,
    disciplina: "",
    subdisciplinas: [],
    escala: "",
    fator_dificuldade: 1,
    tempo_total: 0,
    tempo_estudo_preliminar: 0,
    tempo_ante_projeto: 0,
    tempo_projeto_basico: 0,
    tempo_projeto_executivo: 0,
    tempo_liberado_obra: 0,
    tempo_concepcao: 0,
    tempo_planejamento: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Normalização para comparação sem acentos/caixa/espaços
  const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  useEffect(() => {
    if (currentDoc) {
      setFormData({
        numero: currentDoc.numero || "",
        arquivo: currentDoc.arquivo || "",
        descritivo: currentDoc.descritivo || "",
        pavimento_id: currentDoc.pavimento_id || null,
        disciplina: currentDoc.disciplina || "",
        subdisciplinas: Array.isArray(currentDoc.subdisciplinas)
          ? currentDoc.subdisciplinas
          : (currentDoc.subdisciplinas
            ? String(currentDoc.subdisciplinas).split(',').map(s => s.trim()).filter(Boolean)
            : (currentDoc.subdisciplina
              ? String(currentDoc.subdisciplina).split(',').map(s => s.trim()).filter(Boolean)
              : [])),
        escala: currentDoc.escala || "",
        fator_dificuldade: currentDoc.fator_dificuldade || 1,
        tempo_total: currentDoc.tempo_total || 0,
        tempo_estudo_preliminar: currentDoc.tempo_estudo_preliminar || 0,
        tempo_ante_projeto: currentDoc.tempo_ante_projeto || 0,
        tempo_projeto_basico: currentDoc.tempo_projeto_basico || 0,
        tempo_projeto_executivo: currentDoc.tempo_projeto_executivo || 0,
        tempo_liberado_obra: currentDoc.tempo_liberado_obra || 0,
        tempo_concepcao: currentDoc.tempo_concepcao || 0,
        tempo_planejamento: currentDoc.tempo_planejamento || 0
      });
    }
  }, [currentDoc]);

  // Overrides por empreendimento
  const etapaOverridesMap = useMemo(() => {
    const map = new Map();
    (allAtividades || []).forEach(ativ => {
      if (ativ.empreendimento_id === empreendimentoId && ativ.id_atividade && ativ.tempo !== -999) {
        map.set(ativ.id_atividade, ativ.etapa);
      }
    });
    return map;
  }, [allAtividades, empreendimentoId]);

  const tempoOverridesMap = useMemo(() => {
    const map = new Map();
    (allAtividades || []).forEach(ativ => {
      if (ativ.empreendimento_id === empreendimentoId && ativ.id_atividade && ativ.tempo !== -999) {
        map.set(ativ.id_atividade, ativ.tempo);
      }
    });
    return map;
  }, [allAtividades, empreendimentoId]);

  const temposCalculados = useMemo(() => {
    if (!formData.disciplina || formData.subdisciplinas.length === 0) {
      return {
        total: 0,
        concepcao: 0,
        planejamento: 0,
        estudo_preliminar: 0,
        ante_projeto: 0,
        projeto_basico: 0,
        projeto_executivo: 0,
        liberado_obra: 0
      };
    }

    const pavimento = (pavimentos || []).find(p => p.id === formData.pavimento_id);
    const areaPavimento = pavimento ? Number(pavimento.area) : null;

    const atividadesRelacionadas = (allAtividades || []).filter(ativ => {
      const isGenericActivity = !ativ.empreendimento_id;
      if (!isGenericActivity) return false;
      const disciplinaMatch = normalize(ativ.disciplina) === normalize(formData.disciplina);
      const subdisciplinaMatch = formData.subdisciplinas.some(sub => normalize(sub) === normalize(ativ.subdisciplina));
      if (!disciplinaMatch || !subdisciplinaMatch) return false;

      const exclusoes = (allAtividades || []).filter(s_ativ =>
        s_ativ.empreendimento_id === empreendimentoId &&
        s_ativ.id_atividade === ativ.id &&
        s_ativ.tempo === -999
      );
      const exclusaoGlobal = exclusoes.find(exc => !exc.documento_id);
      if (exclusaoGlobal) return false;
      if (currentDoc?.id) {
        const exclusaoEspecifica = exclusoes.find(exc => exc.documento_id === doc.id);
        if (exclusaoEspecifica) return false;
      }
      return true;
    });

    const fatorDificuldade = parseFloat(formData.fator_dificuldade) || 1;
    const tempos = {
      total: 0,
      concepcao: 0,
      planejamento: 0,
      estudo_preliminar: 0,
      ante_projeto: 0,
      projeto_basico: 0,
      projeto_executivo: 0,
      liberado_obra: 0
    };

    atividadesRelacionadas.forEach(ativ => {
      let tempoBase = parseFloat(ativ.tempo) || 0;
      if (tempoOverridesMap.has(ativ.id)) tempoBase = parseFloat(tempoOverridesMap.get(ativ.id)) || 0;
      const tempoCalculado = areaPavimento && areaPavimento > 0
        ? tempoBase * areaPavimento * fatorDificuldade
        : tempoBase * fatorDificuldade;
      const etapaFinal = etapaOverridesMap.has(ativ.id) ? etapaOverridesMap.get(ativ.id) : ativ.etapa;
      switch (etapaFinal) {
        case 'Concepção':
          tempos.concepcao += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Planejamento':
          tempos.planejamento += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Estudo Preliminar':
          tempos.estudo_preliminar += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Ante-Projeto':
          tempos.ante_projeto += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Projeto Básico':
          tempos.projeto_basico += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Projeto Executivo':
          tempos.projeto_executivo += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        case 'Liberado para Obra':
          tempos.liberado_obra += tempoCalculado;
          tempos.total += tempoCalculado;
          break;
        default:
          break;
      }
    });

    Object.keys(tempos).forEach(key => { tempos[key] = Number(tempos[key].toFixed(2)); });
    return tempos;
  }, [formData.disciplina, formData.subdisciplinas, formData.fator_dificuldade, formData.pavimento_id, allAtividades, pavimentos, etapaOverridesMap, tempoOverridesMap, empreendimentoId, currentDoc]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      tempo_concepcao: temposCalculados.concepcao,
      tempo_planejamento: temposCalculados.planejamento,
      tempo_estudo_preliminar: temposCalculados.estudo_preliminar,
      tempo_ante_projeto: temposCalculados.ante_projeto,
      tempo_projeto_basico: temposCalculados.projeto_basico,
      tempo_projeto_executivo: temposCalculados.projeto_executivo,
      tempo_liberado_obra: temposCalculados.liberado_obra,
      tempo_total: temposCalculados.total
    }));
  }, [temposCalculados]);

  const subdisciplinasDisponiveis = useMemo(() => {
    if (!formData.disciplina) return [];
    const actividadesDaDisciplina = (allAtividades || []).filter(ativ => {
      // Aceitar atividades de catálogo (sem empreendimento) ou específicas do empreendimento atual
      const pertenceAoCatalogo = !ativ.empreendimento_id;
      const pertenceAoProjeto = empreendimentoId && (Number(ativ.empreendimento_id) === Number(empreendimentoId));
      const disciplinaMatch = normalize(ativ.disciplina) === normalize(formData.disciplina);
      return disciplinaMatch && (pertenceAoCatalogo || pertenceAoProjeto);
    });
    // Debug: quantidades e amostras
    try {
      console.log('[DocumentoForm] Disciplina selecionada:', formData.disciplina);
      console.log('[DocumentoForm] Atividades totais:', (allAtividades || []).length);
      console.log('[DocumentoForm] Atividades da disciplina:', actividadesDaDisciplina.length);
      console.log('[DocumentoForm] Exemplos:', actividadesDaDisciplina.slice(0, 3));
    } catch (e) { }
    const subs = new Set();

    // Função auxiliar para adicionar candidatos a subdisciplinas de forma robusta
    const addCandidate = (cand) => {
      if (!cand) return;
      if (Array.isArray(cand)) {
        cand.forEach(s => { const v = String(s).trim(); if (v) subs.add(v); });
      } else if (typeof cand === 'string') {
        let handled = false;
        if (/^\s*\[.*\]\s*$/.test(cand)) {
          try {
            const arr = JSON.parse(cand);
            if (Array.isArray(arr)) {
              arr.forEach(s => { const v = String(s).trim(); if (v) subs.add(v); });
              handled = true;
            }
          } catch { /* ignore */ }
        }
        if (!handled) {
          cand.split(',').map(s => s.trim()).filter(Boolean).forEach(v => subs.add(v));
        }
      }
    };

    // 1) Caminho principal: derivar a partir das atividades cuja DISCIPLINA = selecionada
    actividadesDaDisciplina.forEach(ativ => {
      // Preferir campo subdisciplina; fallbacks secundários se existirem
      let cand = ativ.subdisciplina ?? ativ.descritivo ?? ativ.subdisciplinas ?? '';
      addCandidate(cand);
    });

    // 2) Fallback: se nada foi encontrado pela disciplina, considerar quando a seleção equivale à SUBDISCIPLINA
    if (subs.size === 0 && actividadesDaDisciplina.length === 0) {
      const atividadesPorSub = (allAtividades || []).filter(ativ => {
        const pertenceAoCatalogo = !ativ.empreendimento_id;
        const pertenceAoProjeto = empreendimentoId && (Number(ativ.empreendimento_id) === Number(empreendimentoId));
        const subMatch = normalize(ativ.subdisciplina) === normalize(formData.disciplina);
        return subMatch && (pertenceAoCatalogo || pertenceAoProjeto);
      });
      // Neste caso, oferecemos ao menos a própria seleção como opção de subdisciplina
      if (atividadesPorSub.length > 0) {
        subs.add(formData.disciplina);
      }
    }
    try { console.log('[DocumentoForm] Subdisciplinas derivadas:', Array.from(subs)); } catch (e) { }
    return Array.from(subs).sort();
  }, [formData.disciplina, allAtividades]);

  const validate = () => {
    const newErrors = {};
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório";
    if (!formData.arquivo.trim()) newErrors.arquivo = "Nome do arquivo é obrigatório";
    if (!formData.disciplina) newErrors.disciplina = "Disciplina é obrigatória";
    // Só exigir subdisciplinas se houver opções disponíveis para a disciplina
    if ((subdisciplinasDisponiveis || []).length > 0 && formData.subdisciplinas.length === 0) {
      newErrors.subdisciplinas = "Selecione ao menos uma subdisciplina";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const docData = {
        numero: formData.numero.trim(),
        arquivo: formData.arquivo.trim(),
        descritivo: formData.descritivo.trim(),
        pavimento_id: formData.pavimento_id,
        disciplina: formData.disciplina,
        subdisciplinas: formData.subdisciplinas,
        // Enviar escala como texto para evitar erro de trim no backend
        escala: formData.escala ? String(formData.escala) : '',
        fator_dificuldade: Number(formData.fator_dificuldade),
        empreendimento_id: empreendimentoId,
        tempo_total: Number(formData.tempo_total) || 0,
        tempo_concepcao: Number(formData.tempo_concepcao) || 0,
        tempo_planejamento: Number(formData.tempo_planejamento) || 0,
        tempo_estudo_preliminar: Number(formData.tempo_estudo_preliminar) || 0,
        tempo_ante_projeto: Number(formData.tempo_ante_projeto) || 0,
        tempo_projeto_basico: Number(formData.tempo_projeto_basico) || 0,
        tempo_projeto_executivo: Number(formData.tempo_projeto_executivo) || 0,
        tempo_liberado_obra: Number(formData.tempo_liberado_obra) || 0
      };

      let savedDoc;
      if (currentDoc?.id) {
        savedDoc = await retryWithBackoff(() => Documento.update(currentDoc.id, docData), 3, 500, 'updateDocumento');
      } else {
        savedDoc = await retryWithBackoff(() => Documento.create(docData), 3, 500, 'createDocumento');
      }
      onSave(savedDoc);
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      alert("Erro ao salvar documento. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubdisciplinaToggle = (subdisciplina) => {
    setFormData(prev => {
      const subdisciplinas = prev.subdisciplinas.includes(subdisciplina)
        ? prev.subdisciplinas.filter(s => s !== subdisciplina)
        : [...prev.subdisciplinas, subdisciplina];
      return { ...prev, subdisciplinas };
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
        <DialogContent className="dialog-content">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{currentDoc ? 'Editar Documento' : 'Novo Documento'}</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Documento *</Label>
                <Input id="numero" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} className={errors.numero ? 'border-red-500' : ''} placeholder="Ex: ARQ-01" required />
                {errors.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="arquivo">Nome do Arquivo *</Label>
                <Input id="arquivo" value={formData.arquivo} onChange={(e) => setFormData({ ...formData, arquivo: e.target.value })} className={errors.arquivo ? 'border-red-500' : ''} placeholder="Ex: Planta Baixa Térreo" required />
                {errors.arquivo && <p className="text-red-500 text-sm mt-1">{errors.arquivo}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descritivo">Descritivo</Label>
              <Input id="descritivo" value={formData.descritivo} onChange={(e) => setFormData({ ...formData, descritivo: e.target.value })} placeholder="Ex: Planta baixa do pavimento térreo com layout de móveis" />
              <p className="text-xs text-gray-500">Descrição detalhada do documento (opcional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pavimento_id">Pavimento (para cálculo de área)
                  {formData.pavimento_id && pavimentos && pavimentos.length > 0 && (
                    <span className="text-xs text-blue-600 ml-2">({pavimentos.find(p => p.id === formData.pavimento_id)?.area || 0} m²)</span>
                  )}
                </Label>
                <Select value={formData.pavimento_id || ''} onValueChange={(value) => setFormData({ ...formData, pavimento_id: value || null })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pavimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem pavimento (usar horas padrão)</SelectItem>
                    {pavimentos && pavimentos.length > 0 ? (
                      pavimentos.map(pav => (
                        <SelectItem key={pav.id} value={pav.id}>
                          {pav.nome} - {Number(pav.area).toFixed(0)}m²
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="nenhum" disabled>Nenhum pavimento cadastrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.pavimento_id ? "A área do pavimento será usada para calcular o tempo das atividades (tempo/m² × área)" : "Sem pavimento, será usado o tempo padrão das atividades (sem multiplicar pela área)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disciplina">Disciplina *</Label>
                <Select value={formData.disciplina} onValueChange={(value) => setFormData({ ...formData, disciplina: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  {/* Aumentar z-index do dropdown para sobrepor o modal */}
                  <SelectContent style={{ zIndex: 1100 }}>
                    {disciplinas.map(d => (<SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.disciplina && <p className="text-red-500 text-sm mt-1">{errors.disciplina}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="escala">Escala</Label>
                <Input id="escala" type="number" step="0.01" value={formData.escala} onChange={(e) => setFormData({ ...formData, escala: e.target.value })} placeholder="Ex: 100 (para 1:100)" />
                <p className="text-xs text-gray-500">Escala do documento (ex: 100 para 1:100) - Campo opcional</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fator_dificuldade">Fator de Dificuldade</Label>
                <Input id="fator_dificuldade" type="number" step="0.1" value={formData.fator_dificuldade} onChange={(e) => setFormData({ ...formData, fator_dificuldade: e.target.value })} />
              </div>
            </div>

            {formData.disciplina && subdisciplinasDisponiveis.length > 0 && (
              <div>
                <Label>Subdisciplinas * (selecione ao menos uma)</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                  {subdisciplinasDisponiveis.map(sub => (
                    <div key={sub} className="flex items-center space-x-2">
                      <Checkbox id={`sub-${sub}`} checked={formData.subdisciplinas.includes(sub)} onCheckedChange={() => handleSubdisciplinaToggle(sub)} />
                      <Label htmlFor={`sub-${sub}`} className="cursor-pointer">{sub}</Label>
                    </div>
                  ))}
                </div>
                {errors.subdisciplinas && <p className="text-red-500 text-sm mt-1">{errors.subdisciplinas}</p>}
              </div>
            )}

            {formData.subdisciplinas.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Tempos Calculados</h4>
                    <p className="text-sm text-blue-700">
                      Os tempos são calculados automaticamente com base nas atividades disponíveis para as subdisciplinas selecionadas.
                      {formData.pavimento_id && ' A área do pavimento é multiplicada pelo tempo padrão de cada atividade.'}
                      {!formData.pavimento_id && (
                        <span className="text-red-600 font-medium"> Sem pavimento selecionado, os tempos são baseados nos valores padrão das atividades multiplicado pelo fator de dificuldade.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Total</p><p className="font-bold text-blue-900">{temposCalculados.total.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Concepção</p><p className="font-bold">{temposCalculados.concepcao.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Planejamento</p><p className="font-bold">{temposCalculados.planejamento.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Estudo Preliminar</p><p className="font-bold">{temposCalculados.estudo_preliminar.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Ante-Projeto</p><p className="font-bold">{temposCalculados.ante_projeto.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Projeto Básico</p><p className="font-bold">{temposCalculados.projeto_basico.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Projeto Executivo</p><p className="font-bold">{temposCalculados.projeto_executivo.toFixed(1)}h</p></div>
                  <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-600">Liberado p/ Obra</p><p className="font-bold">{temposCalculados.liberado_obra.toFixed(1)}h</p></div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{currentDoc ? 'Atualizar Documento' : 'Criar Documento'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </div>
    </Dialog>
  );
}

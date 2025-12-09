import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Info, Building, Clock } from 'lucide-react';
import { Disciplina, Atividade } from '../../entities/all';

// Mock data para disciplinas e subdisciplinas


// Mock data para cálculos de tempo (horas base por subdisciplina)
const TEMPOS_BASE = {
  'Plantas': { concepcao: 8, planejamento: 4, estudo_preliminar: 12, ante_projeto: 16, projeto_basico: 20, projeto_executivo: 24, liberado_obra: 4 },
  'Cortes': { concepcao: 4, planejamento: 2, estudo_preliminar: 6, ante_projeto: 8, projeto_basico: 10, projeto_executivo: 12, liberado_obra: 2 },
  'Fachadas': { concepcao: 6, planejamento: 3, estudo_preliminar: 8, ante_projeto: 10, projeto_basico: 12, projeto_executivo: 16, liberado_obra: 3 },
  'Fundações': { concepcao: 10, planejamento: 5, estudo_preliminar: 15, ante_projeto: 20, projeto_basico: 25, projeto_executivo: 30, liberado_obra: 5 },
  'Iluminação': { concepcao: 5, planejamento: 3, estudo_preliminar: 8, ante_projeto: 12, projeto_basico: 15, projeto_executivo: 18, liberado_obra: 3 }
};

export default function DocumentoForm({
  documento,
  empreendimento,
  onSave,
  onClose
}) {
  // Estado para disciplinas e subdisciplinas reais
  const [disciplinas, setDisciplinas] = useState([]);
  const [subdisciplinas, setSubdisciplinas] = useState([]);
  const [formData, setFormData] = useState({
    numero: '',
    arquivo: '',
    disciplina: '',
    subdisciplinas: [],
    escala: '',
    fator_dificuldade: 1.0,
    area_referencia: 0,
    observacoes: '',
    pavimento: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});


  // Buscar disciplinas reais ao abrir o formulário
  useEffect(() => {
    async function fetchDisciplinas() {
      try {
        const data = await Disciplina.list();
        setDisciplinas(data);
      } catch (err) {
        setDisciplinas([]);
      }
    }
    fetchDisciplinas();
  }, []);

  // Buscar subdisciplinas reais ao selecionar disciplina
  useEffect(() => {
    async function fetchSubdisciplinas() {
      if (!formData.disciplina) {
        setSubdisciplinas([]);
        return;
      }
      try {
        // Busca atividades que tenham a disciplina selecionada
        const atividades = await Atividade.list({ disciplina: formData.disciplina });
        // Extrai subdisciplinas únicas das atividades
        const subs = Array.from(new Set(
          atividades
            .map(a => a.subdisciplina)
            .filter(Boolean)
            .flatMap(s => s.split(',').map(x => x.trim()))
        ));
        setSubdisciplinas(subs);
      } catch (err) {
        setSubdisciplinas([]);
      }
    }
    fetchSubdisciplinas();
  }, [formData.disciplina]);

  // Popular formulário quando editando
  useEffect(() => {
    if (documento) {
      let subs = documento.subdisciplinas;
      if (typeof subs === 'string') {
        subs = subs.split(',').map(s => s.trim()).filter(Boolean);
      } else if (!Array.isArray(subs)) {
        subs = [];
      }
      setFormData({
        numero: documento.numero || '',
        arquivo: documento.arquivo || '',
        disciplina: documento.disciplina || '',
        subdisciplinas: subs,
        escala: documento.escala || '',
        fator_dificuldade: documento.fator_dificuldade || 1.0,
        area_referencia: documento.area_referencia || 0,
        observacoes: documento.observacoes || '',
        pavimento: documento.pavimento || ''
      });
    }
  }, [documento]);


  // Subdisciplinas disponíveis agora vêm do backend
  const subdisciplinasDisponiveis = subdisciplinas;


  // Buscar atividades conforme disciplina e subdisciplinas selecionadas
  const [atividadesSelecionadas, setAtividadesSelecionadas] = useState([]);

  useEffect(() => {
    async function fetchAtividades() {
      if (!formData.disciplina || formData.subdisciplinas.length === 0) {
        setAtividadesSelecionadas([]);
        return;
      }
      try {
        // Busca todas as atividades da disciplina
        const atividades = await Atividade.list({ disciplina: formData.disciplina });
        // Filtra atividades que tenham subdisciplina igual a alguma selecionada
        const selecionadas = atividades.filter(a =>
          a.subdisciplina && formData.subdisciplinas.some(sub =>
            a.subdisciplina.split(',').map(s => s.trim()).includes(sub)
          )
        );
        setAtividadesSelecionadas(selecionadas);
      } catch (err) {
        setAtividadesSelecionadas([]);
      }
    }
    fetchAtividades();
  }, [formData.disciplina, formData.subdisciplinas]);

  // Log para depuração das atividades selecionadas
  useEffect(() => {
    console.log('Atividades selecionadas:', atividadesSelecionadas);
  }, [atividadesSelecionadas]);

  // Montar tempos a partir das atividades selecionadas
  const temposCalculados = useMemo(() => {
    if (atividadesSelecionadas.length === 0) {
      return {
        total: 0,
        estudo_preliminar: 0,
        ante_projeto: 0,
        projeto_basico: 0,
        projeto_executivo: 0,
        liberado_obra: 0,
        concepcao: 0,
        planejamento: 0
      };
    }
    let total = 0;
    let estudo_preliminar = 0;
    let ante_projeto = 0;
    let projeto_basico = 0;
    let projeto_executivo = 0;
    let liberado_obra = 0;
    let concepcao = 0;
    let planejamento = 0;
    atividadesSelecionadas.forEach(a => {
      const etapa = (a.etapa || '').toLowerCase();
      // Considera tanto 'duracao_padrao' quanto 'tempo' (string ou número)
      let duracao = 0;
      if (a.duracao_padrao !== undefined) {
        duracao = Number(a.duracao_padrao) || 0;
      } else if (a.tempo !== undefined) {
        duracao = Number(a.tempo) || 0;
      }
      total += duracao;
      if (etapa.includes('preliminar')) estudo_preliminar += duracao;
      else if (etapa.includes('ante')) ante_projeto += duracao;
      else if (etapa.includes('básico') || etapa.includes('basico')) projeto_basico += duracao;
      else if (etapa.includes('executivo')) projeto_executivo += duracao;
      else if (etapa.includes('liberado')) liberado_obra += duracao;
      else if (etapa.includes('concep')) concepcao += duracao;
      else if (etapa.includes('planejamento')) planejamento += duracao;
    });
    return {
      total,
      estudo_preliminar,
      ante_projeto,
      projeto_basico,
      projeto_executivo,
      liberado_obra,
      concepcao,
      planejamento
    };
  }, [atividadesSelecionadas]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.numero?.trim()) {
      newErrors.numero = 'Número do documento é obrigatório';
    }

    if (!formData.arquivo?.trim()) {
      newErrors.arquivo = 'Nome do arquivo é obrigatório';
    }

    if (!formData.disciplina) {
      newErrors.disciplina = 'Disciplina é obrigatória';
    }

    if (formData.subdisciplinas.length === 0) {
      newErrors.subdisciplinas = 'Selecione ao menos uma subdisciplina';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // ✅ MAPEAR PARA A ESTRUTURA DO BANCO
      const documentoData = {
        numero: formData.numero,
        arquivo: formData.arquivo,
        area: formData.area_referencia || '', // Mapear area_referencia para area
        disciplina: formData.disciplina,
        subdisciplinas: formData.subdisciplinas, // Será convertido para string na API
        escala: formData.escala,
        fator_dificuldade: parseFloat(formData.fator_dificuldade),
        empreendimento_id: empreendimento.id,
        pavimento: formData.pavimento,

        // ✅ TEMPOS CALCULADOS
        tempo_total: temposCalculados.total,
        tempo_estudo_preliminar: temposCalculados.estudo_preliminar,
        tempo_ante_projeto: temposCalculados.ante_projeto,
        tempo_projeto_executivo: temposCalculados.projeto_executivo,
        tempo_liberado_obra: temposCalculados.liberado_obra,
        tempo_concepcao: temposCalculados.concepcao,
        tempo_planejamento: temposCalculados.planejamento,

        // ✅ CAMPOS DE PLANEJAMENTO (inicialmente vazios)
        tempo_execucao_total: 0,
        predecessora_id: null,
        inicio_planejado: null,
        termino_planejado: null,
        multiplos_executores: false,
        executor_principal: null
      };

      console.log('💾 Salvando documento no banco:', documentoData);


      // Criação automática de atividades vinculadas ao documento
      if (!documento) {
        // Para cada subdisciplina selecionada, cria uma atividade vinculada
        for (const subdisciplina of formData.subdisciplinas) {
          const atividadeNova = {
            atividade: `Atividade de ${subdisciplina}`,
            etapa: '', // pode ser ajustado conforme necessário
            disciplina: formData.disciplina,
            subdisciplina,
            tempo: 0, // pode ser ajustado conforme cálculo
            funcao: '',
            empreendimento_id: empreendimento.id,
            documento_id: null, // será preenchido após salvar o documento
          };
          // Salva depois do documento salvo (precisa do id do documento)
          // Aqui apenas prepara, salvará após o onSave
        }
      }

      onSave(documentoData);

    } catch (error) {
      console.error('❌ Erro ao processar dados do documento:', error);
      alert('Erro ao processar dados. Verifique os campos e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {documento ? 'Editar Documento' : 'Novo Documento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info do Empreendimento */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Empreendimento:</span>
              <span className="text-blue-700">{empreendimento?.nome}</span>
            </div>
          </div>

          {/* Row 1: Número, Arquivo e Pavimento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                Número do Documento *
              </label>
              <input
                id="numero"
                type="text"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                placeholder="Ex: ARQ-001"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.numero ? 'border-red-500' : 'border-gray-300'
                  }`}
                required
                disabled={isSaving}
              />
              {errors.numero && <p className="text-xs text-red-500">{errors.numero}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="arquivo" className="block text-sm font-medium text-gray-700">
                Nome do Arquivo *
              </label>
              <input
                id="arquivo"
                type="text"
                value={formData.arquivo}
                onChange={(e) => handleInputChange('arquivo', e.target.value)}
                placeholder="Ex: Planta Baixa Térreo"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.arquivo ? 'border-red-500' : 'border-gray-300'
                  }`}
                required
                disabled={isSaving}
              />
              {errors.arquivo && <p className="text-xs text-red-500">{errors.arquivo}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="pavimento" className="block text-sm font-medium text-gray-700">
                Pavimento
              </label>
              <input
                id="pavimento"
                type="text"
                value={formData.pavimento}
                onChange={(e) => handleInputChange('pavimento', e.target.value)}
                placeholder="Ex: Térreo, 1º Andar, Cobertura"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Row 2: Disciplina e Escala */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700">
                Disciplina *
              </label>
              <select
                id="disciplina"
                value={formData.disciplina}
                onChange={(e) => {
                  handleInputChange('disciplina', e.target.value);
                  setFormData(prev => ({ ...prev, subdisciplinas: [] }));
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${errors.disciplina ? 'border-red-500' : 'border-gray-300'
                  }`}
                required
                disabled={isSaving}
              >
                <option value="">Selecione uma disciplina</option>
                {disciplinas.map(disciplina => (
                  <option key={disciplina.id} value={disciplina.nome}>
                    {disciplina.nome}
                  </option>
                ))}
              </select>
              {errors.disciplina && <p className="text-xs text-red-500">{errors.disciplina}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="escala" className="block text-sm font-medium text-gray-700">
                Escala
              </label>
              <input
                id="escala"
                type="text"
                value={formData.escala}
                onChange={(e) => handleInputChange('escala', e.target.value)}
                placeholder="Ex: 1:100, 1:50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Row 3: Fator e Área */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="fator_dificuldade" className="block text-sm font-medium text-gray-700">
                Fator de Dificuldade
              </label>
              <select
                id="fator_dificuldade"
                value={formData.fator_dificuldade}
                onChange={(e) => handleInputChange('fator_dificuldade', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isSaving}
              >
                <option value={0.5}>0.5 - Muito Fácil</option>
                <option value={0.75}>0.75 - Fácil</option>
                <option value={1}>1.0 - Normal</option>
                <option value={1.25}>1.25 - Difícil</option>
                <option value={1.5}>1.5 - Muito Difícil</option>
                <option value={2}>2.0 - Extremamente Difícil</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="area_referencia" className="block text-sm font-medium text-gray-700">
                Área de Referência (m²)
              </label>
              <input
                id="area_referencia"
                type="number"
                min="0"
                step="0.1"
                value={formData.area_referencia}
                onChange={(e) => handleInputChange('area_referencia', parseFloat(e.target.value) || 0)}
                placeholder="Ex: 150.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500">
                Área usada para cálculo de horas (0 = usar tempos base)
              </p>
            </div>
          </div>

          {/* Subdisciplinas */}
          {formData.disciplina && subdisciplinasDisponiveis.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Subdisciplinas * (selecione ao menos uma)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 border rounded-md bg-gray-50">
                {subdisciplinasDisponiveis.map(subdisciplina => (
                  <label key={subdisciplina} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subdisciplinas.includes(subdisciplina)}
                      onChange={() => handleSubdisciplinaToggle(subdisciplina)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-gray-700">{subdisciplina}</span>
                  </label>
                ))}
              </div>
              {errors.subdisciplinas && <p className="text-xs text-red-500">{errors.subdisciplinas}</p>}
            </div>
          )}

          {/* Tempos Calculados */}
          {formData.subdisciplinas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900">Tempos Calculados Automaticamente</h4>
                  <p className="text-sm text-blue-700">
                    Baseado nas subdisciplinas selecionadas, fator de dificuldade
                    {formData.area_referencia > 0 && ` e área de ${formData.area_referencia}m²`}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3 rounded border text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-medium text-gray-600">TOTAL</p>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{temposCalculados.total}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Estudo Prelim.</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.estudo_preliminar}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Ante-Projeto</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.ante_projeto}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Proj. Básico</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.projeto_basico || 0}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Proj. Executivo</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.projeto_executivo}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Liberado Obra</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.liberado_obra || 0}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Concepção</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.concepcao || 0}h</p>
                </div>

                <div className="bg-white p-3 rounded border text-center">
                  <p className="text-xs text-gray-600 mb-1">Planejamento</p>
                  <p className="font-semibold text-gray-900">{temposCalculados.planejamento || 0}h</p>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              id="observacoes"
              rows={3}
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o documento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSaving}
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {documento ? 'Atualizar Documento' : 'Criar Documento'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
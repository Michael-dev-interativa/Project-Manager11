
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { Atividade } from '@/entities/all';

export default function AtividadeFormModal({ isOpen, onClose, empreendimentoId, disciplinas = [], atividade = null, onSuccess, showTrigger = false, triggerLabel = 'Nova Atividade', triggerClassName = '' }) {
  // Lista padrão de etapas do projeto (pode ser evoluída para vir do backend)
  const ETAPAS_PADRAO = [
    'Planejamento',
    'Concepcao',
    'Estudo Preliminar',
    'Anteprojeto',
    'Projeto Basico',
    'Projeto Executivo',
    'As Built'
  ];
  const [form, setForm] = useState({
    atividade: '',
    etapa: '',
    disciplina: '',
    subdisciplina: '',
    funcao: '',
    tempo: '',
    id_atividade: '',
    empreendimento_id: empreendimentoId,
    predecessora: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = showTrigger ? internalOpen : !!isOpen;

  const modalRef = useRef(null);
  const titleId = `atividade-modal-title-${Math.random().toString(36).slice(2, 9)}`;
  const descId = `atividade-modal-desc-${Math.random().toString(36).slice(2, 9)}`;

  useEffect(() => {
    if (atividade) {
      setForm({
        atividade: atividade.atividade || '',
        etapa: atividade.etapa || '',
        disciplina: atividade.disciplina || '',
        subdisciplina: atividade.subdisciplina || '',
        funcao: atividade.funcao || '',
        tempo: atividade.tempo?.toString() || '',
        id_atividade: atividade.id_atividade || '',
        empreendimento_id: empreendimentoId,
        predecessora: atividade.predecessora || '',
      });
    } else {
      setForm({
        atividade: '',
        etapa: '',
        disciplina: '',
        subdisciplina: '',
        funcao: '',
        tempo: '',
        id_atividade: '',
        empreendimento_id: empreendimentoId,
        predecessora: '',
      });
    }
  }, [atividade, empreendimentoId, isOpen]);

  // Removido o foco automático do campo
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          if (modalRef.current) modalRef.current.scrollTop = 0;
        } catch (err) { }
      }, 0);
    }
  }, [open]);

  const openModal = () => {
    if (showTrigger) setInternalOpen(true);
  };
  const closeModal = () => {
    if (showTrigger) setInternalOpen(false);
    if (!showTrigger && onClose) onClose();
    if (showTrigger && onClose) onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Construir payload para o API
      const dataToSave = {
        id_atividade: form.id_atividade || null,
        etapa: form.etapa || '',
        disciplina: form.disciplina || '',
        subdisciplina: form.subdisciplina || '',
        atividade: form.atividade || '',
        predecessora: form.predecessora || '',
        tempo: form.tempo ? Number(form.tempo) : 0,
        funcao: form.funcao || '',
        empreendimento_id: form.empreendimento_id || empreendimentoId,
        // Marcador explícito para distinguir atividades criadas pelo modal do projeto
        origem: 'projeto'
      };
      console.log('AtividadeFormModal - Sending to API', dataToSave);
      const atividadePkValue = atividade?.id ?? atividade?.id_atividade;
      let savedActivity;
      if (atividade && atividadePkValue) {
        savedActivity = await Atividade.update(atividadePkValue, dataToSave);
      } else {
        savedActivity = await Atividade.create(dataToSave);
      }
      if (onSuccess) onSuccess(savedActivity);
      if (showTrigger) setInternalOpen(false);
      else if (onClose) onClose();
    } catch (error) {
      console.error('AtividadeFormModal - Erro ao salvar atividade:', error);
      alert("Não foi possível salvar a atividade. Verifique o console para mais detalhes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showTrigger && (
        <button type="button" onClick={openModal} className={triggerClassName || 'inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors shadow'}>
          {triggerLabel}
        </button>
      )}
      {/* Portal-based overlay modal (open when open === true) */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div ref={modalRef} className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl mx-auto flex flex-col z-50 overflow-hidden" style={{ maxHeight: '90vh', minHeight: '320px' }} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b relative">
              <h3 id={titleId} className="text-xl font-bold">{atividade ? 'Editar Atividade' : 'Nova Atividade do Projeto'}</h3>
              <p id={descId} className="text-sm text-gray-500 mt-1">Preencha os detalhes da atividade específica para este projeto.</p>
              {/* informações de disciplinas carregadas removidas para produção */}
              <button type="button" onClick={closeModal} aria-label="Fechar" className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="flex-1 overflow-auto py-4 pb-6">
              <form id="atividade-form" onSubmit={handleSubmit} className="py-6 px-6 w-full">
                <div className="space-y-2">
                  <Label htmlFor="atividade">Atividade</Label>
                  <textarea id="atividade" name="atividade" aria-label="Atividade" placeholder="Ex: Reunião com a equipe / Instalação" value={form.atividade} onChange={handleChange} required className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[84px] resize-none`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="etapa">Etapa</Label>
                    <Select name="etapa" value={form.etapa} onValueChange={v => handleSelectChange('etapa', v)}>
                      <SelectTrigger id="etapa" aria-label="Etapa"><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                      <SelectContent>
                        {ETAPAS_PADRAO.map(et => (
                          <SelectItem key={et} value={et}>{et}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disciplina">Disciplina</Label>
                    {Array.isArray(disciplinas) && disciplinas.length > 0 ? (
                      <Select name="disciplina" value={form.disciplina} onValueChange={v => handleSelectChange('disciplina', v)} required>
                        <SelectTrigger id="disciplina" aria-label="Disciplina"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {disciplinas.map(d => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id="disciplina" name="disciplina" aria-label="Disciplina" value={form.disciplina} onChange={handleChange} placeholder="Digite a disciplina (Ex: Estrutural)" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdisciplina">Subdisciplina</Label>
                    <Input id="subdisciplina" name="subdisciplina" aria-label="Subdisciplina" placeholder="Ex: Vigas / Lajes" value={form.subdisciplina} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="funcao">Função</Label>
                      <Input id="funcao" name="funcao" aria-label="Função responsável" placeholder="Ex: Engenheiro / Arquiteto" value={form.funcao} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempo">Tempo (h)</Label>
                      <Input id="tempo" name="tempo" type="number" aria-label="Tempo (horas)" step="0.1" placeholder="Ex: 8" value={form.tempo} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_atividade">ID da Atividade (Opcional)</Label>
                    <Input id="id_atividade" name="id_atividade" aria-label="ID da Atividade" placeholder="Ex: A001" value={form.id_atividade} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="predecessora">Predecessora</Label>
                    <Input id="predecessora" name="predecessora" aria-label="ID da atividade anterior" placeholder="ID da atividade anterior" value={form.predecessora || ''} onChange={handleChange} />
                  </div>
                </div>
              </form>
            </div>
            {/* Footer outside the scrollable content so it's always visible */}
            <div className="bg-white flex items-center justify-end gap-3 py-4 px-6 border-t z-50" role="toolbar" aria-label="Ações do modal">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Cancelar cadastro de atividade"
                className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="atividade-form"
                disabled={isSubmitting}
                aria-label={atividade ? 'Salvar atividade' : 'Criar atividade'}
                className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline-block" /> : (atividade ? 'Salvar Atividade' : 'Criar Atividade')}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
      {/* End of portal overlay */}
    </>
  );
}
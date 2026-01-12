import React, { useEffect, useState } from "react";
import retryWithBackoff from "../utils/retryWithBackoff";
import { useParams } from "react-router-dom";
import EmpreendimentoHeader from "../components/empreendimento/EmpreendimentoHeader";
import DocumentosTab from "../components/empreendimentos/DocumentosTab";
import PavimentosTab from "../components/empreendimento/PavimentosTab";
import AtividadesProjetoTab from "../components/empreendimento/AtividadesProjetoTab";
import AnaliticoGlobalTab from "../components/empreendimento/AnaliticoGlobalTab";
import GestaoTab from "../components/empreendimento/GestaoTab";
import DocumentacaoTab from "../components/empreendimento/DocumentacaoTab";
import { Empreendimento, Usuario, Documento, Atividade, Disciplina, PlanejamentoAtividade, PlanejamentoDocumento, Execucao } from "../entities/all";
import PRETab from "../components/empreendimento/PRETab";
import CurvaS from "./CurvaS";
import AlocacaoEquipeTab from "../components/planejamento/AlocacaoEquipeTab";
import { FiBarChart2, FiUsers } from "react-icons/fi";
import CadastroTab from "../components/planejamento/CadastroTab";
import { Pavimento } from "../entities/Pavimento";

const EmpreendimentoDetalhes = () => {
  // Importação CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!importFile) {
      alert('Selecione um arquivo para importar');
      return;
    }
    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('Arquivo vazio ou inválido');
        return;
      }
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim());
      const requiredHeaders = ['numero', 'arquivo'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        alert(`Cabeçalhos obrigatórios faltando: ${missingHeaders.join(', ')}`);
        return;
      }
      const documentosParaImportar = [];
      const erros = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        const row = {};
        const rowLower = {};
        headers.forEach((header, idx) => {
          const val = values[idx] || '';
          row[header] = val;
          rowLower[header.toLowerCase()] = val;
        });
        if (!row.numero || !row.arquivo) {
          erros.push(`Linha ${i + 1}: Número e Arquivo são obrigatórios`);
          continue;
        }
        // Normalizar subdisciplinas: aceitar 'subdisciplinas' (lista) ou 'subdisciplina' (string)
        let subdisciplinasArray = [];
        const rawSubs = row.subdisciplinas || row.subdisciplina || rowLower['subdisciplinas'] || rowLower['subdisciplina'] || '';
        if (rawSubs) {
          let parsed = null;
          if (/^\s*\[.*\]\s*$/.test(rawSubs)) {
            try { parsed = JSON.parse(rawSubs); } catch { parsed = null; }
          }
          if (Array.isArray(parsed)) {
            subdisciplinasArray = parsed.map(s => String(s).trim()).filter(Boolean);
          } else {
            subdisciplinasArray = String(rawSubs).split(/[,;|]/).map(s => s.trim()).filter(Boolean);
          }
        }
        documentosParaImportar.push({
          numero: row.numero,
          arquivo: row.arquivo,
          descritivo: row.descritivo || '',
          disciplina: row.disciplina || rowLower['disciplina'] || '',
          subdisciplinas: subdisciplinasArray,
          escala: row.escala ? String(row.escala) : '',
          fator_dificuldade: row.fator_dificuldade ? parseFloat(row.fator_dificuldade) : 1,
          empreendimento_id: id,
        });
      }
      if (erros.length > 0) {
        alert(`Erros encontrados:\n${erros.join('\n')}\n\nContinuar com os documentos válidos?`);
      }
      if (documentosParaImportar.length === 0) {
        alert('Nenhum documento válido encontrado no arquivo');
        return;
      }
      let sucessos = 0;
      let falhas = 0;
      for (const doc of documentosParaImportar) {
        try {
          // Usar retryWithBackoff igual ao formulário
          await retryWithBackoff(() => Documento.create(doc), 3, 500, 'importDocumento');
          sucessos++;
        } catch (error) {
          falhas++;
        }
      }
      alert(`Importação concluída!\n\nSucessos: ${sucessos}\nFalhas: ${falhas}`);
      if (sucessos > 0) {
        // Atualiza os documentos após importação
        try {
          const docs = await Documento.filter({ empreendimento_id: id });
          console.log('[IMPORTAÇÃO CSV] Documentos retornados após importação:', docs);
          setDocumentosState(Array.isArray(docs) ? docs : []);
        } catch (e) {
          // Se falhar, apenas fecha modal
        }
        setShowImportModal(false);
        setImportFile(null);
      }
    } catch (error) {
      alert(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };
  const { id } = useParams();
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documentos');
  const [usuarios, setUsuarios] = useState([]);
  const [documentosState, setDocumentosState] = useState([]);
  const [atividadesState, setAtividadesState] = useState([]);
  const [atividadesCatalogo, setAtividadesCatalogo] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [planejamentos, setPlanejamentos] = useState([]); // PlanejamentoDocumento
  const [execucoes, setExecucoes] = useState([]);
  const [pavimentos, setPavimentos] = useState([]);
  // Loader específico para atividades do projeto
  const loadAtividadesDoEmpreendimento = async (empId) => {
    try {
      if (!empId) {
        setAtividadesState([]);
        return;
      }
      const params = { empreendimento_id: empId, somenteProjeto: 1 };
      const list = typeof Atividade.filter === 'function'
        ? await Atividade.filter(params)
        : await Atividade.list(params);
      const filtered = (Array.isArray(list) ? list : []).filter(a => (
        a?.empreendimento_id == empId && a?.origem === 'projeto'
      ));
      setAtividadesState(filtered);
    } catch (_) {
      // mantem estado atual em caso de erro
    }
  };

  useEffect(() => {
    async function fetchEmpreendimento() {
      setLoading(true);
      setError(null);
      try {
        const data = await Empreendimento.get(id);
        if (!data) throw new Error("Empreendimento não encontrado");
        setEmpreendimento(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEmpreendimento();
  }, [id]);

  useEffect(() => {
    async function fetchAuxiliares() {
      try {
        const [usuariosList, docs, atvsProjeto, atvsTodos, discs, planosDoc, execs, pavs] = await Promise.all([
          Usuario.list(),
          Documento.filter({ empreendimento_id: id }),
          Atividade.filter ? Atividade.filter({ empreendimento_id: id, somenteProjeto: 1 }) : Atividade.list({ empreendimento_id: id }),
          Atividade.list ? Atividade.list() : Atividade.filter ? Atividade.filter({}) : [],
          Disciplina.list(),
          PlanejamentoDocumento.filter ? PlanejamentoDocumento.filter({ empreendimento_id: id }) : [],
          Execucao.list ? Execucao.list({ empreendimento_id: id }) : [],
          Pavimento.list ? Pavimento.list(id) : []
        ]);
        setUsuarios(Array.isArray(usuariosList) ? usuariosList : []);
        setDocumentosState(Array.isArray(docs) ? docs : []);
        // Para a aba Documentação, queremos todas as atividades do banco
        setAtividadesState(Array.isArray(atvsTodos) ? atvsTodos : []);
        // Atividades do catálogo (globais)
        const catalogo = (Array.isArray(atvsTodos) ? atvsTodos : []).filter(a => !a?.empreendimento_id);
        setAtividadesCatalogo(catalogo);
        setDisciplinas(Array.isArray(discs) ? discs : []);
        setPlanejamentos(Array.isArray(planosDoc) ? planosDoc : []);
        setExecucoes(Array.isArray(execs) ? execs : []);
        setPavimentos(Array.isArray(pavs) ? pavs : []);
      } catch (err) {
        // Não bloqueia tela
      }
    }
    fetchAuxiliares();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!empreendimento) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 0' }}>
      <EmpreendimentoHeader empreendimento={empreendimento} />
      {/* Botão de Importação CSV */}
      <div className="flex justify-end mb-2">
        <button
          className="border border-green-500 text-green-600 px-4 py-2 rounded hover:bg-green-50 flex items-center gap-2"
          onClick={() => setShowImportModal(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4H4zm8 4v8m0 0l-3-3m3 3l3-3" /></svg>
          Importar CSV
        </button>
      </div>
      {/* Modal de Importação CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Importar Documentos CSV</h2>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mb-4 w-full"
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded border bg-gray-100"
                onClick={() => setShowImportModal(false)}
                disabled={isImporting}
              >Cancelar</button>
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                onClick={handleImport}
                disabled={!importFile || isImporting}
              >
                {isImporting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4H4zm8 4v8m0 0l-3-3m3 3l3-3" /></svg>
                )}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-3" style={{ marginTop: 16 }}>
        <div className="border-b border-gray-200">
          <div className="px-4 pt-2">
            <nav className="flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('documentos')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'documentos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Documentos
              </button>
              <button
                onClick={() => setActiveTab('cadastro')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'cadastro'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Cadastro
              </button>
              <button
                onClick={() => setActiveTab('pavimentos')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'pavimentos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Pavimentos
              </button>
              <button
                onClick={() => setActiveTab('atividades')}
                className={`py-1.5 px-4 font-medium text-sm ${activeTab === 'atividades'
                  ? 'border-2 rounded-md border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Atividades do Projeto
              </button>
              <button
                onClick={() => setActiveTab('catalogo')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'catalogo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Catálogo
              </button>
              <button
                onClick={() => setActiveTab('documentacao')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'documentacao'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Documentação
              </button>
              <button
                onClick={() => setActiveTab('gestao')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'gestao'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Gestão
              </button>
              <button
                onClick={() => setActiveTab('pre')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'pre'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                PRE
              </button>
            </nav>
          </div>
        </div>
        <div className="p-4">
          {activeTab === 'documentos' && (
            <DocumentosTab
              empreendimento={empreendimento}
              disciplinas={disciplinas}
              atividades={atividadesState}
              documentos={documentosState}
              isActive={activeTab === 'documentos'}
            />
          )}
          {activeTab === 'cadastro' && (
            <CadastroTab empreendimento={empreendimento} />
          )}
          {activeTab === 'pavimentos' && (
            <PavimentosTab empreendimentoId={empreendimento?.id} onUpdate={() => { }} />
          )}
          {activeTab === 'documentacao' && (
            <DocumentacaoTab
              empreendimento={empreendimento}
              documentos={documentosState}
              disciplinas={disciplinas}
              atividades={atividadesState}
              planejamentos={planejamentos}
              usuarios={usuarios}
              pavimentos={pavimentos}
              onUpdate={() => { }}
            />
          )}
          {activeTab === 'atividades' && (
            <AtividadesProjetoTab
              empreendimentoId={empreendimento?.id}
              onUpdate={(newActivity) => {
                if (newActivity && newActivity.__deleteId) {
                  const deleteId = newActivity.__deleteId;
                  setAtividadesState(prev => (Array.isArray(prev) ? prev.filter(a => (a.id ?? a.id_atividade) != deleteId) : prev));
                  loadAtividadesDoEmpreendimento(empreendimento?.id);
                  return;
                }
                if (newActivity) {
                  setAtividadesState(prev => {
                    if (!Array.isArray(prev)) return [newActivity];
                    const pk = newActivity.id ?? newActivity.id_atividade;
                    const index = prev.findIndex(a => (a.id ?? a.id_atividade) == pk);
                    if (index >= 0) {
                      const copy = [...prev];
                      copy[index] = newActivity;
                      return copy;
                    }
                    return [...prev, newActivity];
                  });
                  loadAtividadesDoEmpreendimento(empreendimento?.id);
                } else {
                  loadAtividadesDoEmpreendimento(empreendimento?.id);
                }
              }}
              documentos={documentosState}
              usuarios={usuarios}
              atividades={atividadesState}
              disciplinas={disciplinas}
            />
          )}
          {activeTab === 'catalogo' && (
            <AnaliticoGlobalTab empreendimentoId={empreendimento?.id} onUpdate={() => { }} />
          )}
          {activeTab === 'gestao' && (
            <GestaoTab
              empreendimento={empreendimento}
              documentos={documentosState}
              planejamentos={planejamentos}
              atividades={atividadesCatalogo}
              usuarios={usuarios}
              execucoes={execucoes}
              pavimentos={pavimentos}
              onUpdate={() => { }}
            />
          )}
          {(activeTab === 'pre' || activeTab === 'etapas') && (
            <PRETab empreendimentoId={empreendimento?.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpreendimentoDetalhes;

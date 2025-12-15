import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EmpreendimentoHeader from "../components/empreendimento/EmpreendimentoHeader";
import DocumentosTab from "../components/empreendimentos/DocumentosTab";
import PavimentosTab from "../components/empreendimento/PavimentosTab";
import AtividadesProjetoTab from "../components/empreendimento/AtividadesProjetoTab";
import AnaliticoGlobalTab from "../components/empreendimento/AnaliticoGlobalTab";
import AnaliseEtapasTab from "../components/empreendimento/AnaliseEtapasTab";
import GestaoTab from "../components/empreendimento/GestaoTab";
import DocumentacaoTab from "../components/empreendimento/DocumentacaoTab";
import { Empreendimento, Usuario, Documento, Atividade, Disciplina, PlanejamentoAtividade, PlanejamentoDocumento, Execucao } from "../entities/all";
import { Pavimento } from "../entities/Pavimento";

const EmpreendimentoDetalhes = () => {
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
                onClick={() => setActiveTab('etapas')}
                className={`py-1.5 px-3 border-b-2 font-medium text-sm ${activeTab === 'etapas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Etapas
              </button>
            </nav>
          </div>
        </div>
        <div className="p-4">
          {activeTab === 'documentos' && (
            <DocumentosTab empreendimento={empreendimento} isActive={activeTab === 'documentos'} />
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
          {activeTab === 'etapas' && (
            <AnaliseEtapasTab planejamentos={empreendimento?.planejamentos || []} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpreendimentoDetalhes;

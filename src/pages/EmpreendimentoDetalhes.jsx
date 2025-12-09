import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EmpreendimentoHeader from "../components/empreendimento/EmpreendimentoHeader";
import DocumentosTab from "../components/empreendimentos/DocumentosTab";
import PavimentosTab from "../components/empreendimento/PavimentosTab";
import AtividadesProjetoTab from "../components/empreendimento/AtividadesProjetoTab";
import AnaliticoGlobalTab from "../components/empreendimento/AnaliticoGlobalTab";
import AnaliseEtapasTab from "../components/empreendimento/AnaliseEtapasTab";
import { Empreendimento, Usuario, Documento, Atividade, Disciplina } from "../entities/all";

const EmpreendimentoDetalhes = () => {
  const { id } = useParams();
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documentos');
  const [usuarios, setUsuarios] = useState([]);
  const [documentosState, setDocumentosState] = useState([]);
  const [atividadesState, setAtividadesState] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);

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
        const [usuariosList, docs, atvs, discs] = await Promise.all([
          Usuario.list(),
          Documento.filter({ empreendimento_id: id }),
          Atividade.filter ? Atividade.filter({ empreendimento_id: id }) : Atividade.list({ empreendimento_id: id }),
          Disciplina.list()
        ]);
        setUsuarios(Array.isArray(usuariosList) ? usuariosList : []);
        setDocumentosState(Array.isArray(docs) ? docs : []);
        setAtividadesState(Array.isArray(atvs) ? atvs : []);
        setDisciplinas(Array.isArray(discs) ? discs : []);
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
          {activeTab === 'atividades' && (
            <AtividadesProjetoTab
              empreendimentoId={empreendimento?.id}
              onUpdate={() => { }}
              documentos={documentosState}
              usuarios={usuarios}
              atividades={atividadesState}
              disciplinas={disciplinas}
            />
          )}
          {activeTab === 'catalogo' && (
            <AnaliticoGlobalTab empreendimentoId={empreendimento?.id} onUpdate={() => { }} />
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

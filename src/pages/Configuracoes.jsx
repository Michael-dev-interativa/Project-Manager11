
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Disciplina, Atividade } from "../entities/all";

import DisciplinasManager from "../components/configuracoes/DisciplinasManager";
import AtividadesManager from "../components/configuracoes/AtividadesManager";
import AtividadeFuncaoManager from "../components/configuracoes/AtividadeFuncaoManager";

export default function Configuracoes() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Carregando dados de configuração...');
      const [disciplinasData, atividadesData] = await Promise.all([
        Disciplina.list(),
        Atividade.list()
      ]);
      console.log('✅ Disciplinas carregadas:', disciplinasData);
      console.log('✅ Atividades carregadas:', atividadesData);
      setDisciplinas(disciplinasData || []);
      setAtividades(atividadesData || []);
    } catch (error) {
      console.error("❌ Erro ao buscar dados de configuração:", error);
      setDisciplinas([]);
      setAtividades([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  console.log('🎯 Renderizando página de Configurações');
  console.log('🎯 URL atual:', window.location.pathname);
  console.log('🎯 Disciplinas:', disciplinas);
  console.log('🎯 Atividades:', atividades);

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <div className="max-w-5xl mx-auto pt-10">
        {/* Cabeçalho centralizado */}
        <div className="flex flex-col items-center justify-center mb-6">
          <span className="text-4xl mb-1"><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' fill='none' viewBox='0 0 24 24'><path fill='#222' d='M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z' /><path fill='#222' fillRule='evenodd' d='M12 2c.41 0 .75.34.75.75V4.1a7.97 7.97 0 0 1 3.15.9l.7-1.2a.75.75 0 1 1 1.3.75l-.7 1.2a8.02 8.02 0 0 1 2.25 2.25l1.2-.7a.75.75 0 1 1 .75 1.3l-1.2.7c.56.97.88 2.08.9 3.15h1.35a.75.75 0 0 1 0 1.5H20.1a7.97 7.97 0 0 1-.9 3.15l1.2.7a.75.75 0 1 1-.75 1.3l-1.2-.7a8.02 8.02 0 0 1-2.25 2.25l.7 1.2a.75.75 0 1 1-1.3.75l-.7-1.2a7.97 7.97 0 0 1-3.15.9v1.35a.75.75 0 0 1-1.5 0V19.9a7.97 7.97 0 0 1-3.15-.9l-.7 1.2a.75.75 0 1 1-1.3-.75l.7-1.2a8.02 8.02 0 0 1-2.25-2.25l-1.2.7a.75.75 0 1 1-.75-1.3l1.2-.7A7.97 7.97 0 0 1 3.9 12H2.75a.75.75 0 0 1 0-1.5H4.1a7.97 7.97 0 0 1 .9-3.15l-1.2-.7a.75.75 0 1 1 .75-1.3l1.2.7a8.02 8.02 0 0 1 2.25-2.25l-.7-1.2a.75.75 0 1 1 1.3-.75l.7 1.2A7.97 7.97 0 0 1 12 4.1V2.75c0-.41.34-.75.75-.75ZM12 6A6 6 0 1 0 12 18a6 6 0 0 0 0-12Z' clipRule='evenodd' /></svg></span>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Configurações Gerais</h1>
          <p className="text-base text-gray-600">Gerencie disciplinas, atividades e configurações do sistema</p>
        </div>
        {/* Abas de Configuração */}
        <div className="mt-6">
          <Tabs defaultValue="disciplinas" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <TabsTrigger
                value="disciplinas"
                className="flex items-center gap-2 py-3 px-6 text-base font-medium"
              >
                🏗️ Disciplinas
              </TabsTrigger>
              <TabsTrigger
                value="atividades"
                className="flex items-center gap-2 py-3 px-6 text-base font-medium"
              >
                📋 Catálogo de Atividades
              </TabsTrigger>
              <TabsTrigger
                value="atividades_funcao"
                className="flex items-center gap-2 py-3 px-6 text-base font-medium"
              >
                👥 Atividades por Departamento
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo das Abas */}
            <TabsContent value="disciplinas" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    🏗️ Gestão de Disciplinas
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Configure as disciplinas utilizadas nos projetos (Arquitetura, Estrutural, Instalações, etc.)
                  </p>
                </div>
                <div className="p-6">
                  <DisciplinasManager
                    disciplinas={disciplinas}
                    isLoading={isLoading}
                    onUpdate={fetchData}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="atividades" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    📋 Catálogo de Atividades
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Gerencie atividades genéricas que podem ser utilizadas nos projetos
                  </p>
                </div>
                <div className="p-6">
                  <AtividadesManager
                    atividades={atividades}
                    disciplinas={disciplinas}
                    isLoading={isLoading}
                    onUpdate={fetchData}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="atividades_funcao" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    👥 Atividades por Departamento
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Configure atividades específicas por função e departamento, definindo tempos e responsabilidades
                  </p>
                </div>
                <div className="p-6">
                  <AtividadeFuncaoManager />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

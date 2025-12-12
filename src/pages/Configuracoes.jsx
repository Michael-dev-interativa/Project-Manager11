
import React, { useState, useEffect, useCallback } from "react";
import { Settings } from "lucide-react";
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
          <Settings className="w-9 h-9 text-blue-600 mb-1" />
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

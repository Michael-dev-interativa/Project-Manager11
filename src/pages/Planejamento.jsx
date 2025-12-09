import React, { useState, useEffect, useContext, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Settings, RefreshCw, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimerContext } from "@/components/contexts/ActivityTimerContext";
import { Empreendimento, Documento, Usuario, Atividade, PlanejamentoAtividade, PlanejamentoDocumento, Disciplina } from "@/entities/all";

import PlanejamentoTab from "../components/planejamento/PlanejamentoTab";
import SobrasTab from "../components/planejamento/SobrasTab";
import ConfiguracaoTab from "../components/planejamento/ConfiguracaoTab";
import NovoPlanejamentoModal from '../components/planejamento/NovoPlanejamentoModal';

export default function Planejamento() {
  const [searchParams] = useSearchParams();
  const empreendimentoId = searchParams.get("id");

  const [empreendimento, setEmpreendimento] = useState(null);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("planejamento");
  const [showModal, setShowModal] = useState(false);
  const { refreshTrigger } = useContext(ActivityTimerContext);

  const loadEmpreendimento = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEmps = await Empreendimento.list();
      setEmpreendimentos(allEmps);
      const empData = allEmps.find(e => e.id === empreendimentoId);
      setEmpreendimento(empData || null);
    } catch (error) {
      console.error("Erro ao carregar dados do empreendimento:", error);
      let errorMessage = "Falha ao carregar os dados do empreendimento.";
      if (error.message?.includes("ReplicaSetNoPrimary") || (typeof error.message === 'string' && error.message.includes("500")) || error.message?.includes("429")) {
        errorMessage = "Ocorreu um problema temporário de conexão. Por favor, tente recarregar a página.";
      }
      console.error(errorMessage);
    }
    setIsLoading(false);
  }, [empreendimentoId]);

  // Removido o carregamento duplicado de planejamentos. Agora só carrega empreendimento.
  useEffect(() => {
    if (empreendimentoId) {
      loadEmpreendimento();
    }
  }, [empreendimentoId, refreshTrigger, loadEmpreendimento]);

  const handleRefresh = () => {
    loadEmpreendimento();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (!empreendimentoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Empreendimento não encontrado
          </h2>
          <Link to={createPageUrl("SeletorPlanejamento")}>
            <Button>Voltar para Seleção</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-12 w-96 mb-6" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!empreendimento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Empreendimento não encontrado
          </h2>
          <Link to={createPageUrl("SeletorPlanejamento")}>
            <Button>Voltar para Seleção</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Planejamento - {empreendimento?.nome || 'Carregando...'}
                </h1>
                <p className="text-gray-600">
                  Gerencie o planejamento de atividades e cronograma
                </p>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="shadow-lg"
              size="lg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="planejamento" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Planejamento
              </TabsTrigger>
              <TabsTrigger value="sobras" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sobras
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planejamento">
              <PlanejamentoTab
                empreendimentoId={empreendimento.id}
              />
            </TabsContent>

            <TabsContent value="sobras">
              <SobrasTab
                empreendimentoId={empreendimento.id}
              />
            </TabsContent>

            <TabsContent value="configuracoes">
              <ConfiguracaoTab
                empreendimentoId={empreendimento.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <NovoPlanejamentoModal
        isOpen={showModal}
        onClose={handleCloseModal}
        empreendimentoId={empreendimentoId}
        empreendimentos={empreendimentos}
      />
    </div>
  );
}
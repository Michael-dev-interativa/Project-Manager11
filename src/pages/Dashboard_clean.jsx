import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import { Empreendimento, Atividade, PlanejamentoAtividade, Usuario } from "../entities/all";
import {
  RefreshCw,
  Plus,
  BarChart3,
  Building2,
  Calendar as CalendarIcon,
  Settings,
  AlertTriangle,
  Filter,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ActivityTimerContext } from "../components/contexts/ActivityTimerContext";

// Componentes do Dashboard
function SimpleCard({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      {children}
    </div>
  );
}

function SimpleButton({ children, onClick, disabled, variant = "primary", className = "" }) {
  const baseClass = "px-4 py-2 rounded-lg font-medium transition-colors text-sm";
  const variantClass = variant === "primary"
    ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
    : variant === "dark"
      ? "bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-300"
      : variant === "secondary"
        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

// Componente de loading
function LoadingSkeleton({ className = "h-4 w-full" }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
}

const fetchAllRecords = async (entity, entityName = 'entidade') => {
  try {
    const records = await entity.list();
    console.log(`✅ Total de ${entityName} carregados: ${records?.length || 0}`);
    return records || [];
  } catch (error) {
    console.error(`❌ Erro ao carregar ${entityName}:`, error);
    return [];
  }
};

// Componente de Calendário
function CalendarComponent({ currentDate, setCurrentDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const shortWeekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Adicionar dias vazios do mês anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Formatação da data para exibir período da semana
  const formatWeekPeriod = () => {
    const startOfWeek = new Date(currentMonth);
    startOfWeek.setDate(11); // 11 Jan como na imagem
    const endOfWeek = new Date(currentMonth);
    endOfWeek.setDate(17); // 17 Jan como na imagem

    return `${startOfWeek.getDate()} Jan - ${endOfWeek.getDate()} Jan, ${endOfWeek.getFullYear()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header do Calendário */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800">
              Calendário - Todos Os Usuários ()
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <SimpleButton variant="secondary" className="flex items-center gap-2 text-xs px-3 py-1">
              <BarChart3 className="w-3 h-3" />
              Previsão de Entrega
            </SimpleButton>
            <SimpleButton variant="secondary" className="flex items-center gap-2 text-xs px-3 py-1">
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </SimpleButton>
            <span className="text-xs text-gray-600">Hoje</span>
          </div>
        </div>

        {/* Controles e Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-orange-500" />
              <select className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                <option>⚠️ Todos os Usuários...</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                <option>Todas as Disciplinas</option>
              </select>
            </div>
            <button className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
              🗑️ Limpar Filtros
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border border-gray-300 rounded">
              <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-l">
                Dia
              </button>
              <button className="px-2 py-1 text-xs bg-gray-800 text-white border-l border-gray-300">
                Semana
              </button>
              <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 border-l border-gray-300 rounded-r">
                Mês
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação do Período */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button
          onClick={() => navigateMonth(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800">
          {formatWeekPeriod()}
        </h3>

        <button
          onClick={() => navigateMonth(1)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cabeçalho dos Dias da Semana */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {weekDays.map((day, index) => {
          // Destacar os dias da semana como na imagem
          const dayNumber = 11 + index; // 11, 12, 13, 14, 15, 16, 17
          return (
            <div
              key={day}
              className="px-2 py-3 text-center border-r last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-600">
                {day.substring(0, day === "Domingo" ? 7 : day === "Segunda" ? 8 : day === "Quarta" ? 6 : day.length)}, {dayNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Área do Calendário */}
      <div className="grid grid-cols-7">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="border-r border-b last:border-r-0 p-1 hover:bg-gray-50 transition-colors"
            style={{ height: '350px' }}
          >
            {/* Área vazia para eventos/atividades */}
            <div className="h-full flex flex-col">
              <div className="flex-1">
                {/* Aqui seriam exibidas as atividades do dia */}
                {/* Por enquanto vazio como na imagem */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading, triggerDataRefresh } = useContext(ActivityTimerContext) || {};

  // Estados do Dashboard
  const [usuarios, setUsuarios] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [planejamentos, setPlanejamentos] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadDashboardData = useCallback(async () => {
    try {
      setIsDashboardLoading(true);
      setDashboardError(null);
      console.log("🔄 [Dashboard] Carregando dados...");

      const [
        allUsers,
        allEmpreendimentos,
        allAtividades,
        allPlanejamentos
      ] = await Promise.all([
        fetchAllRecords(Usuario, 'Usuario'),
        fetchAllRecords(Empreendimento, 'Empreendimento'),
        fetchAllRecords(Atividade, 'Atividade'),
        fetchAllRecords(PlanejamentoAtividade, 'PlanejamentoAtividade')
      ]);

      setUsuarios(allUsers);
      setEmpreendimentos(allEmpreendimentos);
      setAtividades(allAtividades);
      setPlanejamentos(allPlanejamentos);

      console.log("✅ [Dashboard] Dados carregados com sucesso");

    } catch (err) {
      console.error("❌ [Dashboard] ERRO ao carregar dados:", err);
      setDashboardError("Erro ao carregar dados. Tente atualizar a página.");
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  // Carregamento inicial dos dados
  useEffect(() => {
    if (user && !isUserLoading) {
      loadDashboardData();
    }
  }, [user, isUserLoading, loadDashboardData]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSkeleton className="w-8 h-8" />
        <span className="ml-2">Carregando usuário...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Usuário não encontrado</h2>
          <p className="text-gray-500 mt-2">Faça login para acessar o dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Painel de Controle
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie seus projetos de forma eficiente.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <SimpleButton
                onClick={() => navigate('/planejamento')}
                variant="dark"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Planejamento
              </SimpleButton>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação com Botões */}
      <div className="bg-white border-b">
        <div className="px-6 py-3">
          <div className="flex items-center gap-4">
            <SimpleButton
              variant="dark"
              className="flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              Calendário
            </SimpleButton>
            <SimpleButton
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => navigate('/planejamento')}
            >
              <TrendingUp className="w-4 h-4" />
              Curva S
            </SimpleButton>
          </div>
        </div>
      </div>

      {/* Error State */}
      {dashboardError && (
        <div className="px-6 pt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {dashboardError}
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="px-4 py-4">
        {isDashboardLoading ? (
          <div className="space-y-6">
            <LoadingSkeleton className="h-96" />
          </div>
        ) : (
          <CalendarComponent
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}

        {/* Informações de Status no Footer */}
        {!isDashboardLoading && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <SimpleCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {empreendimentos.length}
                </div>
                <div className="text-sm text-gray-600">Empreendimentos</div>
              </div>
            </SimpleCard>
            <SimpleCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {usuarios.length}
                </div>
                <div className="text-sm text-gray-600">Usuários</div>
              </div>
            </SimpleCard>
            <SimpleCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {atividades.length}
                </div>
                <div className="text-sm text-gray-600">Atividades</div>
              </div>
            </SimpleCard>
            <SimpleCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {planejamentos.length}
                </div>
                <div className="text-sm text-gray-600">Planejamentos</div>
              </div>
            </SimpleCard>
          </div>
        )}
      </div>
    </div>
  );
}
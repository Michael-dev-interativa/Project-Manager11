import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Usuario } from '@/entities/all';
import ExecucaoModal from '@/components/ExecucaoModal';

const ActivityTimerContext = createContext();

export const useActivityTimer = () => {
  const context = useContext(ActivityTimerContext);
  if (!context) {
    throw new Error('useActivityTimer deve ser usado dentro de um ActivityTimerProvider');
  }
  return context;
};

// Hook simples para detectar inatividade
const useIdleDetection = (timeoutMs = 300000) => { // 5 minutos
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef(null);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => resetTimer();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimer(); // Iniciar timer

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return { isIdle, resetTimer };
};

// Componente modal simples para aviso de inatividade
const IdleWarningModal = ({ isOpen, onContinue, onStop, timeLeft }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Você ainda está trabalhando?</h3>
        <p className="text-gray-600 mb-4">
          Detectamos que você está inativo há algum tempo.
          O timer será pausado automaticamente em {timeLeft} segundos.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Continuar Trabalhando
          </button>
          <button
            onClick={onStop}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Pausar Timer
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente modal para confirmação de exclusão
const ConfirmDeleteModal = ({ isOpen, onConfirm, onCancel, activityName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirmar Exclusão</h3>
        <p className="text-gray-600 mb-4">
          Tem certeza que deseja excluir a atividade "{activityName}"?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export const ActivityTimerProvider = ({ children }) => {
  // Estados principais
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activities, setActivities] = useState([]);

  // Estados para modais
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [idleWarningTimeLeft, setIdleWarningTimeLeft] = useState(30);

  // Refs para controle
  const isInitialized = useRef(false);
  const timerInterval = useRef(null);
  const startTime = useRef(null);
  const idleWarningInterval = useRef(null);

  // Execução Modal (para atividades rápidas ou gatilhos externos)
  const [execucaoModalOpen, setExecucaoModalOpen] = useState(false);
  const [execucaoModalActivity, setExecucaoModalActivity] = useState(null);

  // Hook de detecção de inatividade
  const { isIdle, resetTimer } = useIdleDetection(300000); // 5 minutos

  // Função para inicializar o timer
  const initializeTimer = useCallback(async () => {
    if (isInitialized.current) {
      console.log('⚠️ Timer já foi inicializado, pulando...');
      return;
    }

    console.log('🔄 Inicializando timer de atividades...');
    setIsLoading(true);

    try {
      // Buscar dados do usuário
      const userData = await Usuario.me();
      console.log('✅ Usuário carregado:', userData);

      setUser(userData);
      setIsAuthenticated(true);
      isInitialized.current = true;

      // Carregar atividades salvas do localStorage
      const savedActivities = localStorage.getItem('userActivities');
      if (savedActivities) {
        try {
          const parsedActivities = JSON.parse(savedActivities);
          setActivities(parsedActivities);
          console.log('📋 Atividades carregadas do localStorage:', parsedActivities.length);
        } catch (error) {
          console.error('❌ Erro ao parsear atividades salvas:', error);
        }
      }

      // Verificar se havia uma atividade em andamento
      const currentActivityData = localStorage.getItem('currentActivity');
      const savedStartTime = localStorage.getItem('activityStartTime');

      if (currentActivityData && savedStartTime) {
        try {
          const activity = JSON.parse(currentActivityData);
          const savedTime = parseInt(savedStartTime);
          const elapsed = Math.floor((Date.now() - savedTime) / 1000);

          setCurrentActivity(activity);
          setElapsedTime(elapsed);
          setIsTimerRunning(true);
          startTime.current = savedTime;

          console.log('🔄 Atividade em andamento restaurada:', activity.nome || activity.descritivo, `${elapsed}s`);
        } catch (error) {
          console.error('❌ Erro ao restaurar atividade em andamento:', error);
          localStorage.removeItem('currentActivity');
          localStorage.removeItem('activityStartTime');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao inicializar timer:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para iniciar uma atividade
  const startActivity = useCallback((activity) => {
    if (isTimerRunning) {
      console.log('⚠️ Uma atividade já está em andamento');
      return false;
    }

    console.log('▶️ Iniciando atividade:', activity.nome || activity.descritivo);

    const now = Date.now();
    setCurrentActivity(activity);
    setIsTimerRunning(true);
    setElapsedTime(0);
    startTime.current = now;

    // Salvar no localStorage
    localStorage.setItem('currentActivity', JSON.stringify(activity));
    localStorage.setItem('activityStartTime', now.toString());

    resetTimer(); // Reset do detector de inatividade

    return true;
  }, [isTimerRunning, resetTimer]);

  // Função para parar uma atividade
  const stopActivity = useCallback(() => {
    if (!isTimerRunning || !currentActivity) {
      console.log('⚠️ Nenhuma atividade em andamento');
      return null;
    }

    console.log('⏸️ Parando atividade:', currentActivity.nome || currentActivity.descritivo);

    const endTime = Date.now();
    const totalTime = Math.floor((endTime - startTime.current) / 1000);

    const completedActivity = {
      ...currentActivity,
      startTime: startTime.current,
      endTime: endTime,
      duration: totalTime,
      date: new Date().toISOString().split('T')[0]
    };

    // Adicionar à lista de atividades
    const updatedActivities = [...activities, completedActivity];
    setActivities(updatedActivities);

    // Salvar no localStorage
    localStorage.setItem('userActivities', JSON.stringify(updatedActivities));

    // Limpar estados
    setCurrentActivity(null);
    setIsTimerRunning(false);
    setElapsedTime(0);
    startTime.current = null;

    // Limpar localStorage
    localStorage.removeItem('currentActivity');
    localStorage.removeItem('activityStartTime');

    console.log('✅ Atividade concluída:', completedActivity.nome || completedActivity.descritivo, `${totalTime}s`);
    return completedActivity;
  }, [isTimerRunning, currentActivity, activities]);

  // Função para pausar/resumir atividade
  const toggleActivity = useCallback(() => {
    if (!currentActivity) return false;

    if (isTimerRunning) {
      setIsTimerRunning(false);
      console.log('⏸️ Atividade pausada');
    } else {
      setIsTimerRunning(true);
      startTime.current = Date.now() - (elapsedTime * 1000);
      localStorage.setItem('activityStartTime', startTime.current.toString());
      resetTimer();
      console.log('▶️ Atividade resumida');
    }

    return true;
  }, [currentActivity, isTimerRunning, elapsedTime, resetTimer]);

  // Função para deletar atividade
  const deleteActivity = useCallback((activityIndex) => {
    setActivityToDelete(activityIndex);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteActivity = useCallback(() => {
    if (activityToDelete !== null) {
      const updatedActivities = activities.filter((_, index) => index !== activityToDelete);
      setActivities(updatedActivities);
      localStorage.setItem('userActivities', JSON.stringify(updatedActivities));
      console.log('🗑️ Atividade excluída');
    }
    setShowDeleteConfirm(false);
    setActivityToDelete(null);
  }, [activities, activityToDelete]);

  // Gerenciar aviso de inatividade
  useEffect(() => {
    if (isIdle && isTimerRunning) {
      setShowIdleWarning(true);
      setIdleWarningTimeLeft(30);

      idleWarningInterval.current = setInterval(() => {
        setIdleWarningTimeLeft(prev => {
          if (prev <= 1) {
            // Pausar automaticamente
            setIsTimerRunning(false);
            setShowIdleWarning(false);
            console.log('⏸️ Timer pausado automaticamente por inatividade');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (idleWarningInterval.current) {
        clearInterval(idleWarningInterval.current);
      }
    };
  }, [isIdle, isTimerRunning]);

  // Effect para controlar o timer
  useEffect(() => {
    if (isTimerRunning && startTime.current) {
      timerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isTimerRunning]);

  // Effect para inicializar o contexto
  useEffect(() => {
    initializeTimer();
  }, [initializeTimer]);

  // Função para formatar tempo
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Função para obter estatísticas
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(activity => activity.date === today);

    const totalTimeToday = todayActivities.reduce((total, activity) => total + activity.duration, 0);
    const totalActivitiesToday = todayActivities.length;

    return {
      totalTimeToday,
      totalActivitiesToday,
      activities: todayActivities
    };
  }, [activities]);

  const value = {
    // Estados
    user,
    isAuthenticated,
    isLoading,
    currentActivity,
    isTimerRunning,
    elapsedTime,
    activities,

    // Funções
    startActivity,
    stopActivity,
    toggleActivity,
    deleteActivity,
    formatTime,
    getStats,
    initializeTimer,
    // Abertura de modal de execução a partir de qualquer lugar
    openExecutionModal: (payload) => {
      // payload esperado: { descritivo, atividade_nome, empreendimento_id, usuario, usuario_ajudado, status, inicio, planejamento_id }
      const atividade = {
        descritivo: payload?.descritivo || payload?.atividade_nome || 'Atividade',
        atividade_nome: payload?.atividade_nome || payload?.descritivo || 'Atividade',
        empreendimento_id: payload?.empreendimento_id ?? null,
        usuario: payload?.usuario || '',
        usuario_ajudado: payload?.usuario_ajudado || '',
        status: payload?.status || 'em_andamento',
        inicio: payload?.inicio || new Date().toISOString(),
        planejamento_id: payload?.planejamento_id ?? null,
        tipo: 'atividade'
      };
      setExecucaoModalActivity(atividade);
      setExecucaoModalOpen(true);
    },
    closeExecutionModal: () => {
      setExecucaoModalOpen(false);
      setExecucaoModalActivity(null);
    },

    // Utilitários
    setUser,
    setIsAuthenticated
  };

  return (
    <ActivityTimerContext.Provider value={value}>
      {children}

      {/* Modais */}
      <IdleWarningModal
        isOpen={showIdleWarning}
        onContinue={() => {
          setShowIdleWarning(false);
          resetTimer();
          if (idleWarningInterval.current) {
            clearInterval(idleWarningInterval.current);
          }
        }}
        onStop={() => {
          setShowIdleWarning(false);
          setIsTimerRunning(false);
          if (idleWarningInterval.current) {
            clearInterval(idleWarningInterval.current);
          }
        }}
        timeLeft={idleWarningTimeLeft}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDeleteActivity}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setActivityToDelete(null);
        }}
        activityName={
          activityToDelete !== null
            ? activities[activityToDelete]?.nome || activities[activityToDelete]?.descritivo || 'Atividade'
            : ''
        }
      />

      {/* Modal de execução global controlado pelo contexto */}
      {execucaoModalOpen && (
        <ExecucaoModal
          atividade={execucaoModalActivity}
          onClose={() => {
            setExecucaoModalOpen(false);
            setExecucaoModalActivity(null);
          }}
          onPause={() => { /* opcional: poderíamos persistir status em Execucao aqui */ }}
          onFinish={() => {
            setExecucaoModalOpen(false);
            setExecucaoModalActivity(null);
          }}
          onReload={() => { /* noop para atividades rápidas */ }}
        />
      )}
    </ActivityTimerContext.Provider>
  );
};

export { ActivityTimerContext };

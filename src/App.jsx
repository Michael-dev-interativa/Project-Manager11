import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CurvaS from './pages/CurvaS.jsx';
import { ActivityTimerProvider } from './components/contexts/ActivityTimerContext';
import { UserProvider } from './components/contexts/UserContext';
import { ExecucaoProvider } from './components/contexts/ExecucaoContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Empreendimentos from './components/Empreendimentos';
import EmpreendimentoDetalhes from './pages/EmpreendimentoDetalhes';
import Planejamento from './pages/Planejamento';
import SeletorPlanejamento from './pages/SeletorPlanejamento';
import Relatorios from './pages/Relatorios';
import AnaliseConcepcao from './pages/AnaliseConcepcao';
import Configuracoes from './pages/Configuracoes';
import ProtectedRoute from './components/ProtectedRoute';
import { Toast } from './components/ui/toast';
import Login from './pages/Login';
import ExecucaoModal from './components/ExecucaoModal';
import { useExecucaoModal } from './components/contexts/ExecucaoContext';

function GlobalExecucaoModal() {
  const { modalExecucao, setModalExecucao } = useExecucaoModal();
  if (!modalExecucao) return null;
  return (
    <ExecucaoModal
      atividade={modalExecucao}
      onClose={() => setModalExecucao(null)}
      onPause={() => setModalExecucao(null)}
      onFinish={() => setModalExecucao(null)}
    />
  );
}

function App() {
  return (
    <div className="App">
      <UserProvider>
        <ActivityTimerProvider>
          <ExecucaoProvider>
            <Router>
              <div className="flex h-screen bg-gray-50">
                {/* Sidebar fixa com novo design */}
                <div className="w-64 flex-shrink-0">
                  <Sidebar />
                </div>

                {/* Conteúdo principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <main className="flex-1 overflow-y-auto">
                    <div className="h-full">
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                          <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/curva-s" element={
                          <ProtectedRoute><CurvaS /></ProtectedRoute>
                        } />
                        <Route path="/usuarios" element={
                          <ProtectedRoute><Usuarios /></ProtectedRoute>
                        } />
                        <Route path="/empreendimentos" element={
                          <ProtectedRoute><Empreendimentos /></ProtectedRoute>
                        } />
                        <Route path="/empreendimentos/:id" element={
                          <ProtectedRoute><EmpreendimentoDetalhes /></ProtectedRoute>
                        } />
                        <Route path="/planejamento" element={
                          <ProtectedRoute><Planejamento /></ProtectedRoute>
                        } />
                        <Route path="/seletor-planejamento" element={
                          <ProtectedRoute><SeletorPlanejamento /></ProtectedRoute>
                        } />
                        <Route path="/relatorios" element={
                          <ProtectedRoute><Relatorios /></ProtectedRoute>
                        } />
                        <Route path="/analise-concepcao" element={
                          <ProtectedRoute><AnaliseConcepcao /></ProtectedRoute>
                        } />
                        <Route path="/configuracoes" element={
                          <ProtectedRoute><Configuracoes /></ProtectedRoute>
                        } />
                      </Routes>
                      <GlobalExecucaoModal />
                    </div>
                  </main>
                </div>
              </div>
            </Router>
          </ExecucaoProvider>
        </ActivityTimerProvider>
      </UserProvider>

      {/* ✅ Adicionar componente Toast */}
      <Toast />
    </div>
  );
}

export default App;
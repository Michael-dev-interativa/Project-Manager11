import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // IMPORTANTE: Importar os estilos
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export const createPageUrl = (pageName, params = {}) => {
  const routes = {
    'Dashboard': '/',
    'Usuarios': '/usuarios',
    'Empreendimentos': '/empreendimentos',
    'Planejamento': '/planejamento',
    'SeletorPlanejamento': '/seletor-planejamento',
    'Relatorios': '/relatorios',
    'AnaliseConcepcao': '/analise-concepcao',
    'Configuracoes': '/configuracoes'
  };

  let url = routes[pageName] || '/';

  if (Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  return url;
};

// Utilitários gerais
export const Utils = {
  createPageUrl,
  formatDate: (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  },
  formatCurrency: (value) => {
    if (!value && value !== 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
};

export default Utils;
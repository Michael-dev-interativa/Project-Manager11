export const createPageUrl = (pageName) => {
  const routes = {
    'Dashboard': '/',
    'Usuarios': '/usuarios',
    'Empreendimentos': '/empreendimentos',
    'Relatorios': '/relatorios',
    'AnaliseConcepcaoPlanejamento': '/analise-concepcao-planejamento',
    'SeletorPlanejamento': '/seletor-planejamento',
    'Planejamento': '/planejamento',
    'AtaPlanejamento': '/ata-planejamento'
  };

  return routes[pageName] || '/';
};

export const Utils = {
  createPageUrl,
  formatDate: (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  },
  formatCurrency: (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
};
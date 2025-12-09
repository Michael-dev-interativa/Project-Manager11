// src/api/empreendimentoAPI.js

const API_URL = 'https://app.base44.com/api/apps/6849788440d6602a66231f50/entities/Empreendimento';
const API_KEY = 'febdec35592b41fba14b40172ed4cddc';

export const EmpreendimentoAPI = {
  list: async () => {
    const response = await fetch(API_URL, {
      headers: {
        'api_key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Erro ao buscar empreendimentos');
    return response.json();
  }
};

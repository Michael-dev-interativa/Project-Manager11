// src/api/usuarioAPI.js

const API_URL = 'https://app.base44.com/api/apps/6849788440d6602a66231f50/entities/Usuario';
const API_KEY = 'febdec35592b41fba14b40172ed4cddc';

export const UsuarioAPI = {
  list: async () => {
    const response = await fetch(API_URL, {
      headers: {
        'api_key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Erro ao buscar usuários');
    return response.json();
  },

  update: async (entityId, updateData) => {
    const response = await fetch(`${API_URL}/${entityId}`, {
      method: 'PUT',
      headers: {
        'api_key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Erro ao atualizar usuário');
    return response.json();
  }
};

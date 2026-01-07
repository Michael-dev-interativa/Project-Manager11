// Classe genérica para entidades
import { apiRequest } from "./all";
export class EntityBase {
  constructor(name, mockItems = []) {
    this.name = name;
    this.mockData = mockItems;
  }

  async list(params = {}) {
    let endpoint = `/${this.name}`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      endpoint += `?${searchParams.toString()}`;
    }
    return await apiRequest(endpoint, { method: 'GET' });
  }

  async get(id) {
    return await apiRequest(`/${this.name}/${id}`);
  }

  async create(data) {
    const payload = { ...data };
    if ((this.name === 'Disciplina' || this.name === 'Atividades' || this.name === 'Atividade') && !('cor' in payload)) {
      payload.cor = null;
    }
    if (this.name === 'Execucao') {
      if (payload.planejamento_id) payload.planejamento_id = parseInt(payload.planejamento_id);
      if (payload.atividade_nome === undefined && payload.atividade) payload.atividade_nome = payload.atividade;
      console.log('Payload enviado para backend Execucao:', payload);
    }
    return await apiRequest(`/${this.name}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async update(id, data) {
    const payload = { ...data };
    if (!('cor' in payload)) payload.cor = null;
    console.log(`[${this.name}.update] PUT`, id, payload);
    return await apiRequest(`/${this.name}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async delete(id) {
    return await apiRequest(`/${this.name}/${id}`, { method: 'DELETE' });
  }

  async filter(params = {}) {
    return this.list(params);
  }

  async summary() {
    return await apiRequest(`/${this.name}/summary`);
  }

  async count(params = {}) {
    const items = await this.list(params);
    return items.length;
  }
}

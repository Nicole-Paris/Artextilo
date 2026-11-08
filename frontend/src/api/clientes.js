import { request } from './client.js';

function buildQuery(search) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const clientesApi = {
  list(search = '') {
    return request(`/clientes${buildQuery(search)}`);
  },

  get(id) {
    return request(`/clientes/${id}`);
  },

  create(payload) {
    return request('/clientes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  setCredito(id, payload) {
    return request(`/clientes/${id}/credito`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/clientes/${id}`, { method: 'DELETE' });
  },
};

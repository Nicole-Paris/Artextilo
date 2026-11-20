import { request } from './client.js';

function buildQuery(search, options = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (options.solo_frecuentes !== undefined) {
    params.set('solo_frecuentes', String(options.solo_frecuentes));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const clientesApi = {
  list(search = '', options = {}) {
    return request(`/clientes${buildQuery(search, options)}`);
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

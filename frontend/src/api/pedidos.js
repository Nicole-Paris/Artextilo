import { request } from './client.js';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const pedidosApi = {
  list(filters = {}) {
    return request(`/pedidos${buildQuery(filters)}`);
  },

  stats() {
    return request('/pedidos/stats');
  },

  get(id) {
    return request(`/pedidos/${id}`);
  },

  create(payload) {
    return request('/pedidos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addPago(id, payload) {
    return request(`/pedidos/${id}/pagos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cambiarEstado(id, payload) {
    return request(`/pedidos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  cancelar(id, payload) {
    return request(`/pedidos/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

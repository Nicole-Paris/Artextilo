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

export const devolucionesApi = {
  list(filters = {}) {
    return request(`/devoluciones${buildQuery(filters)}`);
  },

  get(id) {
    return request(`/devoluciones/${id}`);
  },

  resumenPedido(idPedido) {
    return request(`/devoluciones/pedido/${idPedido}`);
  },

  create(payload) {
    return request('/devoluciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

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

export const inventarioApi = {
  list(filters = {}) {
    return request(`/inventario${buildQuery(filters)}`);
  },

  get(id) {
    return request(`/inventario/${id}`);
  },

  create(payload) {
    return request('/inventario', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStockMinimo(id, payload) {
    return request(`/inventario/${id}/stock-minimo`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  registrarMovimiento(payload) {
    const url = payload.id_inventario
      ? `/inventario/${payload.id_inventario}/movimientos`
      : '/inventario/movimientos';

    return request(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listMovimientos(filters = {}) {
    return request(`/inventario/movimientos${buildQuery(filters)}`);
  },

  getStats(id_sucursal = null) {
    const query = id_sucursal ? `?id_sucursal=${encodeURIComponent(id_sucursal)}` : '';
    return request(`/inventario/stats${query}`);
  },

  remove(id) {
    return request(`/inventario/${id}`, {
      method: 'DELETE',
    });
  },
};


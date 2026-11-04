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

export const cajaApi = {
  list(filters = {}) {
    return request(`/caja${buildQuery(filters)}`);
  },

  get(id) {
    return request(`/caja/${id}`);
  },

  abierta(id_empleado) {
    return request(`/caja/abierta${buildQuery({ id_empleado })}`);
  },

  abrir(payload) {
    return request('/caja/abrir', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cerrar(id, payload) {
    return request(`/caja/${id}/cerrar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  pagos(id) {
    return request(`/caja/${id}/pagos`);
  },
};

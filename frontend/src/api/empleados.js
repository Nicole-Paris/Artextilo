import { request } from './client.js';

function buildQuery(search) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const empleadosApi = {
  list(search = '') {
    return request(`/empleados${buildQuery(search)}`);
  },

  get(id) {
    return request(`/empleados/${id}`);
  },

  create(payload) {
    return request('/empleados', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/empleados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  setEstado(id, estado) {
    return request(`/empleados/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
  },
};

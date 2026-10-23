import { request } from './client.js';

function buildQuery(search, archived) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (archived) params.set('archived', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const sucursalesApi = {
  list(search = '', { archived = false } = {}) {
    return request(`/sucursales${buildQuery(search, archived)}`);
  },

  get(id) {
    return request(`/sucursales/${id}`);
  },

  dependencies(id) {
    return request(`/sucursales/${id}/dependencies`);
  },

  create(payload) {
    return request('/sucursales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/sucursales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/sucursales/${id}`, { method: 'DELETE' });
  },

  restore(id) {
    return request(`/sucursales/${id}/restore`, { method: 'POST' });
  },
};

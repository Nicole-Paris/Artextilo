import { request } from './client.js';

function buildQuery(search, archived) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (archived) params.set('archived', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const rolesApi = {
  list(search = '', { archived = false } = {}) {
    return request(`/roles${buildQuery(search, archived)}`);
  },

  get(id) {
    return request(`/roles/${id}`);
  },

  dependencies(id) {
    return request(`/roles/${id}/dependencies`);
  },

  create(payload) {
    return request('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/roles/${id}`, { method: 'DELETE' });
  },

  restore(id) {
    return request(`/roles/${id}/restore`, { method: 'POST' });
  },
};


import { request } from './client.js';

export const globalValuesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();

    if (params.search) query.set('search', params.search);
    if (params.tipo) query.set('tipo', params.tipo);
    if (params.archived) query.set('archived', 'true');

    const queryString = query.toString();

    return request(
      `/global-values${queryString ? `?${queryString}` : ''}`,
    );
  },

  getById: (id) =>
    request(`/global-values/${id}`),

  create: (payload) =>
    request('/global-values', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    request(`/global-values/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id) =>
    request(`/global-values/${id}`, {
      method: 'DELETE',
    }),

  restore: (id) =>
    request(`/global-values/${id}/restore`, {
      method: 'POST',
    }),
};
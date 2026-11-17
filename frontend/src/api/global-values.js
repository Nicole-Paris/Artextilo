import { request } from './client.js';

export const globalValuesApi = {
  getAll(params = {}) {
    const query = new URLSearchParams();

    if (params.search) query.set('search', params.search);
    if (params.tipo) query.set('tipo', params.tipo);

    const queryString = query.toString();

    return request(
      `/global-values${queryString ? `?${queryString}` : ''}`,
    );
  },

  getById(id) {
    return request(`/global-values/${id}`);
  },

  update(id, payload) {
    return request(`/global-values/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

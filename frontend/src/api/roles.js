import { request } from './client.js';

export const rolesApi = {
  list() {
    return request('/roles');
  },
};

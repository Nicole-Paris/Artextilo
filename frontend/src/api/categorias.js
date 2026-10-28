import { request } from './client.js';

function buildQuery(search = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const categoriasApi = {
  list(search = '') {
    return request(`/categorias${buildQuery(search)}`);
  },

  get(id) {
    return request(`/categorias/${id}`);
  },

  create(payload) {
    return request('/categorias', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/categorias/${id}`, {
      method: 'DELETE',
    });
  },
};

// Compatibilidad con código previo
export const categoriaService = {
  listar: (search) => categoriasApi.list(search),
  obtenerPorId: (id) => categoriasApi.get(id),
  crear: (payload) => categoriasApi.create(payload),
  actualizar: (id, payload) => categoriasApi.update(id, payload),
  eliminar: (id) => categoriasApi.remove(id),
};
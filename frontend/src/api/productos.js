import { request } from './client.js';

function buildQuery({ search = '', id_categoria = null, genero = null, estado = null } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (id_categoria) params.set('id_categoria', String(id_categoria));
  if (genero) params.set('genero', genero);
  if (estado) params.set('estado', estado);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const productosApi = {
  list(filters = {}) {
    return request(`/productos${buildQuery(filters)}`);
  },

  get(id) {
    return request(`/productos/${id}`);
  },

  create(payload) {
    return request('/productos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/productos/${id}`, {
      method: 'DELETE',
    });
  },
};

// Compatibilidad con código previo
export const productoService = {
  listar: (filters) => productosApi.list(filters),
  obtenerPorId: (id) => productosApi.get(id),
  crear: (payload) => productosApi.create(payload),
  actualizar: (id, payload) => productosApi.update(id, payload),
  eliminar: (id) => productosApi.remove(id),
};
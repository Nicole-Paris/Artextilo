import { request } from './client.js';

export const reportesApi = {
  getReporte(params = {}) {
    const query = new URLSearchParams();
    if (params.fecha_inicio) query.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) query.set('fecha_fin', params.fecha_fin);
    if (params.id_sucursal) query.set('id_sucursal', String(params.id_sucursal));

    const qs = query.toString();
    return request(`/reportes${qs ? `?${qs}` : ''}`);
  },
};

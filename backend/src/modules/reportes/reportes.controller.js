import { getReporteData } from './reportes.service.js';

export async function index(req, res) {
  const { fecha_inicio, fecha_fin, id_sucursal } = req.query;

  const data = await getReporteData({
    fecha_inicio: typeof fecha_inicio === 'string' && fecha_inicio ? fecha_inicio : null,
    fecha_fin: typeof fecha_fin === 'string' && fecha_fin ? fecha_fin : null,
    id_sucursal: id_sucursal ? Number(id_sucursal) : null,
  });

  res.json({
    success: true,
    data,
  });
}

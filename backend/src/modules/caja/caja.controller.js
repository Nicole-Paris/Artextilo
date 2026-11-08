import {
  cajaClosePayloadSchema,
  cajaEmpleadoIdSchema,
  cajaIdSchema,
  cajaOpenPayloadSchema,
} from './caja.schema.js';
import {
  closeCorte,
  getCorte,
  getOpenCorteByEmpleado,
  listCortes,
  listPagosCorte,
  openCorte,
} from './caja.service.js';

export async function index(req, res) {
  const estado =
    req.query.estado === 'abierto' || req.query.estado === 'cerrado'
      ? req.query.estado
      : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const data = await listCortes({
    estado,
    id_sucursal: req.query.id_sucursal || null,
    id_empleado: req.query.id_empleado || null,
    search,
    limit: req.query.limit ? Number(req.query.limit) : 100,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  });

  res.json({ data });
}

export async function show(req, res) {
  const id = cajaIdSchema.parse(req.params.id);
  const data = await getCorte(id);
  res.json({ data });
}

export async function abierta(req, res) {
  const id_empleado = cajaEmpleadoIdSchema.parse(req.query.id_empleado);
  const data = await getOpenCorteByEmpleado(id_empleado);
  res.json({ data });
}

export async function store(req, res) {
  const payload = cajaOpenPayloadSchema.parse(req.body);
  const data = await openCorte(payload, req.user?.id_empleado);
  res.status(201).json({
    data,
    message: 'Caja abierta correctamente',
  });
}

export async function cerrar(req, res) {
  const id = cajaIdSchema.parse(req.params.id);
  const payload = cajaClosePayloadSchema.parse(req.body);
  const data = await closeCorte(id, payload, req.user?.id_empleado);
  res.json({
    data,
    message: 'Caja cerrada correctamente',
  });
}

export async function pagos(req, res) {
  const id = cajaIdSchema.parse(req.params.id);
  const data = await listPagosCorte(id);
  res.json({ data });
}

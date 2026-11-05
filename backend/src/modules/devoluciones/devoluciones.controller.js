import {
  devolucionIdSchema,
  devolucionPayloadSchema,
  devolucionesListQuerySchema,
  devolucionPedidoIdSchema,
} from './devoluciones.schema.js';
import {
  createDevolucion,
  getDevolucionDetalle,
  getResumenDevolucionPedido,
  listDevoluciones,
} from './devoluciones.service.js';

export async function index(req, res) {
  const query = devolucionesListQuerySchema.parse(req.query);
  const data = await listDevoluciones(query);
  res.json({ data });
}

export async function show(req, res) {
  const id = devolucionIdSchema.parse(req.params.id);
  const data = await getDevolucionDetalle(id);
  res.json({ data });
}

export async function showPedido(req, res) {
  const idPedido = devolucionPedidoIdSchema.parse(req.params.idPedido);
  const data = await getResumenDevolucionPedido(idPedido);
  res.json({ data });
}

export async function store(req, res) {
  const payload = devolucionPayloadSchema.parse(req.body);
  const data = await createDevolucion(payload);
  res.status(201).json({
    data,
    message: 'Devolución registrada correctamente',
  });
}

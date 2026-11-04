import {
  pagoPayloadSchema,
  pedidoCancelPayloadSchema,
  pedidoCreatePayloadSchema,
  pedidoEstadoPayloadSchema,
  pedidoIdSchema,
} from './pedidos.schema.js';
import {
  addPago,
  cancelPedido,
  changeEstado,
  createPedido,
  getPedido,
  getPedidoStats,
  listPedidos,
} from './pedidos.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const estado = typeof req.query.estado === 'string' ? req.query.estado : null;
  const estado_pago =
    typeof req.query.estado_pago === 'string' ? req.query.estado_pago : null;

  const data = await listPedidos({
    search,
    estado,
    estado_pago,
    id_sucursal: req.query.id_sucursal || null,
    id_cliente: req.query.id_cliente || null,
    limit: req.query.limit ? Number(req.query.limit) : 100,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  });

  res.json({ data });
}

export async function show(req, res) {
  const id = pedidoIdSchema.parse(req.params.id);
  const data = await getPedido(id);
  res.json({ data });
}

export async function store(req, res) {
  const payload = pedidoCreatePayloadSchema.parse(req.body);
  const data = await createPedido(payload, req.user?.id_empleado);
  res.status(201).json({
    data,
    message: 'Pedido creado correctamente',
  });
}

export async function storePago(req, res) {
  const id = pedidoIdSchema.parse(req.params.id);
  const payload = pagoPayloadSchema.parse(req.body);
  const data = await addPago(id, payload, req.user?.id_empleado);
  res.status(201).json({
    data,
    message: 'Pago registrado correctamente',
  });
}

export async function updateEstado(req, res) {
  const id = pedidoIdSchema.parse(req.params.id);
  const payload = pedidoEstadoPayloadSchema.parse(req.body);
  const data = await changeEstado(id, payload, req.user?.id_empleado);
  res.json({
    data,
    message: 'Estado del pedido actualizado correctamente',
  });
}

export async function cancelar(req, res) {
  const id = pedidoIdSchema.parse(req.params.id);
  const payload = pedidoCancelPayloadSchema.parse(req.body);
  const data = await cancelPedido(id, payload, req.user?.id_empleado);
  res.json({
    data,
    message: 'Pedido cancelado correctamente',
  });
}

export async function stats(req, res) {
  const data = await getPedidoStats();
  res.json({ data });
}

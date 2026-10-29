import {
  inventarioCreatePayloadSchema,
  inventarioIdSchema,
  inventarioStockMinimoPayloadSchema,
  movimientoPayloadSchema,
} from './inventario.schema.js';
import {
  archiveInventario,
  createInventario,
  getInventario,
  getInventarioStats,
  listInventario,
  listMovimientos,
  registerMovimiento,
  updateStockMinimo,
} from './inventario.service.js';

export async function index(req, res) {
  const { search, id_sucursal, id_producto, id_categoria, bajo_stock } = req.query;
  const inventario = await listInventario({
    search: typeof search === 'string' ? search.trim() : '',
    id_sucursal,
    id_producto,
    id_categoria,
    bajo_stock,
  });

  res.json({ success: true, data: inventario });
}

export async function show(req, res) {
  const id = inventarioIdSchema.parse(req.params.id);
  const data = await getInventario(id);
  res.json({ success: true, data });
}

export async function store(req, res) {
  const payload = inventarioCreatePayloadSchema.parse(req.body);
  const data = await createInventario(payload, req.user?.id_empleado);
  res.status(201).json({
    success: true,
    data,
    message: 'Producto asignado al inventario de la sucursal correctamente',
  });
}

export async function updateMinimo(req, res) {
  const id = inventarioIdSchema.parse(req.params.id);
  const payload = inventarioStockMinimoPayloadSchema.parse(req.body);
  const data = await updateStockMinimo(id, payload, req.user?.id_empleado);
  res.json({
    success: true,
    data,
    message: 'Stock mínimo actualizado correctamente',
  });
}

export async function storeMovimiento(req, res) {
  const id_inventario = req.params.id
    ? inventarioIdSchema.parse(req.params.id)
    : req.body.id_inventario;

  const payload = movimientoPayloadSchema.parse({
    ...req.body,
    id_inventario,
  });

  const data = await registerMovimiento(payload, req.user?.id_empleado);
  res.status(201).json({
    success: true,
    data,
    message:
      payload.tipo === 'entrada'
        ? 'Entrada de mercancía registrada exitosamente'
        : 'Salida de mercancía registrada exitosamente',
  });
}

export async function movimientos(req, res) {
  const { id_inventario, id_sucursal, id_producto, tipo, search, limit, offset } = req.query;
  const data = await listMovimientos({
    id_inventario,
    id_sucursal,
    id_producto,
    tipo: typeof tipo === 'string' ? tipo.trim() : null,
    search: typeof search === 'string' ? search.trim() : '',
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });

  res.json({ success: true, data });
}

export async function stats(req, res) {
  const { id_sucursal } = req.query;
  const data = await getInventarioStats({ id_sucursal });
  res.json({ success: true, data });
}

export async function destroy(req, res) {
  const id = inventarioIdSchema.parse(req.params.id);
  await archiveInventario(id, req.user?.id_empleado);
  res.json({
    success: true,
    message: 'Registro de inventario eliminado correctamente',
  });
}


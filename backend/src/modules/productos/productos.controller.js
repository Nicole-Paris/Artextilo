import {
  productoIdSchema,
  productoPayloadSchema,
} from './productos.schema.js';
import {
  archiveProducto,
  createProducto,
  getProducto,
  listProductos,
  updateProducto,
} from './productos.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const id_categoria = req.query.id_categoria ? Number(req.query.id_categoria) : null;
  const genero = typeof req.query.genero === 'string' ? req.query.genero.trim() : null;
  const estado = typeof req.query.estado === 'string' ? req.query.estado.trim() : null;

  const productos = await listProductos({
    search,
    id_categoria,
    genero,
    estado,
  });

  res.json({ success: true, data: productos });
}

export async function show(req, res) {
  const id = productoIdSchema.parse(req.params.id);
  const producto = await getProducto(id);
  res.json({ success: true, data: producto });
}

export async function store(req, res) {
  const payload = productoPayloadSchema.parse(req.body);
  const producto = await createProducto(payload, req.user?.id_empleado);
  res.status(201).json({
    success: true,
    data: producto,
    message: 'Producto registrado correctamente',
  });
}

export async function update(req, res) {
  const id = productoIdSchema.parse(req.params.id);
  const payload = productoPayloadSchema.parse(req.body);
  const producto = await updateProducto(id, payload, req.user?.id_empleado);
  res.json({
    success: true,
    data: producto,
    message: 'Producto actualizado correctamente',
  });
}

export async function destroy(req, res) {
  const id = productoIdSchema.parse(req.params.id);
  await archiveProducto(id, req.user?.id_empleado);
  res.json({
    success: true,
    message: 'Producto eliminado correctamente',
  });
}

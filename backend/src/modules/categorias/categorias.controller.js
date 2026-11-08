import {
  categoriaIdSchema,
  categoriaPayloadSchema,
} from './categorias.schema.js';
import {
  archiveCategoria,
  createCategoria,
  getCategoria,
  listCategorias,
  updateCategoria,
} from './categorias.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const estado = typeof req.query.estado === 'string' ? req.query.estado.trim() : null;
  const categorias = await listCategorias({ search, estado });
  res.json({ success: true, data: categorias });
}

export async function show(req, res) {
  const id = categoriaIdSchema.parse(req.params.id);
  const categoria = await getCategoria(id);
  res.json({ success: true, data: categoria });
}

export async function store(req, res) {
  const payload = categoriaPayloadSchema.parse(req.body);
  const categoria = await createCategoria(payload, req.user?.id_empleado);
  res.status(201).json({
    success: true,
    data: categoria,
    message: 'Categoría creada correctamente',
  });
}

export async function update(req, res) {
  const id = categoriaIdSchema.parse(req.params.id);
  const payload = categoriaPayloadSchema.parse(req.body);
  const categoria = await updateCategoria(id, payload, req.user?.id_empleado);
  res.json({
    success: true,
    data: categoria,
    message: 'Categoría actualizada correctamente',
  });
}

export async function destroy(req, res) {
  const id = categoriaIdSchema.parse(req.params.id);
  await archiveCategoria(id, req.user?.id_empleado);
  res.json({
    success: true,
    message: 'Categoría eliminada correctamente',
  });
}

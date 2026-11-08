
import {
  globalValueIdSchema,
  globalValuePayloadSchema,
} from './global-values.schema.js';

import {
  archiveGlobalValue,
  createGlobalValue,
  getGlobalValue,
  listGlobalValues,
  restoreGlobalValue,
  updateGlobalValue,
} from './global-values.service.js';

export async function index(req, res) {
  const search =
    typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const tipo =
    typeof req.query.tipo === 'string' ? req.query.tipo.trim() : '';

  const archived = req.query.archived === 'true';

  const values = await listGlobalValues({ search, tipo, archived });

  res.json({
    success: true,
    data: values,
  });
}

export async function show(req, res) {
  const id = globalValueIdSchema.parse(req.params.id);
  const value = await getGlobalValue(id);

  res.json({
    success: true,
    data: value,
  });
}

export async function store(req, res) {
  const payload = globalValuePayloadSchema.parse(req.body);

  const value = await createGlobalValue(
    payload,
    req.user?.id_empleado,
  );

  res.status(201).json({
    success: true,
    data: value,
    message: 'Valor global creado correctamente',
  });
}

export async function update(req, res) {
  const id = globalValueIdSchema.parse(req.params.id);
  const payload = globalValuePayloadSchema.parse(req.body);

  const value = await updateGlobalValue(
    id,
    payload,
    req.user?.id_empleado,
  );

  res.json({
    success: true,
    data: value,
    message: 'Valor global actualizado correctamente',
  });
}

export async function destroy(req, res) {
  const id = globalValueIdSchema.parse(req.params.id);

  await archiveGlobalValue(id, req.user?.id_empleado);

  res.json({
    success: true,
    message: 'Valor global eliminado correctamente',
  });
}

export async function restore(req, res) {
  const id = globalValueIdSchema.parse(req.params.id);

  const value = await restoreGlobalValue(
    id,
    req.user?.id_empleado,
  );

  res.json({
    success: true,
    data: value,
    message: 'Valor global restaurado correctamente',
  });
}
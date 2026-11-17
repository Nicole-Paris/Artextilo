import {
  globalValueIdSchema,
  globalValuePayloadSchema,
} from './global-values.schema.js';

import {
  getGlobalValue,
  listGlobalValues,
  updateGlobalValue,
} from './global-values.service.js';

export async function index(req, res) {
  const search =
    typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const tipo =
    typeof req.query.tipo === 'string' ? req.query.tipo.trim() : '';

  const values = await listGlobalValues({ search, tipo });

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

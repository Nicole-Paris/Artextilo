import {
  globalValueIdSchema,
  globalValuePayloadSchema,
} from './global-values.schema.js';

import {
  createGlobalValue,
  getGlobalValue,
  getLogo,
  listGlobalValues,
  setLogo,
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

export async function create(req, res) {
  const payload = globalValuePayloadSchema.parse(req.body);
  const value = await createGlobalValue(payload, req.user?.id_empleado);

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

export async function getLogoHandler(req, res) {
  const logo = await getLogo();
  res.json({
    success: true,
    data: { logo },
  });
}

export async function updateLogoHandler(req, res) {
  const { logo } = req.body || {};
  if (!logo || typeof logo !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Se requiere una imagen de logotipo válida.',
    });
  }

  const saved = await setLogo(logo, req.user?.id_empleado);
  res.json({
    success: true,
    data: { logo: saved },
    message: 'Logotipo actualizado correctamente',
  });
}


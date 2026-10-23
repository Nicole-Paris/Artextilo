import { sucursalIdSchema, sucursalPayloadSchema } from './sucursales.schema.js';
import {
  archiveSucursal,
  createSucursal,
  getSucursal,
  getSucursalDependencies,
  listSucursales,
  restoreSucursal,
  updateSucursal,
} from './sucursales.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const archived = req.query.archived === 'true';
  const sucursales = await listSucursales({ search, archived });
  res.json({ data: sucursales });
}

export async function show(req, res) {
  const id = sucursalIdSchema.parse(req.params.id);
  const sucursal = await getSucursal(id);
  res.json({ data: sucursal });
}

export async function dependencies(req, res) {
  const id = sucursalIdSchema.parse(req.params.id);
  const data = await getSucursalDependencies(id);
  res.json({ data });
}

export async function store(req, res) {
  const payload = sucursalPayloadSchema.parse(req.body);
  const sucursal = await createSucursal(payload);
  res.status(201).json({ data: sucursal, message: 'Sucursal creada correctamente' });
}

export async function update(req, res) {
  const id = sucursalIdSchema.parse(req.params.id);
  const payload = sucursalPayloadSchema.parse(req.body);
  const sucursal = await updateSucursal(id, payload);
  res.json({ data: sucursal, message: 'Sucursal actualizada correctamente' });
}

export async function destroy(req, res) {
  const id = sucursalIdSchema.parse(req.params.id);
  await archiveSucursal(id);
  res.json({ message: 'Sucursal archivada correctamente' });
}

export async function restore(req, res) {
  const id = sucursalIdSchema.parse(req.params.id);
  const sucursal = await restoreSucursal(id);
  res.json({ data: sucursal, message: 'Sucursal restaurada correctamente' });
}

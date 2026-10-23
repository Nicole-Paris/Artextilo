import { roleIdSchema, rolePayloadSchema } from './roles.schema.js';
import {
  archiveRole,
  createRole,
  getRole,
  getRoleDependencies,
  listRoles,
  restoreRole,
  updateRole,
} from './roles.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const archived = req.query.archived === 'true';
  const roles = await listRoles({ search, archived });
  res.json({ data: roles });
}

export async function show(req, res) {
  const id = roleIdSchema.parse(req.params.id);
  const role = await getRole(id);
  res.json({ data: role });
}

export async function dependencies(req, res) {
  const id = roleIdSchema.parse(req.params.id);
  const data = await getRoleDependencies(id);
  res.json({ data });
}

export async function store(req, res) {
  const payload = rolePayloadSchema.parse(req.body);
  const role = await createRole(payload);
  res.status(201).json({ data: role, message: 'Rol creado correctamente' });
}

export async function update(req, res) {
  const id = roleIdSchema.parse(req.params.id);
  const payload = rolePayloadSchema.parse(req.body);
  const role = await updateRole(id, payload);
  res.json({ data: role, message: 'Rol actualizado correctamente' });
}

export async function destroy(req, res) {
  const id = roleIdSchema.parse(req.params.id);
  await archiveRole(id);
  res.json({ message: 'Rol archivado correctamente' });
}

export async function restore(req, res) {
  const id = roleIdSchema.parse(req.params.id);
  const role = await restoreRole(id);
  res.json({ data: role, message: 'Rol restaurado correctamente' });
}

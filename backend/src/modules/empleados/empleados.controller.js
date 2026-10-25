import {
  empleadoCreatePayloadSchema,
  empleadoEstadoSchema,
  empleadoIdSchema,
  empleadoPayloadSchema,
} from './empleados.schema.js';
import {
  archiveEmpleado,
  createEmpleado,
  getEmpleado,
  listEmpleados,
  restoreEmpleado,
  updateEstadoEmpleado,
  updateEmpleado,
} from './empleados.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const empleados = await listEmpleados({ search });
  res.json({ data: empleados });
}

export async function show(req, res) {
  const id = empleadoIdSchema.parse(req.params.id);
  const empleado = await getEmpleado(id);
  res.json({ data: empleado });
}

export async function store(req, res) {
  const payload = empleadoCreatePayloadSchema.parse(req.body);
  const empleado = await createEmpleado(payload);
  res.status(201).json({ data: empleado, message: 'Empleado registrado correctamente' });
}

export async function update(req, res) {
  const id = empleadoIdSchema.parse(req.params.id);
  const payload = empleadoPayloadSchema.parse(req.body);
  const empleado = await updateEmpleado(id, payload);
  res.json({ data: empleado, message: 'Empleado actualizado correctamente' });
}

export async function destroy(req, res) {
  const id = empleadoIdSchema.parse(req.params.id);
  await archiveEmpleado(id);
  res.json({ message: 'Empleado archivado correctamente' });
}

export async function restore(req, res) {
  const id = empleadoIdSchema.parse(req.params.id);
  const empleado = await restoreEmpleado(id);
  res.json({ data: empleado, message: 'Empleado restaurado correctamente' });
}

export async function updateEstado(req, res) {
  const id = empleadoIdSchema.parse(req.params.id);
  const { estado } = empleadoEstadoSchema.parse(req.body);
  const empleado = await updateEstadoEmpleado(id, estado);
  const message = estado === 'activo'
    ? 'Empleado activado correctamente'
    : 'Empleado desactivado correctamente';
  res.json({ data: empleado, message });
}

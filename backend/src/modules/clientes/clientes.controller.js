import {
  clienteCreditoPayloadSchema,
  clienteIdSchema,
  clientePayloadSchema,
} from './clientes.schema.js';
import {
  createCliente,
  deleteCliente,
  getCliente,
  listClientes,
  setCreditoCliente,
  updateCliente,
} from './clientes.service.js';

export async function index(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const clientes = await listClientes({ search });
  res.json({ data: clientes });
}

export async function show(req, res) {
  const id = clienteIdSchema.parse(req.params.id);
  const cliente = await getCliente(id);
  res.json({ data: cliente });
}

export async function store(req, res) {
  const payload = clientePayloadSchema.parse(req.body);
  const cliente = await createCliente(payload);
  res.status(201).json({ data: cliente, message: 'Cliente registrado correctamente' });
}

export async function update(req, res) {
  const id = clienteIdSchema.parse(req.params.id);
  const payload = clientePayloadSchema.parse(req.body);
  const cliente = await updateCliente(id, payload);
  res.json({ data: cliente, message: 'Cliente actualizado correctamente' });
}

export async function updateCredito(req, res) {
  const id = clienteIdSchema.parse(req.params.id);
  const payload = clienteCreditoPayloadSchema.parse(req.body);
  const cliente = await setCreditoCliente(id, payload);
  const message = payload.tiene_credito
    ? 'Crédito asignado correctamente'
    : 'Crédito retirado correctamente';
  res.json({ data: cliente, message });
}

export async function destroy(req, res) {
  const id = clienteIdSchema.parse(req.params.id);
  const cliente = await deleteCliente(id);
  res.json({ data: cliente, message: 'Cliente eliminado correctamente' });
}

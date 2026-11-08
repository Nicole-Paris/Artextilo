import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT id_cliente, nombre, apellido_paterno, apellido_materno,
         telefono, correo, direccion, ciudad, estado_republica, codigo_postal,
         es_frecuente, tiene_credito, limite_credito, created_at, updated_at
  FROM cliente
`;

function normalizeCliente(row) {
  return { ...row, tiene_credito: Boolean(row.tiene_credito) };
}

async function ensureTelefonoAvailable(telefono, excludeId = null) {
  const params = [telefono];
  let sql = `
    SELECT id_cliente
    FROM cliente
    WHERE telefono = ? AND deleted_at IS NULL`;

  if (excludeId !== null) {
    sql += ' AND id_cliente <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';
  const [existing] = await pool.execute(sql, params);

  if (existing.length > 0) {
    throw ApiError.conflict('Error al intentar registrar un cliente duplicado');
  }
}

export async function listClientes({ search = '' } = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE deleted_at IS NULL`;

  if (search) {
    sql += ` AND (
      CONCAT_WS(' ', nombre, apellido_paterno, apellido_materno) LIKE ?
      OR telefono LIKE ?
    )`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY nombre ASC, apellido_paterno ASC';
  const [rows] = await pool.execute(sql, params);
  return rows.map(normalizeCliente);
}

export async function getCliente(id) {
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE deleted_at IS NULL AND id_cliente = ? LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Cliente no encontrado');
  }

  return normalizeCliente(rows[0]);
}

export async function createCliente(payload) {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    telefono,
    correo,
    direccion,
    ciudad,
    estado_republica,
    codigo_postal,
    tiene_credito = false,
    limite_credito = 0,
  } = payload;

  await ensureTelefonoAvailable(telefono);
  const [result] = await pool.execute(
    `INSERT INTO cliente (
       nombre, apellido_paterno, apellido_materno, telefono, correo, direccion,
       ciudad, estado_republica, codigo_postal, tiene_credito, limite_credito
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      apellido_paterno,
      apellido_materno,
      telefono,
      correo,
      direccion,
      ciudad,
      estado_republica,
      codigo_postal,
      tiene_credito ? 1 : 0,
      tiene_credito ? limite_credito : 0,
    ],
  );

  return getCliente(result.insertId);
}

export async function updateCliente(id, payload) {
  const current = await getCliente(id);
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    telefono,
    correo,
    direccion,
    ciudad,
    estado_republica,
    codigo_postal,
    tiene_credito,
    limite_credito,
  } = payload;

  await ensureTelefonoAvailable(telefono, id);
  const params = [
    nombre,
    apellido_paterno,
    apellido_materno,
    telefono,
    correo,
    direccion,
    ciudad,
    estado_republica,
    codigo_postal,
  ];
  let creditUpdate = '';
  if (tiene_credito !== undefined || limite_credito !== undefined) {
    const tieneCreditoFinal = tiene_credito ?? Boolean(current.tiene_credito);
    const limiteCreditoFinal = tieneCreditoFinal
      ? limite_credito ?? Number(current.limite_credito)
      : 0;

    if (
      tieneCreditoFinal &&
      (!Number.isInteger(limiteCreditoFinal) ||
        limiteCreditoFinal <= 0 ||
        limiteCreditoFinal > 99999999)
    ) {
      throw ApiError.badRequest(
        'El límite de crédito debe ser mayor a 0',
        [{ field: 'limite_credito', message: 'El límite de crédito debe ser mayor a 0' }],
      );
    }

    creditUpdate = ', tiene_credito = ?, limite_credito = ?';
    params.push(tieneCreditoFinal ? 1 : 0, tieneCreditoFinal ? limiteCreditoFinal : 0);
  }
  params.push(id);

  await pool.execute(
    `UPDATE cliente
     SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, telefono = ?,
         correo = ?, direccion = ?, ciudad = ?, estado_republica = ?, codigo_postal = ?${creditUpdate}
     WHERE id_cliente = ? AND deleted_at IS NULL`,
    params,
  );

  return getCliente(id);
}

export async function setCreditoCliente(id, { tiene_credito, limite_credito }) {
  await getCliente(id);
  await pool.execute(
    `UPDATE cliente
     SET tiene_credito = ?, limite_credito = ?
     WHERE id_cliente = ? AND deleted_at IS NULL`,
    [tiene_credito ? 1 : 0, tiene_credito ? limite_credito : 0, id],
  );

  return getCliente(id);
}

export async function deleteCliente(id) {
  await getCliente(id);
  await pool.execute(
    'UPDATE cliente SET deleted_at = NOW() WHERE id_cliente = ? AND deleted_at IS NULL',
    [id],
  );

  return { id_cliente: id };
}

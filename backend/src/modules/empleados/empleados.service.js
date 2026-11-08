import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT e.id_empleado, e.nombre, e.apellido_paterno, e.apellido_materno,
         e.correo, e.telefono, e.estado, e.id_rol, r.nombre AS rol,
         e.id_sucursal, s.nombre AS sucursal,
         TIME_FORMAT(e.horario_entrada, '%H:%i') AS horario_entrada,
         TIME_FORMAT(e.horario_salida, '%H:%i') AS horario_salida,
         e.created_at, e.updated_at, e.deleted_at
  FROM empleado e
  INNER JOIN rol r ON r.id_rol = e.id_rol
  INNER JOIN sucursal s ON s.id_sucursal = e.id_sucursal
`;

async function ensureCorreoAvailable(correo, excludeId = null) {
  const params = [correo];
  let sql = `
    SELECT id_empleado
    FROM empleado
    WHERE LOWER(correo) = LOWER(?)`;

  if (excludeId !== null) {
    sql += ' AND id_empleado <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';
  const [existing] = await pool.execute(sql, params);

  if (existing.length > 0) {
    throw ApiError.conflict('Este correo ya está registrado');
  }
}

async function validateReferences(id_rol, id_sucursal) {
  const [roles] = await pool.execute(
    'SELECT id_rol FROM rol WHERE id_rol = ? AND deleted_at IS NULL LIMIT 1',
    [id_rol],
  );
  if (roles.length === 0) {
    throw ApiError.badRequest('El rol seleccionado no existe o está archivado');
  }

  const [sucursales] = await pool.execute(
    `SELECT id_sucursal
     FROM sucursal
     WHERE id_sucursal = ? AND deleted_at IS NULL AND estado = 'activa'
     LIMIT 1`,
    [id_sucursal],
  );
  if (sucursales.length === 0) {
    throw ApiError.badRequest('La sucursal seleccionada no existe, está archivada o inactiva');
  }
}

export async function listEmpleados({ search = '' } = {}) {
  const params = [];
  let sql = `
    SELECT e.id_empleado, e.nombre, e.apellido_paterno, e.apellido_materno,
           e.correo, e.telefono, e.estado, e.id_rol, r.nombre AS rol,
           e.id_sucursal, s.nombre AS sucursal,
           TIME_FORMAT(e.horario_entrada, '%H:%i') AS horario_entrada,
           TIME_FORMAT(e.horario_salida, '%H:%i') AS horario_salida
    FROM empleado e
    INNER JOIN rol r ON r.id_rol = e.id_rol
    INNER JOIN sucursal s ON s.id_sucursal = e.id_sucursal
    WHERE e.deleted_at IS NULL`;

  if (search) {
    sql += ` AND (e.nombre LIKE ? OR e.apellido_paterno LIKE ?
      OR e.apellido_materno LIKE ? OR e.correo LIKE ?)`;
    params.push(...Array(4).fill(`%${search}%`));
  }

  sql += ' ORDER BY e.apellido_paterno ASC, e.nombre ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getEmpleado(id, { includeArchived = false } = {}) {
  const condition = includeArchived
    ? 'e.id_empleado = ?'
    : 'e.deleted_at IS NULL AND e.id_empleado = ?';
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE ${condition} LIMIT 1`, [id]);

  if (rows.length === 0) {
    throw ApiError.notFound('Empleado no encontrado');
  }

  return rows[0];
}

export async function createEmpleado(payload) {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo,
    telefono,
    contrasena,
    id_rol,
    id_sucursal,
    horario_entrada = '09:00',
    horario_salida = '18:00',
  } = payload;

  await ensureCorreoAvailable(correo);
  await validateReferences(id_rol, id_sucursal);

  const hashedPassword = await bcrypt.hash(contrasena, 10);
  const [result] = await pool.execute(
    `INSERT INTO empleado (
       nombre, apellido_paterno, apellido_materno, correo, telefono,
       contrasena, horario_entrada, horario_salida, id_rol, id_sucursal, estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      telefono,
      hashedPassword,
      `${horario_entrada}:00`,
      `${horario_salida}:00`,
      id_rol,
      id_sucursal,
    ],
  );

  return getEmpleado(result.insertId);
}

export async function updateEmpleado(id, payload) {
  const current = await getEmpleado(id);
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo,
    telefono,
    contrasena,
    id_rol,
    id_sucursal,
    horario_entrada,
    horario_salida,
  } = payload;

  await ensureCorreoAvailable(correo, id);
  await validateReferences(id_rol, id_sucursal);

  const horarioEntradaFinal = horario_entrada ?? current.horario_entrada;
  const horarioSalidaFinal = horario_salida ?? current.horario_salida;
  if (horarioSalidaFinal <= horarioEntradaFinal) {
    throw ApiError.badRequest(
      'La hora de salida debe ser posterior a la de entrada',
      [{ field: 'horario_salida', message: 'La hora de salida debe ser posterior a la de entrada' }],
    );
  }

  const params = [
    nombre,
    apellido_paterno,
    apellido_materno,
    correo,
    telefono,
    id_rol,
    id_sucursal,
  ];
  let scheduleUpdate = '';
  if (horario_entrada !== undefined) {
    scheduleUpdate += ', horario_entrada = ?';
    params.push(`${horario_entrada}:00`);
  }
  if (horario_salida !== undefined) {
    scheduleUpdate += ', horario_salida = ?';
    params.push(`${horario_salida}:00`);
  }
  let passwordUpdate = '';

  if (contrasena) {
    passwordUpdate = ', contrasena = ?';
    params.push(await bcrypt.hash(contrasena, 10));
  }

  params.push(id);
  await pool.execute(
    `UPDATE empleado
     SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo = ?,
         telefono = ?, id_rol = ?, id_sucursal = ?${scheduleUpdate}${passwordUpdate}
     WHERE id_empleado = ?`,
    params,
  );

  return getEmpleado(id);
}

export async function updateEstadoEmpleado(id, estado) {
  await getEmpleado(id);
  await pool.execute('UPDATE empleado SET estado = ? WHERE id_empleado = ?', [estado, id]);
  return getEmpleado(id);
}

export async function archiveEmpleado(id) {
  await getEmpleado(id);
  await pool.execute(
    `UPDATE empleado
     SET deleted_at = NOW(), estado = 'inactivo'
     WHERE id_empleado = ?`,
    [id],
  );
  return { id_empleado: id };
}

export async function restoreEmpleado(id) {
  const empleado = await getEmpleado(id, { includeArchived: true });

  if (empleado.deleted_at === null) {
    throw ApiError.conflict('El empleado ya está activo.');
  }

  await pool.execute(
    `UPDATE empleado
     SET deleted_at = NULL, estado = 'activo'
     WHERE id_empleado = ?`,
    [id],
  );
  return getEmpleado(id);
}

import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT id_sucursal, nombre, direccion, codigo_postal, telefono, horario,
         created_at, updated_at, deleted_at
  FROM sucursal
`;

function scope(archived) {
  return archived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
}

async function countSucursalDependencies(id) {
  const [[empleadosRow]] = await pool.execute(
    `SELECT COUNT(*) AS empleados
     FROM empleado
     WHERE id_sucursal = ? AND deleted_at IS NULL`,
    [id],
  );
  const [[inventarioRow]] = await pool.execute(
    `SELECT COUNT(*) AS inventario
     FROM inventario
     WHERE id_sucursal = ? AND deleted_at IS NULL`,
    [id],
  );

  const empleados = Number(empleadosRow.empleados);
  const inventario = Number(inventarioRow.inventario);
  return { empleados, inventario, total: empleados + inventario };
}

export async function listSucursales({ search = '', archived = false } = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE ${scope(archived)}`;

  if (search) {
    sql += ' AND (nombre LIKE ? OR direccion LIKE ? OR telefono LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += archived ? ' ORDER BY deleted_at DESC, nombre ASC' : ' ORDER BY nombre ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getSucursal(id, { includeArchived = false } = {}) {
  const condition = includeArchived
    ? 'id_sucursal = ?'
    : 'deleted_at IS NULL AND id_sucursal = ?';
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE ${condition} LIMIT 1`, [id]);

  if (rows.length === 0) {
    throw ApiError.notFound('Sucursal no encontrada');
  }

  return rows[0];
}

export async function getSucursalDependencies(id) {
  await getSucursal(id);
  return countSucursalDependencies(id);
}

export async function createSucursal(payload) {
  const { nombre, direccion, codigo_postal, telefono, horario } = payload;

  const [existing] = await pool.execute(
    'SELECT id_sucursal FROM sucursal WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe una sucursal con ese nombre');
  }

  const [result] = await pool.execute(
    `INSERT INTO sucursal (nombre, direccion, codigo_postal, telefono, horario)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, direccion, codigo_postal, telefono, horario],
  );

  return getSucursal(result.insertId);
}

export async function updateSucursal(id, payload) {
  const { nombre, direccion, codigo_postal, telefono, horario } = payload;

  await getSucursal(id);

  const [existing] = await pool.execute(
    `SELECT id_sucursal
     FROM sucursal
     WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) AND id_sucursal <> ?
     LIMIT 1`,
    [nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe una sucursal con ese nombre');
  }

  await pool.execute(
    `UPDATE sucursal
     SET nombre = ?, direccion = ?, codigo_postal = ?, telefono = ?, horario = ?
     WHERE id_sucursal = ?`,
    [nombre, direccion, codigo_postal, telefono, horario, id],
  );

  return getSucursal(id);
}

export async function archiveSucursal(id) {
  await getSucursal(id);
  const dependencies = await countSucursalDependencies(id);

  if (dependencies.total > 0) {
    const parts = [];
    if (dependencies.empleados > 0) {
      parts.push(`${dependencies.empleados} empleado(s) activo(s)`);
    }
    if (dependencies.inventario > 0) {
      parts.push(`${dependencies.inventario} registro(s) de inventario activo(s)`);
    }

    throw ApiError.conflict(
      `No se puede archivar la sucursal porque tiene ${parts.join(' y ')}. Reasigna o desactiva esas dependencias primero.`,
    );
  }

  await pool.execute('UPDATE sucursal SET deleted_at = NOW() WHERE id_sucursal = ?', [id]);
  return { id_sucursal: id };
}

export async function restoreSucursal(id) {
  const sucursal = await getSucursal(id, { includeArchived: true });

  if (sucursal.deleted_at === null) {
    throw ApiError.conflict('La sucursal ya está activa.');
  }

  const [existing] = await pool.execute(
    'SELECT id_sucursal FROM sucursal WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) AND id_sucursal <> ? LIMIT 1',
    [sucursal.nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict(
      'Ya existe una sucursal activa con ese nombre. Cambia el nombre de la sucursal archivada antes de restaurarla.',
    );
  }

  await pool.execute('UPDATE sucursal SET deleted_at = NULL WHERE id_sucursal = ?', [id]);
  return getSucursal(id);
}

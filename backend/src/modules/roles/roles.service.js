import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT id_rol, nombre, descripcion, created_at, updated_at, deleted_at
  FROM rol
`;

function scope(archived) {
  return archived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
}

async function countRoleDependencies(id) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS empleados
     FROM empleado
     WHERE id_rol = ? AND deleted_at IS NULL`,
    [id],
  );

  const empleados = Number(row.empleados);
  return { empleados, total: empleados };
}

export async function listRoles({ search = '', archived = false } = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE ${scope(archived)}`;

  if (search) {
    sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += archived ? ' ORDER BY deleted_at DESC, nombre ASC' : ' ORDER BY nombre ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getRole(id, { includeArchived = false } = {}) {
  const condition = includeArchived ? 'id_rol = ?' : 'deleted_at IS NULL AND id_rol = ?';
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE ${condition} LIMIT 1`, [id]);

  if (rows.length === 0) {
    throw ApiError.notFound('Rol no encontrado');
  }

  return rows[0];
}

export async function getRoleDependencies(id) {
  await getRole(id);
  return countRoleDependencies(id);
}

export async function createRole({ nombre, descripcion }) {
  const [existing] = await pool.execute(
    'SELECT id_rol FROM rol WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe un rol con ese nombre');
  }

  const [result] = await pool.execute(
    'INSERT INTO rol (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion],
  );

  return getRole(result.insertId);
}

export async function updateRole(id, { nombre, descripcion }) {
  await getRole(id);

  const [existing] = await pool.execute(
    'SELECT id_rol FROM rol WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) AND id_rol <> ? LIMIT 1',
    [nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe un rol con ese nombre');
  }

  await pool.execute(
    'UPDATE rol SET nombre = ?, descripcion = ? WHERE id_rol = ?',
    [nombre, descripcion, id],
  );

  return getRole(id);
}

export async function archiveRole(id) {
  await getRole(id);
  const dependencies = await countRoleDependencies(id);

  if (dependencies.total > 0) {
    throw ApiError.conflict(
      `No se puede archivar el rol porque tiene ${dependencies.empleados} empleado(s) activo(s) asignado(s). Reasigna o desactiva esas dependencias primero.`,
    );
  }

  await pool.execute('UPDATE rol SET deleted_at = NOW() WHERE id_rol = ?', [id]);
  return { id_rol: id };
}

export async function restoreRole(id) {
  const role = await getRole(id, { includeArchived: true });

  if (role.deleted_at === null) {
    throw ApiError.conflict('El rol ya está activo.');
  }

  const [existing] = await pool.execute(
    'SELECT id_rol FROM rol WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) AND id_rol <> ? LIMIT 1',
    [role.nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict(
      'Ya existe un rol activo con ese nombre. Cambia el nombre del rol archivado antes de restaurarlo.',
    );
  }

  await pool.execute('UPDATE rol SET deleted_at = NULL WHERE id_rol = ?', [id]);
  return getRole(id);
}

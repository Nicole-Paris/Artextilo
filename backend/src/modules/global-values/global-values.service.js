
import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT
    id_global_value,
    tipo,
    nombre,
    valor,
    descripcion,
    created_at,
    updated_at,
    deleted_at,
    created_by,
    updated_by,
    deleted_by
  FROM global_values
`;

function scope(archived) {
  return archived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
}

export async function listGlobalValues({
  search = '',
  tipo = '',
  archived = false,
} = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE ${scope(archived)} AND tipo <> 'empresa'`;

  if (search) {
    sql += ' AND (nombre LIKE ? OR descripcion LIKE ? OR valor LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (tipo) {
    sql += ' AND tipo = ?';
    params.push(tipo);
  }

  sql += archived
    ? ' ORDER BY deleted_at DESC, nombre ASC'
    : ' ORDER BY tipo ASC, nombre ASC';

  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getGlobalValue(id, { includeArchived = false } = {}) {
  const condition = includeArchived
    ? 'id_global_value = ?'
    : 'deleted_at IS NULL AND id_global_value = ?';

  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE ${condition} LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Valor global no encontrado');
  }

  return rows[0];
}

export async function updateGlobalValue(
  id,
  { tipo, nombre, valor, descripcion },
  userId = null,
) {
  await getGlobalValue(id);

  const [existing] = await pool.execute(
    `SELECT id_global_value
     FROM global_values
     WHERE LOWER(nombre) = LOWER(?)
       AND id_global_value <> ?
     LIMIT 1`,
    [nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe otro valor global con ese nombre');
  }

  await pool.execute(
    `UPDATE global_values
     SET tipo = ?,
         nombre = ?,
         valor = ?,
         descripcion = ?,
         updated_by = ?
     WHERE id_global_value = ? AND deleted_at IS NULL`,
    [tipo, nombre, valor, descripcion ?? null, userId || null, id],
  );

  return getGlobalValue(id);
}
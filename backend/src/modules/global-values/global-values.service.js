
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
  let sql = `${BASE_SELECT} WHERE ${scope(archived)} AND tipo NOT IN ('empresa', 'seguridad') AND nombre NOT IN ('moneda', 'logo_empresa')`;

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

export async function createGlobalValue(
  { tipo, nombre, valor, descripcion },
  userId = null,
) {
  const [existing] = await pool.execute(
    `SELECT id_global_value
     FROM global_values
     WHERE LOWER(nombre) = LOWER(?)
     LIMIT 1`,
    [nombre],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe un valor global con ese nombre');
  }

  const [result] = await pool.execute(
    `INSERT INTO global_values (tipo, nombre, valor, descripcion, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [tipo, nombre, valor, descripcion ?? null, userId || null],
  );

  return getGlobalValue(result.insertId);
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

export async function getLogo() {
  try {
    const [rows] = await pool.execute(
      `SELECT valor FROM global_values WHERE nombre = 'logo_empresa' AND deleted_at IS NULL LIMIT 1`,
    );
    if (rows.length > 0 && rows[0].valor) {
      return rows[0].valor;
    }
  } catch (err) {
    console.error('Error fetching logo from global_values:', err.message);
  }
  return '/logo-artextilo.jpeg';
}

export async function setLogo(logoData, userId = null) {
  try {
    await pool.execute(
      `ALTER TABLE global_values MODIFY COLUMN valor LONGTEXT NOT NULL`,
    );
  } catch (_) {}

  const [existing] = await pool.execute(
    `SELECT id_global_value FROM global_values WHERE nombre = 'logo_empresa' LIMIT 1`,
  );

  if (existing.length > 0) {
    await pool.execute(
      `UPDATE global_values SET valor = ?, updated_by = ?, deleted_at = NULL WHERE id_global_value = ?`,
      [logoData, userId || null, existing[0].id_global_value],
    );
  } else {
    await pool.execute(
      `INSERT INTO global_values (tipo, nombre, valor, descripcion, created_by) VALUES ('general', 'logo_empresa', ?, 'Logotipo de la empresa', ?)`,
      [logoData, userId || null],
    );
  }

  return logoData;
}

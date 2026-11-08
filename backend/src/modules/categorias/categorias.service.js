import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT id_categoria, nombre, descripcion, estado, created_at, updated_at, deleted_at
  FROM categoria_producto
`;

async function countCategoriaDependencies(id) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM producto
     WHERE id_categoria = ? AND deleted_at IS NULL`,
    [id],
  );

  return Number(row.total);
}

export async function listCategorias({ search = '', estado = null } = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE deleted_at IS NULL`;

  if (search) {
    sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (estado) {
    sql += ' AND estado = ?';
    params.push(estado);
  }

  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getCategoria(id) {
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE deleted_at IS NULL AND id_categoria = ? LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Categoría no encontrada');
  }

  return rows[0];
}

export async function createCategoria({ nombre, descripcion, estado = 'activo' }, userId = null) {
  const [existing] = await pool.execute(
    'SELECT id_categoria FROM categoria_producto WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe una categoría con ese nombre');
  }

  const [result] = await pool.execute(
    'INSERT INTO categoria_producto (nombre, descripcion, estado, created_by) VALUES (?, ?, ?, ?)',
    [nombre, descripcion, estado, userId || null],
  );

  return getCategoria(result.insertId);
}

export async function updateCategoria(id, { nombre, descripcion, estado }, userId = null) {
  await getCategoria(id);

  const [existing] = await pool.execute(
    'SELECT id_categoria FROM categoria_producto WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) AND id_categoria <> ? LIMIT 1',
    [nombre, id],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe otra categoría con ese nombre');
  }

  await pool.execute(
    `UPDATE categoria_producto
     SET nombre = ?, descripcion = ?, estado = COALESCE(?, estado), updated_by = ?
     WHERE id_categoria = ? AND deleted_at IS NULL`,
    [nombre, descripcion, estado, userId || null, id],
  );

  return getCategoria(id);
}

export async function archiveCategoria(id, userId = null) {
  await getCategoria(id);

  const dependencies = await countCategoriaDependencies(id);
  if (dependencies > 0) {
    throw ApiError.conflict(
      `No se puede eliminar la categoría porque tiene ${dependencies} producto(s) asignado(s). Reasigna o elimina los productos primero.`,
    );
  }

  await pool.execute(
    'UPDATE categoria_producto SET deleted_at = NOW(), deleted_by = ? WHERE id_categoria = ?',
    [userId || null, id],
  );

  return { id_categoria: id };
}

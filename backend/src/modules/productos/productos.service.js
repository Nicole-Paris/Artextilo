import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT p.id_producto, p.id_categoria, c.nombre AS categoria_nombre,
         p.sku, p.nombre, p.genero, p.color, p.talla, p.descripcion,
         p.costo_compra, p.precio_unitario, p.estado,
         p.created_at, p.updated_at, p.deleted_at
  FROM producto p
  LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
`;

async function ensureCategoriaValida(idCategoria) {
  const [rows] = await pool.execute(
    'SELECT id_categoria, nombre FROM categoria_producto WHERE id_categoria = ? AND deleted_at IS NULL LIMIT 1',
    [idCategoria],
  );

  if (rows.length === 0) {
    throw ApiError.badRequest('La categoría seleccionada no existe o fue dada de baja');
  }
}

async function ensureSkuUnico(sku, excludeId = null) {
  if (!sku) return;

  const params = [sku];
  let sql = 'SELECT id_producto FROM producto WHERE deleted_at IS NULL AND sku = ?';

  if (excludeId !== null) {
    sql += ' AND id_producto <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';
  const [existing] = await pool.execute(sql, params);

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe un producto con ese SKU');
  }
}

export async function listProductos({
  search = '',
  id_categoria = null,
  genero = null,
  estado = null,
} = {}) {
  const params = [];
  let sql = `${BASE_SELECT} WHERE p.deleted_at IS NULL`;

  if (search) {
    sql += ` AND (
      p.nombre LIKE ?
      OR p.sku LIKE ?
      OR p.color LIKE ?
      OR c.nombre LIKE ?
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (id_categoria) {
    sql += ' AND p.id_categoria = ?';
    params.push(id_categoria);
  }

  if (genero) {
    sql += ' AND p.genero = ?';
    params.push(genero);
  }

  if (estado) {
    sql += ' AND p.estado = ?';
    params.push(estado);
  }

  sql += ' ORDER BY p.nombre ASC, p.color ASC, p.talla ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getProducto(id) {
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE p.deleted_at IS NULL AND p.id_producto = ? LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Producto no encontrado');
  }

  return rows[0];
}

export async function createProducto(data, userId = null) {
  const {
    id_categoria,
    sku,
    nombre,
    genero = 'unisex',
    color,
    talla,
    descripcion = null,
    costo_compra = 0,
    precio_unitario,
    estado = 'activo',
  } = data;

  await ensureCategoriaValida(id_categoria);
  await ensureSkuUnico(sku);

  const [result] = await pool.execute(
    `INSERT INTO producto (
      id_categoria, sku, nombre, genero, color, talla,
      descripcion, costo_compra, precio_unitario, estado, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_categoria,
      sku || null,
      nombre,
      genero,
      color,
      talla,
      descripcion || null,
      costo_compra,
      precio_unitario,
      estado,
      userId || null,
    ],
  );

  return getProducto(result.insertId);
}

export async function updateProducto(id, data, userId = null) {
  await getProducto(id);

  const {
    id_categoria,
    sku,
    nombre,
    genero,
    color,
    talla,
    descripcion,
    costo_compra,
    precio_unitario,
    estado,
  } = data;

  if (id_categoria) {
    await ensureCategoriaValida(id_categoria);
  }

  await ensureSkuUnico(sku, id);

  await pool.execute(
    `UPDATE producto
     SET id_categoria = ?,
         sku = ?,
         nombre = ?,
         genero = ?,
         color = ?,
         talla = ?,
         descripcion = ?,
         costo_compra = ?,
         precio_unitario = ?,
         estado = COALESCE(?, estado),
         updated_by = ?
     WHERE id_producto = ? AND deleted_at IS NULL`,
    [
      id_categoria,
      sku || null,
      nombre,
      genero,
      color,
      talla,
      descripcion || null,
      costo_compra,
      precio_unitario,
      estado,
      userId || null,
      id,
    ],
  );

  return getProducto(id);
}

export async function archiveProducto(id, userId = null) {
  await getProducto(id);

  await pool.execute(
    'UPDATE producto SET deleted_at = NOW(), deleted_by = ? WHERE id_producto = ?',
    [userId || null, id],
  );

  return { id_producto: id };
}

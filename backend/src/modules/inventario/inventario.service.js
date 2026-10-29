import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_INVENTARIO_SELECT = `
  SELECT
    i.id_inventario,
    i.id_producto,
    i.id_sucursal,
    i.stock_actual,
    i.stock_minimo,
    i.created_at,
    i.updated_at,
    i.deleted_at,
    p.nombre AS producto_nombre,
    p.sku AS producto_sku,
    p.genero AS producto_genero,
    p.color AS producto_color,
    p.talla AS producto_talla,
    p.precio_unitario AS producto_precio,
    p.costo_compra AS producto_costo,
    c.id_categoria,
    c.nombre AS categoria_nombre,
    s.nombre AS sucursal_nombre,
    s.ciudad AS sucursal_ciudad
  FROM inventario i
  INNER JOIN producto p ON i.id_producto = p.id_producto
  LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
  INNER JOIN sucursal s ON i.id_sucursal = s.id_sucursal
`;

function normalizeInventario(row) {
  const stockActual = Number(row.stock_actual);
  const stockMinimo = Number(row.stock_minimo);
  let estadoStock = 'normal';

  if (stockActual === 0) {
    estadoStock = 'agotado';
  } else if (stockActual <= stockMinimo) {
    estadoStock = 'bajo_stock';
  }

  return {
    ...row,
    stock_actual: stockActual,
    stock_minimo: stockMinimo,
    producto_precio: Number(row.producto_precio),
    producto_costo: Number(row.producto_costo),
    estado_stock: estadoStock,
  };
}

export async function listInventario({
  search = '',
  id_sucursal = null,
  id_producto = null,
  id_categoria = null,
  bajo_stock = false,
} = {}) {
  const params = [];
  let sql = `${BASE_INVENTARIO_SELECT}
    WHERE i.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND s.deleted_at IS NULL`;

  if (id_sucursal) {
    sql += ' AND i.id_sucursal = ?';
    params.push(Number(id_sucursal));
  }

  if (id_producto) {
    sql += ' AND i.id_producto = ?';
    params.push(Number(id_producto));
  }

  if (id_categoria) {
    sql += ' AND p.id_categoria = ?';
    params.push(Number(id_categoria));
  }

  if (bajo_stock === true || bajo_stock === 'true') {
    sql += ' AND i.stock_actual <= i.stock_minimo';
  }

  if (search) {
    sql += ` AND (
      p.nombre LIKE ?
      OR p.sku LIKE ?
      OR p.color LIKE ?
      OR p.talla LIKE ?
      OR s.nombre LIKE ?
      OR c.nombre LIKE ?
    )`;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    );
  }

  sql += ' ORDER BY s.nombre ASC, p.nombre ASC, p.color ASC, p.talla ASC';

  const [rows] = await pool.execute(sql, params);
  return rows.map(normalizeInventario);
}

export async function getInventario(id) {
  const [rows] = await pool.execute(
    `${BASE_INVENTARIO_SELECT}
     WHERE i.deleted_at IS NULL AND i.id_inventario = ?
     LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Registro de inventario no encontrado');
  }

  const [movimientos] = await pool.execute(
    `SELECT
       m.id_movimiento_inventario,
       m.id_inventario,
       m.cantidad,
       m.tipo,
       m.motivo,
       m.fecha,
       m.id_pedido,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS empleado_nombre
     FROM movimiento_inventario m
     LEFT JOIN empleado e ON m.created_by = e.id_empleado
     WHERE m.id_inventario = ?
     ORDER BY m.fecha DESC, m.id_movimiento_inventario DESC
     LIMIT 10`,
    [id],
  );

  const inventario = normalizeInventario(rows[0]);
  return {
    ...inventario,
    movimientos_recientes: movimientos,
  };
}

export async function createInventario(
  { id_producto, id_sucursal, stock_minimo = 5, stock_inicial = 0 },
  userId = null,
) {
  // 1. Validar producto
  const [productos] = await pool.execute(
    'SELECT id_producto, nombre FROM producto WHERE id_producto = ? AND deleted_at IS NULL LIMIT 1',
    [id_producto],
  );
  if (productos.length === 0) {
    throw ApiError.badRequest('El producto seleccionado no existe o no está activo');
  }

  // 2. Validar sucursal
  const [sucursales] = await pool.execute(
    'SELECT id_sucursal, nombre FROM sucursal WHERE id_sucursal = ? AND deleted_at IS NULL LIMIT 1',
    [id_sucursal],
  );
  if (sucursales.length === 0) {
    throw ApiError.badRequest('La sucursal seleccionada no existe o no está activa');
  }

  // 3. Validar no duplicidad
  const [existentes] = await pool.execute(
    `SELECT id_inventario
     FROM inventario
     WHERE id_producto = ? AND id_sucursal = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id_producto, id_sucursal],
  );
  if (existentes.length > 0) {
    throw ApiError.conflict(
      'Este producto ya cuenta con un registro de inventario en la sucursal seleccionada',
    );
  }

  // 4. Crear con transacción si viene con stock inicial
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO inventario (id_producto, id_sucursal, stock_actual, stock_minimo, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id_producto, id_sucursal, stock_inicial, stock_minimo, userId || null],
    );

    const idInventario = result.insertId;

    if (stock_inicial > 0) {
      await connection.execute(
        `INSERT INTO movimiento_inventario (id_inventario, cantidad, tipo, motivo, created_by)
         VALUES (?, ?, 'entrada', 'Inventario inicial al dar de alta producto en sucursal', ?)`,
        [idInventario, stock_inicial, userId || null],
      );
    }

    await connection.commit();
    return getInventario(idInventario);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateStockMinimo(id, { stock_minimo }, userId = null) {
  await getInventario(id);

  await pool.execute(
    `UPDATE inventario
     SET stock_minimo = ?, updated_by = ?
     WHERE id_inventario = ? AND deleted_at IS NULL`,
    [stock_minimo, userId || null, id],
  );

  return getInventario(id);
}

export async function registerMovimiento(
  { id_inventario, tipo, cantidad, motivo, id_pedido = null, id_detalle_pedido = null },
  userId = null,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Bloqueo de fila para evitar condiciones de carrera (Race conditions)
    const [rows] = await connection.execute(
      `SELECT id_inventario, stock_actual, stock_minimo
       FROM inventario
       WHERE id_inventario = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [id_inventario],
    );

    if (rows.length === 0) {
      throw ApiError.notFound('Registro de inventario no encontrado');
    }

    const currentStock = Number(rows[0].stock_actual);
    let nuevoStock = 0;

    if (tipo === 'entrada') {
      nuevoStock = currentStock + cantidad;
    } else if (tipo === 'salida') {
      if (currentStock < cantidad) {
        throw ApiError.badRequest(
          `Stock insuficiente para realizar la salida. Existencias actuales: ${currentStock}, cantidad solicitada: ${cantidad}`,
        );
      }
      nuevoStock = currentStock - cantidad;
    }

    // Actualizar stock
    await connection.execute(
      `UPDATE inventario
       SET stock_actual = ?, updated_by = ?
       WHERE id_inventario = ?`,
      [nuevoStock, userId || null, id_inventario],
    );

    // Registrar movimiento
    const [movResult] = await connection.execute(
      `INSERT INTO movimiento_inventario (
        id_inventario, id_pedido, id_detalle_pedido, cantidad, tipo, motivo, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_inventario,
        id_pedido || null,
        id_detalle_pedido || null,
        cantidad,
        tipo,
        motivo,
        userId || null,
      ],
    );

    await connection.commit();

    return {
      id_movimiento_inventario: movResult.insertId,
      id_inventario,
      tipo,
      cantidad,
      motivo,
      stock_anterior: currentStock,
      stock_actual: nuevoStock,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listMovimientos({
  id_inventario = null,
  id_sucursal = null,
  id_producto = null,
  tipo = null,
  search = '',
  limit = 50,
  offset = 0,
} = {}) {
  const params = [];
  let sql = `
    SELECT
      m.id_movimiento_inventario,
      m.id_inventario,
      m.id_pedido,
      m.id_detalle_pedido,
      m.cantidad,
      m.tipo,
      m.motivo,
      m.fecha,
      p.id_producto,
      p.nombre AS producto_nombre,
      p.sku AS producto_sku,
      p.color AS producto_color,
      p.talla AS producto_talla,
      c.nombre AS categoria_nombre,
      s.id_sucursal,
      s.nombre AS sucursal_nombre,
      CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS empleado_nombre
    FROM movimiento_inventario m
    INNER JOIN inventario i ON m.id_inventario = i.id_inventario
    INNER JOIN producto p ON i.id_producto = p.id_producto
    LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
    INNER JOIN sucursal s ON i.id_sucursal = s.id_sucursal
    LEFT JOIN empleado e ON m.created_by = e.id_empleado
    WHERE 1=1
  `;

  if (id_inventario) {
    sql += ' AND m.id_inventario = ?';
    params.push(Number(id_inventario));
  }

  if (id_sucursal) {
    sql += ' AND i.id_sucursal = ?';
    params.push(Number(id_sucursal));
  }

  if (id_producto) {
    sql += ' AND i.id_producto = ?';
    params.push(Number(id_producto));
  }

  if (tipo) {
    sql += ' AND m.tipo = ?';
    params.push(tipo);
  }

  if (search) {
    sql += ` AND (
      p.nombre LIKE ?
      OR p.sku LIKE ?
      OR m.motivo LIKE ?
      OR s.nombre LIKE ?
      OR e.nombre LIKE ?
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY m.fecha DESC, m.id_movimiento_inventario DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getInventarioStats({ id_sucursal = null } = {}) {
  const params = [];
  let sucursalWhere = '';

  if (id_sucursal) {
    sucursalWhere = ' AND i.id_sucursal = ?';
    params.push(Number(id_sucursal));
  }

  const [[counts]] = await pool.execute(
    `SELECT
       COUNT(DISTINCT i.id_producto) AS total_productos_asignados,
       COUNT(i.id_inventario) AS total_registros_inventario,
       COALESCE(SUM(i.stock_actual), 0) AS total_piezas_stock,
       COUNT(CASE WHEN i.stock_actual <= i.stock_minimo AND i.stock_actual > 0 THEN 1 END) AS total_bajo_stock,
       COUNT(CASE WHEN i.stock_actual = 0 THEN 1 END) AS total_agotados
     FROM inventario i
     INNER JOIN producto p ON i.id_producto = p.id_producto
     WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL ${sucursalWhere}`,
    params,
  );

  return {
    total_productos_asignados: Number(counts.total_productos_asignados),
    total_registros_inventario: Number(counts.total_registros_inventario),
    total_piezas_stock: Number(counts.total_piezas_stock),
    total_bajo_stock: Number(counts.total_bajo_stock),
    total_agotados: Number(counts.total_agotados),
  };
}

export async function archiveInventario(id, userId = null) {
  const inventario = await getInventario(id);

  if (inventario.stock_actual > 0) {
    throw ApiError.conflict(
      `No se puede dar de baja un inventario con existencias (${inventario.stock_actual} piezas disponibles). Registre una salida primero.`,
    );
  }

  await pool.execute(
    'UPDATE inventario SET deleted_at = NOW(), deleted_by = ? WHERE id_inventario = ?',
    [userId || null, id],
  );

  return { id_inventario: id };
}


import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_SELECT = `
  SELECT id_sucursal, nombre, direccion, ciudad, estado_republica, codigo_postal, telefono, horario,
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

export async function createSucursal(payload, userId = null) {
  const {
    nombre,
    direccion,
    ciudad = 'Oaxaca de Juárez',
    estado_republica = 'Oaxaca',
    codigo_postal,
    telefono,
    horario,
    empleados_ids = [],
  } = payload;

  const [existing] = await pool.execute(
    'SELECT id_sucursal FROM sucursal WHERE deleted_at IS NULL AND LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre],
  );

  if (existing.length > 0) {
    throw ApiError.conflict('Ya existe una sucursal con ese nombre');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO sucursal (nombre, direccion, ciudad, estado_republica, codigo_postal, telefono, horario, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        direccion,
        ciudad || 'Oaxaca de Juárez',
        estado_republica || 'Oaxaca',
        codigo_postal,
        telefono,
        horario,
        userId || null,
      ],
    );

    const idSucursal = result.insertId;

    if (Array.isArray(empleados_ids) && empleados_ids.length > 0) {
      // Asignar los empleados seleccionados a esta nueva sucursal
      for (const idEmpleado of empleados_ids) {
        await connection.execute(
          `UPDATE empleado SET id_sucursal = ?, updated_at = NOW(), updated_by = ? WHERE id_empleado = ? AND deleted_at IS NULL`,
          [idSucursal, userId || null, idEmpleado],
        );
      }
    }

    // Inicializar automáticamente el inventario de esta nueva sucursal con todos los productos activos
    await connection.execute(
      `INSERT INTO inventario (id_producto, id_sucursal, stock_actual, stock_minimo, created_by)
       SELECT p.id_producto, ?, 0, 5, ?
       FROM producto p
       WHERE p.deleted_at IS NULL AND p.estado = 'activo'`,
      [idSucursal, userId || null],
    );

    await connection.commit();
    return getSucursal(idSucursal);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function updateSucursal(id, payload, userId = null) {
  const {
    nombre,
    direccion,
    ciudad = 'Oaxaca de Juárez',
    estado_republica = 'Oaxaca',
    codigo_postal,
    telefono,
    horario,
  } = payload;

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
     SET nombre = ?, direccion = ?, ciudad = ?, estado_republica = ?, codigo_postal = ?, telefono = ?, horario = ?, updated_by = ?
     WHERE id_sucursal = ?`,
    [
      nombre,
      direccion,
      ciudad || 'Oaxaca de Juárez',
      estado_republica || 'Oaxaca',
      codigo_postal,
      telefono,
      horario,
      userId || null,
      id,
    ],
  );

  return getSucursal(id);
}

export async function archiveSucursal(id, userId = null) {
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

  await pool.execute('UPDATE sucursal SET deleted_at = NOW(), deleted_by = ? WHERE id_sucursal = ?', [userId || null, id]);
  return { id_sucursal: id };
}

export async function restoreSucursal(id, userId = null) {
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

  await pool.execute('UPDATE sucursal SET deleted_at = NULL, deleted_by = NULL, updated_by = ? WHERE id_sucursal = ?', [userId || null, id]);
  return getSucursal(id);
}

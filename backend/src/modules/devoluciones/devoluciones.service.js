import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const DEVOLUCION_FIELDS = `
    d.id_devolucion,
    d.id_pedido,
    CONCAT('P-', LPAD(p.id_pedido, 4, '0')) AS folio,
    CONCAT_WS(' ', c.nombre, c.apellido_paterno, c.apellido_materno) AS cliente_nombre,
    s.nombre AS sucursal_nombre,
    d.monto,
    d.metodo,
    d.motivo,
    d.fecha_hora,
    d.id_corte_caja,
    d.id_empleado_autoriza,
    CONCAT_WS(' ', ea.nombre, ea.apellido_paterno, ea.apellido_materno)
      AS empleado_autoriza_nombre
`;

const DEVOLUCION_FROM = `
  FROM devolucion d
  INNER JOIN pedido p ON p.id_pedido = d.id_pedido
  INNER JOIN cliente c ON c.id_cliente = p.id_cliente
  INNER JOIN sucursal s ON s.id_sucursal = p.id_sucursal
  INNER JOIN empleado ea ON ea.id_empleado = d.id_empleado_autoriza
`;

const DEVOLUCION_SELECT = `SELECT ${DEVOLUCION_FIELDS} ${DEVOLUCION_FROM}`;

const DEVOLUCION_DETALLE_SELECT = `
  SELECT
    ${DEVOLUCION_FIELDS},
    p.total,
    COALESCE((
      SELECT SUM(pg.monto)
      FROM pago pg
      WHERE pg.id_pedido = d.id_pedido AND pg.deleted_at IS NULL
    ), 0) AS total_pagado,
    COALESCE((
      SELECT SUM(dv.monto)
      FROM devolucion dv
      WHERE dv.id_pedido = d.id_pedido AND dv.deleted_at IS NULL
    ), 0) AS total_devuelto
  ${DEVOLUCION_FROM}
`;

function normalizeDevolucion(row) {
  return {
    ...row,
    monto: Number(row.monto),
    ...(row.total !== undefined
      ? {
          total: Number(row.total),
          total_pagado: Number(row.total_pagado),
          total_devuelto: Number(row.total_devuelto),
        }
      : {}),
  };
}

async function getDevolucion(connection, id) {
  const [rows] = await connection.execute(
    `${DEVOLUCION_DETALLE_SELECT}
     WHERE d.id_devolucion = ? AND d.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Devolución no encontrada');
  }

  return normalizeDevolucion(rows[0]);
}

export async function getDevolucionDetalle(id) {
  const connection = await pool.getConnection();
  try {
    return await getDevolucion(connection, id);
  } finally {
    connection.release();
  }
}

async function getTotalesPedido(connection, idPedido) {
  const [rows] = await connection.execute(
    `SELECT
       p.total,
       COALESCE((
         SELECT SUM(pg.monto)
         FROM pago pg
         WHERE pg.id_pedido = p.id_pedido AND pg.deleted_at IS NULL
       ), 0) AS total_pagado,
       COALESCE((
         SELECT SUM(d.monto)
         FROM devolucion d
         WHERE d.id_pedido = p.id_pedido AND d.deleted_at IS NULL
       ), 0) AS total_devuelto
     FROM pedido p
     WHERE p.id_pedido = ? AND p.deleted_at IS NULL`,
    [idPedido],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Pedido no encontrado');
  }

  return {
    total: Number(rows[0].total),
    total_pagado: Number(rows[0].total_pagado),
    total_devuelto: Number(rows[0].total_devuelto),
  };
}

async function getEmpleadoActivoEnSucursal(connection, idEmpleado, idSucursal, rol) {
  const [rows] = await connection.execute(
    `SELECT id_empleado, id_sucursal, estado
     FROM empleado
     WHERE id_empleado = ? AND deleted_at IS NULL
     LIMIT 1`,
    [idEmpleado],
  );

  if (rows.length === 0 || rows[0].estado !== 'activo') {
    throw ApiError.badRequest(`El empleado que ${rol} debe existir y estar activo`);
  }

  if (Number(rows[0].id_sucursal) !== Number(idSucursal)) {
    throw ApiError.badRequest(
      `El empleado que ${rol} debe pertenecer a la sucursal del pedido`,
    );
  }
}

export async function listDevoluciones({ search, metodo, id_sucursal, desde, hasta }) {
  const params = [];
  let sql = `${DEVOLUCION_SELECT} WHERE d.deleted_at IS NULL`;

  if (search) {
    sql += ` AND (
      CONCAT('P-', LPAD(p.id_pedido, 4, '0')) LIKE ?
      OR CONCAT_WS(' ', c.nombre, c.apellido_paterno, c.apellido_materno) LIKE ?
      OR c.telefono LIKE ?
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (metodo) {
    sql += ' AND d.metodo = ?';
    params.push(metodo);
  }

  if (id_sucursal) {
    sql += ' AND p.id_sucursal = ?';
    params.push(id_sucursal);
  }

  if (desde) {
    sql += ' AND d.fecha_hora >= CONCAT(?, \' 00:00:00\')';
    params.push(desde);
  }

  if (hasta) {
    sql += ' AND d.fecha_hora < DATE_ADD(CONCAT(?, \' 00:00:00\'), INTERVAL 1 DAY)';
    params.push(hasta);
  }

  sql += ' ORDER BY d.fecha_hora DESC, d.id_devolucion DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map(normalizeDevolucion);
}

export async function getResumenDevolucionPedido(idPedido) {
  const [rows] = await pool.execute(
    `SELECT
       p.id_pedido,
       CONCAT('P-', LPAD(p.id_pedido, 4, '0')) AS folio,
       p.estado,
       p.total,
       COALESCE((
         SELECT SUM(pg.monto)
         FROM pago pg
         WHERE pg.id_pedido = p.id_pedido AND pg.deleted_at IS NULL
       ), 0) AS total_pagado,
       COALESCE((
         SELECT SUM(d.monto)
         FROM devolucion d
         WHERE d.id_pedido = p.id_pedido AND d.deleted_at IS NULL
       ), 0) AS total_devuelto
     FROM pedido p
     WHERE p.id_pedido = ? AND p.deleted_at IS NULL`,
    [idPedido],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Pedido no encontrado');
  }

  const totalPagado = Number(rows[0].total_pagado);
  const totalDevuelto = Number(rows[0].total_devuelto);
  return {
    id_pedido: Number(rows[0].id_pedido),
    folio: rows[0].folio,
    estado: rows[0].estado,
    total: Number(rows[0].total),
    total_pagado: totalPagado,
    total_devuelto: totalDevuelto,
    devolvible: totalPagado - totalDevuelto,
  };
}

export async function createDevolucion(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pedidos] = await connection.execute(
      `SELECT id_pedido, id_sucursal
       FROM pedido
       WHERE id_pedido = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [payload.id_pedido],
    );

    if (pedidos.length === 0) {
      throw ApiError.notFound('Pedido no encontrado');
    }

    const pedido = pedidos[0];
    const totales = await getTotalesPedido(connection, payload.id_pedido);
    const totalPagado = totales.total_pagado;
    const totalDevuelto = totales.total_devuelto;
    const devolvible = Math.max(totalPagado - totalDevuelto, 0);

    if (devolvible === 0) {
      throw ApiError.conflict('El pedido no tiene pagos disponibles para devolver');
    }

    if (Number(payload.monto) > devolvible) {
      throw ApiError.badRequest(
        `La devolución no puede exceder lo disponible para devolver del pedido ($${devolvible})`,
      );
    }

    const idEmpleadoProcesa = Number(
      payload.id_empleado_procesa || payload.id_empleado_autoriza,
    );
    await getEmpleadoActivoEnSucursal(
      connection,
      Number(payload.id_empleado_autoriza),
      pedido.id_sucursal,
      'autoriza la devolución',
    );
    await getEmpleadoActivoEnSucursal(
      connection,
      idEmpleadoProcesa,
      pedido.id_sucursal,
      'procesa la devolución',
    );

    let idCorteCaja = null;
    if (payload.metodo === 'efectivo') {
      const [cortes] = await connection.execute(
        `SELECT id_corte_caja
         FROM corte_caja
         WHERE id_empleado = ?
           AND estado = 'abierto'
           AND deleted_at IS NULL
         ORDER BY fecha_apertura DESC, id_corte_caja DESC
         LIMIT 1`,
        [idEmpleadoProcesa],
      );

      if (cortes.length === 0) {
        throw ApiError.conflict(
          'Para devolver efectivo, el empleado que procesa la devolución debe tener una caja abierta.',
        );
      }

      idCorteCaja = cortes[0].id_corte_caja;
    }

    const [result] = await connection.execute(
      `INSERT INTO devolucion (
         id_pedido,
         id_empleado_autoriza,
         id_corte_caja,
         monto,
         metodo,
         motivo,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id_pedido,
        payload.id_empleado_autoriza,
        idCorteCaja,
        payload.monto,
        payload.metodo,
        payload.motivo,
        payload.id_empleado_autoriza,
      ],
    );

    const devolucion = await getDevolucion(connection, result.insertId);
    await connection.commit();
    return devolucion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

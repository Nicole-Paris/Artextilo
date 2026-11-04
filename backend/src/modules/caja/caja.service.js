import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_CORTE_SELECT = `
  SELECT
    cc.id_corte_caja,
    cc.id_empleado,
    cc.id_sucursal,
    cc.fecha_apertura,
    cc.fecha_cierre,
    cc.estado,
    cc.id_empleado_apertura,
    cc.id_empleado_cierre,
    cc.fondo_inicial,
    COALESCE((
      SELECT SUM(p.monto)
      FROM pago p
      WHERE p.id_corte_caja = cc.id_corte_caja
        AND p.deleted_at IS NULL
        AND p.metodo_pago = 'efectivo'
    ), 0) AS total_efectivo,
    COALESCE((
      SELECT SUM(p.monto)
      FROM pago p
      WHERE p.id_corte_caja = cc.id_corte_caja
        AND p.deleted_at IS NULL
        AND p.metodo_pago = 'transferencia'
    ), 0) AS total_transferencia,
    COALESCE((
      SELECT SUM(p.monto)
      FROM pago p
      WHERE p.id_corte_caja = cc.id_corte_caja
        AND p.deleted_at IS NULL
        AND p.metodo_pago = 'credito'
    ), 0) AS total_credito,
    COALESCE((
      SELECT SUM(d.monto)
      FROM devolucion d
      WHERE d.id_corte_caja = cc.id_corte_caja
        AND d.deleted_at IS NULL
    ), 0) AS total_devoluciones,
    (
      cc.fondo_inicial
      + COALESCE((
        SELECT SUM(p.monto)
        FROM pago p
        WHERE p.id_corte_caja = cc.id_corte_caja
          AND p.deleted_at IS NULL
          AND p.metodo_pago = 'efectivo'
      ), 0)
      - COALESCE((
        SELECT SUM(d.monto)
        FROM devolucion d
        WHERE d.id_corte_caja = cc.id_corte_caja
          AND d.deleted_at IS NULL
          AND d.metodo = 'efectivo'
      ), 0)
    ) AS saldo_esperado,
    cc.saldo_real,
    cc.diferencia_saldo,
    cc.descripcion,
    cc.created_at,
    cc.updated_at,
    CONCAT_WS(' ', e.nombre, e.apellido_paterno, e.apellido_materno) AS empleado_nombre,
    s.nombre AS sucursal_nombre,
    CONCAT_WS(' ', ea.nombre, ea.apellido_paterno, ea.apellido_materno) AS apertura_nombre,
    CONCAT_WS(' ', ec.nombre, ec.apellido_paterno, ec.apellido_materno) AS cierre_nombre
  FROM corte_caja cc
  INNER JOIN empleado e ON e.id_empleado = cc.id_empleado
  INNER JOIN sucursal s ON s.id_sucursal = cc.id_sucursal
  LEFT JOIN empleado ea ON ea.id_empleado = cc.id_empleado_apertura
  LEFT JOIN empleado ec ON ec.id_empleado = cc.id_empleado_cierre
`;

const CORTE_NUMERIC_FIELDS = [
  'fondo_inicial',
  'total_efectivo',
  'total_transferencia',
  'total_credito',
  'total_devoluciones',
  'saldo_esperado',
  'saldo_real',
  'diferencia_saldo',
];

function normalizeCorte(row) {
  const normalized = { ...row };

  CORTE_NUMERIC_FIELDS.forEach((field) => {
    if (normalized[field] !== null && normalized[field] !== undefined) {
      normalized[field] = Number(normalized[field]);
    }
  });

  return normalized;
}

async function getEmpleadoActivo(connection, id_empleado) {
  const [rows] = await connection.execute(
    `SELECT id_empleado, id_sucursal, estado, deleted_at
     FROM empleado
     WHERE id_empleado = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id_empleado],
  );

  if (rows.length === 0) {
    throw ApiError.badRequest('El empleado seleccionado no existe o fue dado de baja');
  }

  if (rows[0].estado !== 'activo') {
    throw ApiError.badRequest('El empleado seleccionado está inactivo');
  }

  return rows[0];
}

async function getSucursalActiva(connection, id_sucursal) {
  const [rows] = await connection.execute(
    `SELECT id_sucursal, nombre, estado
     FROM sucursal
     WHERE id_sucursal = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id_sucursal],
  );

  if (rows.length === 0) {
    throw ApiError.badRequest('La sucursal seleccionada no existe o fue dada de baja');
  }

  if (rows[0].estado !== 'activa') {
    throw ApiError.badRequest('La sucursal seleccionada está inactiva');
  }

  return rows[0];
}

export async function findOpenCorte(connection, id_empleado) {
  const executor = connection ?? pool;
  const [rows] = await executor.execute(
    `SELECT id_corte_caja, id_empleado, id_sucursal, estado
     FROM corte_caja
     WHERE id_empleado = ? AND estado = 'abierto' AND deleted_at IS NULL
     ORDER BY fecha_apertura DESC
     LIMIT 1`,
    [id_empleado],
  );

  return rows[0] ?? null;
}

export async function listCortes({
  estado = null,
  id_sucursal = null,
  id_empleado = null,
  search = '',
  limit = 100,
  offset = 0,
} = {}) {
  const params = [];
  let sql = `${BASE_CORTE_SELECT} WHERE cc.deleted_at IS NULL`;

  if (estado) {
    sql += ' AND cc.estado = ?';
    params.push(estado);
  }

  if (id_sucursal) {
    sql += ' AND cc.id_sucursal = ?';
    params.push(Number(id_sucursal));
  }

  if (id_empleado) {
    sql += ' AND cc.id_empleado = ?';
    params.push(Number(id_empleado));
  }

  if (search) {
    sql += ` AND (
      e.nombre LIKE ?
      OR e.apellido_paterno LIKE ?
      OR e.apellido_materno LIKE ?
      OR s.nombre LIKE ?
      OR cc.descripcion LIKE ?
    )`;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    );
  }

  sql += ` ORDER BY FIELD(cc.estado, 'abierto', 'cerrado'), cc.fecha_apertura DESC
           LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(sql, params);
  return rows.map(normalizeCorte);
}

export async function getCorte(id) {
  const [rows] = await pool.execute(
    `${BASE_CORTE_SELECT} WHERE cc.deleted_at IS NULL AND cc.id_corte_caja = ? LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Corte de caja no encontrado');
  }

  const [pagos] = await pool.execute(
    `SELECT
       p.id_pago,
       p.id_pedido,
       p.id_empleado,
       p.monto,
       p.fecha_hora,
       p.metodo_pago,
       p.concepto_pago,
       p.referencia,
       CONCAT('P-', LPAD(p.id_pedido, 4, '0')) AS folio_pedido,
       CONCAT_WS(' ', c.nombre, c.apellido_paterno, c.apellido_materno) AS cliente_nombre,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno, e.apellido_materno) AS empleado_nombre
     FROM pago p
     INNER JOIN pedido pe ON pe.id_pedido = p.id_pedido
     INNER JOIN cliente c ON c.id_cliente = pe.id_cliente
     INNER JOIN empleado e ON e.id_empleado = p.id_empleado
     WHERE p.id_corte_caja = ? AND p.deleted_at IS NULL
     ORDER BY p.fecha_hora DESC, p.id_pago DESC`,
    [id],
  );

  const [devoluciones] = await pool.execute(
    `SELECT
       d.id_devolucion,
       d.id_pedido,
       d.monto,
       d.metodo,
       d.motivo,
       d.fecha_hora,
       CONCAT('P-', LPAD(d.id_pedido, 4, '0')) AS folio_pedido,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno, e.apellido_materno) AS autoriza_nombre
     FROM devolucion d
     INNER JOIN empleado e ON e.id_empleado = d.id_empleado_autoriza
     WHERE d.id_corte_caja = ? AND d.deleted_at IS NULL
     ORDER BY d.fecha_hora DESC, d.id_devolucion DESC`,
    [id],
  );

  return {
    ...normalizeCorte(rows[0]),
    pagos: pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) })),
    devoluciones: devoluciones.map((devolucion) => ({
      ...devolucion,
      monto: Number(devolucion.monto),
    })),
  };
}

export async function getOpenCorteByEmpleado(id_empleado) {
  const [rows] = await pool.execute(
    `${BASE_CORTE_SELECT}
     WHERE cc.deleted_at IS NULL
       AND cc.id_empleado = ?
       AND cc.estado = 'abierto'
     ORDER BY cc.fecha_apertura DESC
     LIMIT 1`,
    [id_empleado],
  );

  return rows.length > 0 ? normalizeCorte(rows[0]) : null;
}

export async function openCorte(payload, userId = null) {
  const {
    id_empleado,
    id_sucursal,
    fondo_inicial = 0,
    id_empleado_apertura = null,
    descripcion = null,
  } = payload;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const empleado = await getEmpleadoActivo(connection, id_empleado);
    await getSucursalActiva(connection, id_sucursal);

    if (Number(empleado.id_sucursal) !== Number(id_sucursal)) {
      throw ApiError.badRequest(
        'El empleado seleccionado no pertenece a la sucursal indicada',
      );
    }

    const empleadoApertura = id_empleado_apertura || id_empleado;
    await getEmpleadoActivo(connection, empleadoApertura);

    const openCorte = await findOpenCorte(connection, id_empleado);
    if (openCorte) {
      throw ApiError.conflict('El empleado ya tiene una caja abierta');
    }

    const [result] = await connection.execute(
      `INSERT INTO corte_caja (
         id_empleado,
         id_sucursal,
         estado,
         id_empleado_apertura,
         fondo_inicial,
         saldo_esperado,
         descripcion,
         created_by
       ) VALUES (?, ?, 'abierto', ?, ?, ?, ?, ?)`,
      [
        id_empleado,
        id_sucursal,
        empleadoApertura,
        fondo_inicial,
        fondo_inicial,
        descripcion || null,
        userId || empleadoApertura,
      ],
    );

    await connection.commit();
    return getCorte(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeCorte(id, payload, userId = null) {
  const { saldo_real, id_empleado_cierre = null, descripcion = null } = payload;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT *
       FROM corte_caja
       WHERE id_corte_caja = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    );

    if (rows.length === 0) {
      throw ApiError.notFound('Corte de caja no encontrado');
    }

    const corte = rows[0];
    if (corte.estado !== 'abierto') {
      throw ApiError.conflict('El corte de caja ya está cerrado');
    }

    const [pagos] = await connection.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) AS total_efectivo,
         COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN monto ELSE 0 END), 0) AS total_transferencia,
         COALESCE(SUM(CASE WHEN metodo_pago = 'credito' THEN monto ELSE 0 END), 0) AS total_credito
       FROM pago
       WHERE id_corte_caja = ? AND deleted_at IS NULL`,
      [id],
    );

    const [devoluciones] = await connection.execute(
      `SELECT
         COALESCE(SUM(monto), 0) AS total_devoluciones,
         COALESCE(SUM(CASE WHEN metodo = 'efectivo' THEN monto ELSE 0 END), 0) AS total_devoluciones_efectivo
       FROM devolucion
       WHERE id_corte_caja = ? AND deleted_at IS NULL`,
      [id],
    );

    const totalEfectivo = Number(pagos[0].total_efectivo);
    const totalTransferencia = Number(pagos[0].total_transferencia);
    const totalCredito = Number(pagos[0].total_credito);
    const totalDevoluciones = Number(devoluciones[0].total_devoluciones);
    const totalDevolucionesEfectivo = Number(
      devoluciones[0].total_devoluciones_efectivo,
    );
    const fondoInicial = Number(corte.fondo_inicial);
    const saldoEsperado = fondoInicial + totalEfectivo - totalDevolucionesEfectivo;
    const diferenciaSaldo = Number(saldo_real) - saldoEsperado;
    const empleadoCierre = id_empleado_cierre || corte.id_empleado;

    await getEmpleadoActivo(connection, empleadoCierre);

    await connection.execute(
      `UPDATE corte_caja
       SET fecha_cierre = NOW(),
           estado = 'cerrado',
           id_empleado_cierre = ?,
           total_efectivo = ?,
           total_transferencia = ?,
           total_credito = ?,
           total_devoluciones = ?,
           saldo_esperado = ?,
           saldo_real = ?,
           diferencia_saldo = ?,
           descripcion = COALESCE(?, descripcion),
           updated_by = ?
       WHERE id_corte_caja = ?`,
      [
        empleadoCierre,
        totalEfectivo,
        totalTransferencia,
        totalCredito,
        totalDevoluciones,
        saldoEsperado,
        saldo_real,
        diferenciaSaldo,
        descripcion || null,
        userId || empleadoCierre,
        id,
      ],
    );

    await connection.commit();
    return getCorte(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listPagosCorte(id) {
  const corte = await getCorte(id);
  return corte.pagos;
}

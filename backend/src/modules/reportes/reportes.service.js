import { pool } from '../../config/db.js';

export async function getReporteData({
  fecha_inicio = null,
  fecha_fin = null,
  id_sucursal = null,
} = {}) {
  const whereClauses = ['p.deleted_at IS NULL'];
  const params = [];

  if (fecha_inicio) {
    whereClauses.push('DATE(p.fecha_pedido) >= ?');
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    whereClauses.push('DATE(p.fecha_pedido) <= ?');
    params.push(fecha_fin);
  }

  if (id_sucursal) {
    whereClauses.push('p.id_sucursal = ?');
    params.push(Number(id_sucursal));
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Resumen general de pedidos
  const [totalesRows] = await pool.execute(
    `SELECT
       COUNT(p.id_pedido) AS total_pedidos,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN 1 ELSE 0 END), 0) AS pedidos_activos,
       COALESCE(SUM(CASE WHEN p.estado = 'entregado' THEN 1 ELSE 0 END), 0) AS pedidos_entregados,
       COALESCE(SUM(CASE WHEN p.estado = 'cancelado' THEN 1 ELSE 0 END), 0) AS pedidos_cancelados,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN p.total ELSE 0 END), 0) AS total_ventas,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN p.total_piezas ELSE 0 END), 0) AS total_piezas,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN p.descuento_monto ELSE 0 END), 0) AS total_descuentos
     FROM pedido p
     ${whereSql}`,
    params,
  );

  const totales = totalesRows[0] || {};
  const totalVentas = Number(totales.total_ventas || 0);
  const pedidosActivos = Number(totales.pedidos_activos || 0);
  const ticketPromedio = pedidosActivos > 0 ? Math.round(totalVentas / pedidosActivos) : 0;

  // 2. Desglose de pagos realizados en el periodo
  const pagoWhere = ['pg.deleted_at IS NULL'];
  const pagoParams = [];

  if (fecha_inicio) {
    pagoWhere.push('DATE(pg.fecha_hora) >= ?');
    pagoParams.push(fecha_inicio);
  }

  if (fecha_fin) {
    pagoWhere.push('DATE(pg.fecha_hora) <= ?');
    pagoParams.push(fecha_fin);
  }

  if (id_sucursal) {
    pagoWhere.push('p.id_sucursal = ?');
    pagoParams.push(Number(id_sucursal));
  }

  const [pagosRows] = await pool.execute(
    `SELECT
       pg.metodo_pago,
       COUNT(pg.id_pago) AS cantidad_transacciones,
       COALESCE(SUM(pg.monto), 0) AS total_monto
     FROM pago pg
     INNER JOIN pedido p ON p.id_pedido = pg.id_pedido
     WHERE ${pagoWhere.join(' AND ')}
     GROUP BY pg.metodo_pago
     ORDER BY total_monto DESC`,
    pagoParams,
  );

  const totalCobrado = pagosRows.reduce((acc, row) => acc + Number(row.total_monto || 0), 0);
  const saldoPorCobrar = Math.max(0, totalVentas - totalCobrado);

  // 3. Desglose de pedidos por estado
  const [estadosRows] = await pool.execute(
    `SELECT
       p.estado,
       COUNT(p.id_pedido) AS cantidad,
       COALESCE(SUM(p.total), 0) AS monto
     FROM pedido p
     ${whereSql}
     GROUP BY p.estado
     ORDER BY cantidad DESC`,
    params,
  );

  // 4. Ventas agrupadas por día dentro del periodo
  const [ventasDiaRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
       COUNT(p.id_pedido) AS cantidad_pedidos,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN p.total ELSE 0 END), 0) AS total_dia
     FROM pedido p
     ${whereSql}
     GROUP BY DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d')
     ORDER BY fecha ASC`,
    params,
  );

  // 5. Top 10 productos más vendidos
  const [topProductosRows] = await pool.execute(
    `SELECT
       prod.id_producto,
       prod.nombre,
       prod.sku,
       prod.color,
       prod.talla,
       cat.nombre AS categoria,
       COALESCE(SUM(dp.cantidad), 0) AS total_unidades,
       COALESCE(SUM(dp.subtotal), 0) AS total_ingresos
     FROM detalle_pedido dp
     INNER JOIN pedido p ON p.id_pedido = dp.id_pedido AND p.deleted_at IS NULL AND p.estado <> 'cancelado'
     INNER JOIN producto prod ON prod.id_producto = dp.id_producto
     LEFT JOIN categoria_producto cat ON cat.id_categoria = prod.id_categoria
     ${whereSql ? whereSql.replace(/p\./g, 'p.') : ''}
     GROUP BY prod.id_producto, prod.nombre, prod.sku, prod.color, prod.talla, cat.nombre
     ORDER BY total_unidades DESC
     LIMIT 10`,
    params,
  );

  // 6. Ventas por sucursal
  const [sucursalesRows] = await pool.execute(
    `SELECT
       s.id_sucursal,
       s.nombre AS sucursal_nombre,
       COUNT(p.id_pedido) AS total_pedidos,
       COALESCE(SUM(CASE WHEN p.estado <> 'cancelado' THEN p.total ELSE 0 END), 0) AS total_ventas
     FROM sucursal s
     LEFT JOIN pedido p ON p.id_sucursal = s.id_sucursal AND p.deleted_at IS NULL
       ${fecha_inicio ? 'AND DATE(p.fecha_pedido) >= ?' : ''}
       ${fecha_fin ? 'AND DATE(p.fecha_pedido) <= ?' : ''}
     WHERE s.deleted_at IS NULL
     GROUP BY s.id_sucursal, s.nombre
     ORDER BY total_ventas DESC`,
    [
      ...(fecha_inicio ? [fecha_inicio] : []),
      ...(fecha_fin ? [fecha_fin] : []),
    ],
  );

  // 7. Lista de transacciones detalladas para el reporte y exportación
  const [pedidosRows] = await pool.execute(
    `SELECT
       p.id_pedido,
       CONCAT('P-', LPAD(p.id_pedido, 4, '0')) AS folio,
       p.fecha_pedido,
       p.total,
       p.total_piezas,
       p.descuento_monto,
       p.estado,
       p.estado_pago,
       CONCAT_WS(' ', c.nombre, c.apellido_paterno) AS cliente_nombre,
       s.nombre AS sucursal_nombre,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS empleado_nombre,
       COALESCE((
         SELECT SUM(pg.monto)
         FROM pago pg
         WHERE pg.id_pedido = p.id_pedido AND pg.deleted_at IS NULL
       ), 0) AS total_pagado
     FROM pedido p
     INNER JOIN cliente c ON c.id_cliente = p.id_cliente
     INNER JOIN sucursal s ON s.id_sucursal = p.id_sucursal
     INNER JOIN empleado e ON e.id_empleado = p.id_empleado
     ${whereSql}
     ORDER BY p.fecha_pedido DESC
     LIMIT 150`,
    params,
  );

  return {
    filtros: {
      fecha_inicio,
      fecha_fin,
      id_sucursal: id_sucursal ? Number(id_sucursal) : null,
    },
    resumen: {
      total_ventas: totalVentas,
      total_pedidos: Number(totales.total_pedidos || 0),
      pedidos_activos: pedidosActivos,
      pedidos_entregados: Number(totales.pedidos_entregados || 0),
      pedidos_cancelados: Number(totales.pedidos_cancelados || 0),
      total_piezas: Number(totales.total_piezas || 0),
      total_descuentos: Number(totales.total_descuentos || 0),
      total_cobrado: totalCobrado,
      saldo_por_cobrar: saldoPorCobrar,
      ticket_promedio: ticketPromedio,
    },
    pagos_por_metodo: pagosRows.map((r) => ({
      metodo_pago: r.metodo_pago,
      cantidad_transacciones: Number(r.cantidad_transacciones || 0),
      total_monto: Number(r.total_monto || 0),
    })),
    pedidos_por_estado: estadosRows.map((r) => ({
      estado: r.estado,
      cantidad: Number(r.cantidad || 0),
      monto: Number(r.monto || 0),
    })),
    ventas_por_dia: ventasDiaRows.map((r) => ({
      fecha: r.fecha,
      cantidad_pedidos: Number(r.cantidad_pedidos || 0),
      total_dia: Number(r.total_dia || 0),
    })),
    top_productos: topProductosRows.map((r) => ({
      id_producto: r.id_producto,
      nombre: r.nombre,
      sku: r.sku,
      color: r.color,
      talla: r.talla,
      categoria: r.categoria || 'Sin categoría',
      total_unidades: Number(r.total_unidades || 0),
      total_ingresos: Number(r.total_ingresos || 0),
    })),
    ventas_por_sucursal: sucursalesRows.map((r) => ({
      id_sucursal: r.id_sucursal,
      sucursal_nombre: r.sucursal_nombre,
      total_pedidos: Number(r.total_pedidos || 0),
      total_ventas: Number(r.total_ventas || 0),
    })),
    pedidos: pedidosRows.map((p) => ({
      id_pedido: p.id_pedido,
      folio: p.folio,
      fecha_pedido: p.fecha_pedido,
      total: Number(p.total || 0),
      total_piezas: Number(p.total_piezas || 0),
      descuento_monto: Number(p.descuento_monto || 0),
      estado: p.estado,
      estado_pago: p.estado_pago,
      cliente_nombre: p.cliente_nombre,
      sucursal_nombre: p.sucursal_nombre,
      empleado_nombre: p.empleado_nombre,
      total_pagado: Number(p.total_pagado || 0),
      saldo_pendiente: Math.max(0, Number(p.total || 0) - Number(p.total_pagado || 0)),
    })),
  };
}

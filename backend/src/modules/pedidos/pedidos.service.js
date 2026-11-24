import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const BASE_PEDIDO_SELECT = `
  SELECT
    p.id_pedido,
    p.id_cliente,
    p.id_empleado,
    p.id_sucursal,
    p.es_venta_directa,
    p.fecha_pedido,
    p.fecha_entrega_prometida,
    p.fecha_entrega_real,
    p.id_empleado_entrega,
    p.origen,
    p.condicion_pago,
    p.forma_entrega,
    p.direccion_entrega,
    p.costo_envio,
    p.total_piezas,
    p.subtotal_productos,
    p.subtotal_servicios,
    p.cargo_ajuste,
    p.subtotal,
    p.descuento_tipo,
    p.descuento_monto,
    p.descuento_motivo,
    p.id_descuento_autoriza,
    p.total,
    p.anticipo_requerido,
    p.estado_pago,
    p.estado,
    p.motivo_cancelacion,
    p.fecha_cancelacion,
    p.id_empleado_cancela,
    p.observaciones,
    p.created_at,
    p.updated_at,
    CONCAT('P-', LPAD(p.id_pedido, 4, '0')) AS folio,
    CONCAT_WS(' ', c.nombre, c.apellido_paterno) AS cliente_nombre,
    c.telefono AS cliente_telefono,
    c.correo AS cliente_correo,
    CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS empleado_nombre,
    CONCAT_WS(' ', ee.nombre, ee.apellido_paterno) AS empleado_entrega_nombre,
    s.nombre AS sucursal_nombre,
    COALESCE((
      SELECT SUM(pg.monto)
      FROM pago pg
      WHERE pg.id_pedido = p.id_pedido AND pg.deleted_at IS NULL
    ), 0) AS total_pagado
  FROM pedido p
  INNER JOIN cliente c ON c.id_cliente = p.id_cliente
  INNER JOIN empleado e ON e.id_empleado = p.id_empleado
  LEFT JOIN empleado ee ON ee.id_empleado = p.id_empleado_entrega
  INNER JOIN sucursal s ON s.id_sucursal = p.id_sucursal
`;

const PEDIDO_NUMERIC_FIELDS = [
  'costo_envio',
  'total_piezas',
  'subtotal_productos',
  'subtotal_servicios',
  'cargo_ajuste',
  'subtotal',
  'descuento_monto',
  'total',
  'anticipo_requerido',
  'total_pagado',
];

function normalizePedido(row) {
  const normalized = { ...row };

  PEDIDO_NUMERIC_FIELDS.forEach((field) => {
    if (normalized[field] !== null && normalized[field] !== undefined) {
      normalized[field] = Number(normalized[field]);
    }
  });

  normalized.total_pagado = Number(normalized.total_pagado || 0);
  normalized.saldo_pendiente =
    normalized.estado === 'cancelado'
      ? 0
      : Math.max(Number(normalized.total || 0) - normalized.total_pagado, 0);

  return normalized;
}

function mergeProductos(productos = []) {
  const merged = new Map();

  productos.forEach((item) => {
    const idProducto = Number(item.id_producto);
    const cantidad = Number(item.cantidad);
    const previous = merged.get(idProducto);

    if (previous) {
      previous.cantidad += cantidad;
    } else {
      merged.set(idProducto, {
        id_producto: idProducto,
        cantidad,
      });
    }
  });

  return [...merged.values()];
}

async function getOrCreatePublicoGeneral(connection) {
  const [rows] = await connection.execute(
    `SELECT id_cliente, nombre, apellido_paterno, apellido_materno, telefono,
            tiene_credito, limite_credito
     FROM cliente
     WHERE nombre = 'Público' AND apellido_paterno = 'en General' AND deleted_at IS NULL
     LIMIT 1`,
  );
  if (rows.length > 0) return rows[0];

  const [insertResult] = await connection.execute(
    `INSERT INTO cliente (
       nombre, apellido_paterno, apellido_materno, telefono, correo, direccion,
       ciudad, estado_republica, codigo_postal, es_frecuente, tiene_credito, limite_credito
     ) VALUES (
       'Público', 'en General', '', '0000000000', NULL, 'Venta mostrador',
       'Oaxaca', 'Oaxaca', '68000', 0, 0, 0
     )`,
  );
  return {
    id_cliente: insertResult.insertId,
    nombre: 'Público',
    apellido_paterno: 'en General',
    apellido_materno: '',
    telefono: '0000000000',
    tiene_credito: 0,
    limite_credito: 0,
  };
}

async function getClienteActivo(connection, id_cliente) {
  const [rows] = await connection.execute(
    `SELECT id_cliente, nombre, apellido_paterno, apellido_materno, telefono,
            tiene_credito, limite_credito
     FROM cliente
     WHERE id_cliente = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id_cliente],
  );

  if (rows.length === 0) {
    throw ApiError.badRequest('El cliente seleccionado no existe o fue dado de baja');
  }

  return rows[0];
}

async function getEmpleadoActivo(connection, id_empleado) {
  const [rows] = await connection.execute(
    `SELECT e.id_empleado, e.id_sucursal, e.estado, r.nombre AS rol
     FROM empleado e
     INNER JOIN rol r ON r.id_rol = e.id_rol
     WHERE e.id_empleado = ? AND e.deleted_at IS NULL
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

async function getGlobalNumber(connection, nombre, fallback) {
  const [rows] = await connection.execute(
    `SELECT valor
     FROM global_values
     WHERE nombre = ? AND deleted_at IS NULL
     LIMIT 1`,
    [nombre],
  );

  if (rows.length === 0) return fallback;

  const value = Number(rows[0].valor);
  return Number.isFinite(value) ? value : fallback;
}

async function findOpenCorteId(connection, id_empleado) {
  const [rows] = await connection.execute(
    `SELECT id_corte_caja
     FROM corte_caja
     WHERE id_empleado = ? AND estado = 'abierto' AND deleted_at IS NULL
     ORDER BY fecha_apertura DESC
     LIMIT 1`,
    [id_empleado],
  );

  if (rows.length > 0) return rows[0].id_corte_caja;
  return null;
}

async function getOpenCorteId(connection, id_empleado) {
  const idCorteCaja = await findOpenCorteId(connection, id_empleado);

  if (!idCorteCaja) {
    throw ApiError.conflict(
      'El empleado no tiene un turno de caja abierto asignado. Debe esperar a que un supervisor o administrador le asigne y abra una caja.',
    );
  }

  return idCorteCaja;
}

async function getTotalPagado(connection, id_pedido) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(monto), 0) AS total_pagado
     FROM pago
     WHERE id_pedido = ? AND deleted_at IS NULL`,
    [id_pedido],
  );

  return Number(rows[0].total_pagado);
}

async function getSaldoCreditoCliente(connection, id_cliente) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(p.total - COALESCE(pg.total_pagado, 0)), 0) AS saldo
     FROM pedido p
     LEFT JOIN (
       SELECT id_pedido, SUM(monto) AS total_pagado
       FROM pago
       WHERE deleted_at IS NULL
       GROUP BY id_pedido
     ) pg ON pg.id_pedido = p.id_pedido
     WHERE p.id_cliente = ?
       AND p.condicion_pago = 'credito'
       AND p.estado <> 'cancelado'
       AND p.deleted_at IS NULL`,
    [id_cliente],
  );

  return Number(rows[0].saldo);
}

async function validarProductoParaPedido(connection, id_producto, cantidad, id_sucursal) {
  const [productoRows] = await connection.execute(
    `SELECT
       p.id_producto,
       p.nombre,
       p.sku,
       p.color,
       p.talla,
       p.precio_unitario,
       p.estado
     FROM producto p
     WHERE p.id_producto = ?
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [id_producto],
  );

  if (productoRows.length === 0) {
    throw ApiError.badRequest('El producto seleccionado no existe o fue eliminado');
  }

  const producto = productoRows[0];
  if (producto.estado !== 'activo') {
    throw ApiError.badRequest(`El producto ${producto.nombre} está inactivo`);
  }

  // Buscar si existe en inventario en la sucursal seleccionada
  const [invRows] = await connection.execute(
    `SELECT
       i.id_inventario,
       i.stock_actual
     FROM inventario i
     WHERE i.id_producto = ?
       AND i.id_sucursal = ?
       AND i.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [id_producto, id_sucursal],
  );

  let idInventario = null;
  let stockActual = 0;
  let cantidadADescontar = 0;

  if (invRows.length > 0) {
    idInventario = invRows[0].id_inventario;
    stockActual = Number(invRows[0].stock_actual);
    // Si la prenda está en inventario con stock disponible, descontamos hasta lo disponible
    if (stockActual > 0) {
      cantidadADescontar = Math.min(stockActual, cantidad);
    }
  }

  const precioUnitario = Number(producto.precio_unitario);
  return {
    id_inventario: idInventario,
    cantidad_a_descontar: cantidadADescontar,
    id_producto: producto.id_producto,
    cantidad,
    precio_unitario: precioUnitario,
    subtotal: precioUnitario * cantidad,
    producto_nombre: producto.nombre,
    producto_sku: producto.sku,
    producto_color: producto.color,
    producto_talla: producto.talla,
    stock_actual: stockActual,
  };
}

export async function listPedidos({
  search = '',
  estado = null,
  estado_pago = null,
  id_sucursal = null,
  id_cliente = null,
  es_venta_directa = null,
  limit = 100,
  offset = 0,
} = {}) {
  const params = [];
  let sql = `${BASE_PEDIDO_SELECT} WHERE p.deleted_at IS NULL`;

  if (es_venta_directa !== null && es_venta_directa !== undefined && es_venta_directa !== '') {
    sql += ' AND p.es_venta_directa = ?';
    params.push(Number(es_venta_directa));
  }

  if (estado) {
    sql += ' AND p.estado = ?';
    params.push(estado);
  }

  if (estado_pago) {
    sql += ' AND p.estado_pago = ?';
    params.push(estado_pago);
  }

  if (id_sucursal) {
    sql += ' AND p.id_sucursal = ?';
    params.push(Number(id_sucursal));
  }

  if (id_cliente) {
    sql += ' AND p.id_cliente = ?';
    params.push(Number(id_cliente));
  }

  if (search) {
    sql += ` AND (
      CONCAT('P-', LPAD(p.id_pedido, 4, '0')) LIKE ?
      OR CAST(p.id_pedido AS CHAR) LIKE ?
      OR c.nombre LIKE ?
      OR c.apellido_paterno LIKE ?
      OR c.apellido_materno LIKE ?
      OR c.telefono LIKE ?
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

  sql += ' ORDER BY p.fecha_pedido DESC, p.id_pedido DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(sql, params);
  return rows.map(normalizePedido);
}

export async function getPedido(id) {
  const [rows] = await pool.execute(
    `${BASE_PEDIDO_SELECT} WHERE p.deleted_at IS NULL AND p.id_pedido = ? LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Pedido no encontrado');
  }

  const [detalles] = await pool.execute(
    `SELECT
       dp.id_detalle_pedido,
       dp.id_producto,
       dp.cantidad,
       dp.precio_unitario,
       dp.subtotal,
       pr.nombre AS producto_nombre,
       pr.sku AS producto_sku,
       pr.color AS producto_color,
       pr.talla AS producto_talla,
       pr.genero AS producto_genero
     FROM detalle_pedido dp
     INNER JOIN producto pr ON pr.id_producto = dp.id_producto
     WHERE dp.id_pedido = ? AND dp.deleted_at IS NULL
     ORDER BY dp.id_detalle_pedido ASC`,
    [id],
  );

  const [servicios] = await pool.execute(
    `SELECT
       id_pedido_servicio,
       tipo,
       descripcion,
       cantidad,
       precio,
       imagen
     FROM pedido_servicio
     WHERE id_pedido = ? AND deleted_at IS NULL
     ORDER BY id_pedido_servicio ASC`,
    [id],
  );

  const [pagos] = await pool.execute(
    `SELECT
       pg.id_pago,
       pg.id_pedido,
       pg.id_empleado,
       pg.id_corte_caja,
       pg.monto,
       pg.fecha_hora,
       pg.metodo_pago,
       pg.concepto_pago,
       pg.referencia,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS empleado_nombre,
       cc.fecha_apertura AS corte_fecha_apertura,
       cc.estado AS corte_estado
     FROM pago pg
     INNER JOIN empleado e ON e.id_empleado = pg.id_empleado
     INNER JOIN corte_caja cc ON cc.id_corte_caja = pg.id_corte_caja
     WHERE pg.id_pedido = ? AND pg.deleted_at IS NULL
     ORDER BY pg.fecha_hora ASC, pg.id_pago ASC`,
    [id],
  );

  const [devoluciones] = await pool.execute(
    `SELECT
       d.id_devolucion,
       d.id_pedido,
       d.id_empleado_autoriza,
       d.id_corte_caja,
       d.monto,
       d.metodo,
       d.motivo,
       d.fecha_hora,
       CONCAT_WS(' ', e.nombre, e.apellido_paterno) AS autoriza_nombre
     FROM devolucion d
     INNER JOIN empleado e ON e.id_empleado = d.id_empleado_autoriza
     WHERE d.id_pedido = ? AND d.deleted_at IS NULL
     ORDER BY d.fecha_hora DESC, d.id_devolucion DESC`,
    [id],
  );

  return {
    ...normalizePedido(rows[0]),
    detalles: detalles.map((detalle) => ({
      ...detalle,
      cantidad: Number(detalle.cantidad),
      precio_unitario: Number(detalle.precio_unitario),
      subtotal: Number(detalle.subtotal),
    })),
    servicios: servicios.map((servicio) => ({
      ...servicio,
      cantidad: Number(servicio.cantidad),
      precio: Number(servicio.precio),
    })),
    pagos: pagos.map((pago) => ({ ...pago, monto: Number(pago.monto) })),
    devoluciones: devoluciones.map((devolucion) => ({
      ...devolucion,
      monto: Number(devolucion.monto),
    })),
  };
}

export async function createPedido(payload, userId = null) {
  const {
    id_cliente,
    id_empleado,
    id_sucursal,
    es_venta_directa = false,
    origen = 'presencial',
    condicion_pago = 'contado',
    forma_entrega = 'en_local',
    direccion_entrega = null,
    costo_envio = 0,
    fecha_entrega_prometida = null,
    descuento_tipo = 'ninguno',
    descuento_monto = 0,
    descuento_motivo = null,
    id_descuento_autoriza = null,
    observaciones = null,
    productos = [],
    servicios = [],
    pago_inicial = null,
  } = payload;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let cliente = null;
    let idClienteFinal = id_cliente;
    if (!idClienteFinal) {
      cliente = await getOrCreatePublicoGeneral(connection);
      idClienteFinal = cliente.id_cliente;
    } else {
      cliente = await getClienteActivo(connection, idClienteFinal);
    }
    const empleado = await getEmpleadoActivo(connection, id_empleado);
    await getSucursalActiva(connection, id_sucursal);

    if (Number(empleado.id_sucursal) !== Number(id_sucursal)) {
      throw ApiError.badRequest(
        'El empleado seleccionado no pertenece a la sucursal del pedido',
      );
    }

    const productosNormalizados = mergeProductos(productos);
    if (productosNormalizados.length === 0 && servicios.length === 0) {
      throw ApiError.badRequest('El pedido debe incluir al menos un producto o servicio');
    }

    if (es_venta_directa && productosNormalizados.length === 0) {
      throw ApiError.badRequest('La venta en punto de venta debe incluir al menos un producto');
    }

    const detalles = [];
    let subtotalProductos = 0;
    let totalPiezas = 0;

    for (const producto of productosNormalizados) {
      const detalle = await validarProductoParaPedido(
        connection,
        producto.id_producto,
        producto.cantidad,
        id_sucursal,
      );

      detalles.push(detalle);
      subtotalProductos += detalle.subtotal;
      totalPiezas += detalle.cantidad;
    }

    const serviciosNormalizados = servicios.map((servicio) => ({
      tipo: servicio.tipo,
      descripcion: servicio.descripcion,
      cantidad: Number(servicio.cantidad || 1),
      precio: Number(servicio.precio || 0),
      imagen: servicio.imagen || null,
    }));

    if (es_venta_directa && serviciosNormalizados.length > 0) {
      throw ApiError.badRequest('El punto de venta no admite servicios diferidos');
    }

    const subtotalServicios = serviciosNormalizados.reduce(
      (total, servicio) => total + servicio.cantidad * servicio.precio,
      0,
    );
    const subtotal = subtotalProductos + subtotalServicios;

    let descuentoFinal = 0;
    if (descuento_tipo === 'mayoreo') {
      const minimoPiezas = await getGlobalNumber(
        connection,
        'mayoreo_minimo_piezas',
        12,
      );
      const porcentaje = await getGlobalNumber(
        connection,
        'descuento_mayoreo_porcentaje',
        10,
      );

      if (totalPiezas >= minimoPiezas) {
        descuentoFinal = Math.round((subtotal * porcentaje) / 100);
      }
    } else if (descuento_tipo === 'manual') {
      const idAutorizaFinal = id_descuento_autoriza || id_empleado;
      if (!idAutorizaFinal) {
        throw ApiError.badRequest(
          'El descuento manual requiere indicar al empleado que lo autoriza',
        );
      }
      if (!descuento_motivo) {
        throw ApiError.badRequest('El descuento manual requiere un motivo');
      }

      await getEmpleadoActivo(connection, idAutorizaFinal);
      descuentoFinal = Number(descuento_monto);
      id_descuento_autoriza = idAutorizaFinal;
    }

    if (descuentoFinal > subtotal) {
      throw ApiError.badRequest('El descuento no puede exceder el subtotal del pedido');
    }

    if (forma_entrega !== 'en_local' && !direccion_entrega) {
      throw ApiError.badRequest(
        'La dirección de entrega es obligatoria para pedidos a domicilio o paquetería',
      );
    }

    const costoEnvioFinal = forma_entrega === 'en_local' ? 0 : Number(costo_envio);
    const total = subtotal - descuentoFinal + costoEnvioFinal;
    if (total < 0) {
      throw ApiError.badRequest('El total del pedido no puede ser negativo');
    }

    const anticipoPorcentaje = await getGlobalNumber(
      connection,
      'anticipo_porcentaje',
      50,
    );
    const anticipoRequerido = es_venta_directa ? total : Math.ceil((total * anticipoPorcentaje) / 100);
    const montoInicial = Number(pago_inicial?.monto || 0);

    if (total > 0 && !(montoInicial > 0)) {
      throw ApiError.badRequest(
        es_venta_directa
          ? 'La venta en punto de venta requiere cobro inmediato.'
          : 'El anticipo es obligatorio para crear el pedido.',
      );
    }

    if (es_venta_directa && montoInicial < total) {
      throw ApiError.badRequest(
        `La venta en punto de venta debe ser liquidada al 100%. Monto requerido: ${total}.`,
      );
    }

    if (condicion_pago === 'credito') {
      if (es_venta_directa) {
        throw ApiError.badRequest('Las ventas directas en mostrador no admiten crédito.');
      }
      if (!cliente.tiene_credito) {
        throw ApiError.badRequest('El cliente no tiene crédito habilitado');
      }

      const saldoActual = await getSaldoCreditoCliente(connection, idClienteFinal);
      const limiteCredito = Number(cliente.limite_credito);
      if (saldoActual + total > limiteCredito) {
        throw ApiError.badRequest(
          `El cliente excede su límite de crédito. Saldo actual: ${saldoActual}, límite: ${limiteCredito}`,
        );
      }
    }

    const [pedidoResult] = await connection.execute(
      `INSERT INTO pedido (
         id_cliente,
         id_empleado,
         id_sucursal,
         es_venta_directa,
         fecha_entrega_prometida,
         fecha_entrega_real,
         id_empleado_entrega,
         origen,
         condicion_pago,
         forma_entrega,
         direccion_entrega,
         costo_envio,
         total_piezas,
         subtotal_productos,
         subtotal_servicios,
         subtotal,
         descuento_tipo,
         descuento_monto,
         descuento_motivo,
         id_descuento_autoriza,
         total,
         anticipo_requerido,
         estado_pago,
         estado,
         observaciones,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
      [
        idClienteFinal,
        id_empleado,
        id_sucursal,
        es_venta_directa ? 1 : 0,
        es_venta_directa ? new Date() : fecha_entrega_prometida,
        es_venta_directa ? new Date() : null,
        es_venta_directa ? id_empleado : null,
        origen,
        condicion_pago,
        forma_entrega,
        direccion_entrega,
        costoEnvioFinal,
        totalPiezas,
        subtotalProductos,
        subtotalServicios,
        subtotal,
        descuento_tipo,
        descuentoFinal,
        descuento_motivo,
        id_descuento_autoriza || null,
        total,
        anticipoRequerido,
        es_venta_directa ? 'entregado' : 'pendiente',
        observaciones,
        userId || id_empleado,
      ],
    );

    const idPedido = pedidoResult.insertId;

    for (const detalle of detalles) {
      const [detalleResult] = await connection.execute(
        `INSERT INTO detalle_pedido (
           id_pedido,
           id_producto,
           cantidad,
           precio_unitario,
           subtotal,
           created_by
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idPedido,
          detalle.id_producto,
          detalle.cantidad,
          detalle.precio_unitario,
          detalle.subtotal,
          userId || id_empleado,
        ],
      );

      // Restar del inventario únicamente si está en inventario y hay piezas a descontar
      if (detalle.id_inventario && detalle.cantidad_a_descontar > 0) {
        await connection.execute(
          `UPDATE inventario
           SET stock_actual = stock_actual - ?, updated_by = ?
           WHERE id_inventario = ?`,
          [detalle.cantidad_a_descontar, userId || id_empleado, detalle.id_inventario],
        );

        await connection.execute(
          `INSERT INTO movimiento_inventario (
             id_inventario,
             id_pedido,
             id_detalle_pedido,
             cantidad,
             tipo,
             motivo,
             created_by
           ) VALUES (?, ?, ?, ?, 'salida', ?, ?)`,
          [
            detalle.id_inventario,
            idPedido,
            detalleResult.insertId,
            detalle.cantidad_a_descontar,
            es_venta_directa ? 'Salida por venta en punto de venta' : 'Salida por venta de pedido',
            userId || id_empleado,
          ],
        );
      }
    }

    for (const servicio of serviciosNormalizados) {
      await connection.execute(
        `INSERT INTO pedido_servicio (
           id_pedido,
           tipo,
           descripcion,
           cantidad,
           precio,
           imagen,
           created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idPedido,
          servicio.tipo,
          servicio.descripcion,
          servicio.cantidad,
          servicio.precio,
          servicio.imagen,
          userId || id_empleado,
        ],
      );
    }

    let totalPagado = 0;

    if (montoInicial > 0) {
      if (pago_inicial.metodo_pago === 'credito' && condicion_pago !== 'credito') {
        throw ApiError.badRequest('Solo los pedidos a crédito pueden pagarse con crédito');
      }

      if (montoInicial < anticipoRequerido && montoInicial < total) {
        throw ApiError.badRequest(
          `El anticipo mínimo es ${anticipoRequerido}.`,
        );
      }

      if (montoInicial > total) {
        throw ApiError.badRequest('El pago inicial no puede exceder el total del pedido');
      }

      const idEmpleadoPago = Number(pago_inicial.id_empleado || id_empleado);
      const empleadoPago = await getEmpleadoActivo(connection, idEmpleadoPago);

      if (Number(empleadoPago.id_sucursal) !== Number(id_sucursal)) {
        throw ApiError.badRequest(
          'El empleado que recibe el pago no pertenece a la sucursal del pedido',
        );
      }

      const idCorteCaja = await getOpenCorteId(connection, idEmpleadoPago);
      const concepto = es_venta_directa
        ? 'liquidacion'
        : montoInicial >= total
          ? 'liquidacion'
          : 'anticipo';

      await connection.execute(
        `INSERT INTO pago (
           id_pedido,
           id_empleado,
           id_corte_caja,
           monto,
           metodo_pago,
           concepto_pago,
           referencia,
           created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idPedido,
          idEmpleadoPago,
          idCorteCaja,
          montoInicial,
          pago_inicial.metodo_pago,
          concepto,
          pago_inicial.referencia || null,
          userId || idEmpleadoPago,
        ],
      );

      totalPagado = montoInicial;
    }

    let estadoPago = 'pendiente';
    if (total === 0 || totalPagado >= total) {
      estadoPago = 'liquidado';
    } else if (totalPagado > 0) {
      estadoPago = 'parcial';
    }

    await connection.execute(
      'UPDATE pedido SET estado_pago = ? WHERE id_pedido = ?',
      [estadoPago, idPedido],
    );

    await connection.commit();
    return getPedido(idPedido);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function addPago(id, payload, userId = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pedidos] = await connection.execute(
      `SELECT id_pedido, id_empleado, id_sucursal, total, estado, estado_pago,
              condicion_pago
       FROM pedido
       WHERE id_pedido = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    );

    if (pedidos.length === 0) {
      throw ApiError.notFound('Pedido no encontrado');
    }

    const pedido = pedidos[0];
    if (pedido.estado === 'cancelado') {
      throw ApiError.conflict('No se pueden registrar pagos de un pedido cancelado');
    }

    if (payload.metodo_pago === 'credito' && pedido.condicion_pago !== 'credito') {
      throw ApiError.badRequest('Solo los pedidos a crédito pueden pagarse con crédito');
    }

    const totalPagado = await getTotalPagado(connection, id);
    const saldoPendiente = Number(pedido.total) - totalPagado;

    if (saldoPendiente <= 0) {
      throw ApiError.conflict('El pedido ya está liquidado');
    }

    const monto = Number(payload.monto);
    if (monto > saldoPendiente) {
      throw ApiError.badRequest(
        `El monto excede el saldo pendiente del pedido (${saldoPendiente})`,
      );
    }

    const concepto =
      payload.concepto_pago || (monto >= saldoPendiente ? 'liquidacion' : 'abono');
    if (concepto === 'liquidacion' && monto !== saldoPendiente) {
      throw ApiError.badRequest(
        'El concepto liquidación solo aplica cuando el monto es igual al saldo pendiente',
      );
    }
    if (concepto === 'abono' && monto >= saldoPendiente) {
      throw ApiError.badRequest(
        'El concepto abono solo aplica cuando el monto es menor al saldo pendiente',
      );
    }
    if (concepto === 'anticipo') {
      if (totalPagado > 0) {
        throw ApiError.badRequest('El concepto anticipo solo aplica al primer pago del pedido');
      }
      if (monto >= saldoPendiente) {
        throw ApiError.badRequest(
          'El anticipo debe ser menor al saldo pendiente del pedido',
        );
      }
    }

    const idEmpleadoPago = Number(payload.id_empleado || userId || pedido.id_empleado);
    const empleadoPago = await getEmpleadoActivo(connection, idEmpleadoPago);

    if (empleadoPago.rol !== 'administrador' && Number(empleadoPago.id_sucursal) !== Number(pedido.id_sucursal)) {
      throw ApiError.badRequest(
        'El empleado que recibe el pago no pertenece a la sucursal del pedido',
      );
    }

    const idCorteCaja = await getOpenCorteId(connection, idEmpleadoPago);
    await connection.execute(
      `INSERT INTO pago (
         id_pedido,
         id_empleado,
         id_corte_caja,
         monto,
         metodo_pago,
         concepto_pago,
         referencia,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        idEmpleadoPago,
        idCorteCaja,
        monto,
        payload.metodo_pago,
        concepto,
        payload.referencia || null,
        userId || idEmpleadoPago,
      ],
    );

    const nuevoTotalPagado = totalPagado + monto;
    const estadoPago =
      nuevoTotalPagado >= Number(pedido.total) ? 'liquidado' : 'parcial';

    await connection.execute(
      'UPDATE pedido SET estado_pago = ?, updated_by = ? WHERE id_pedido = ?',
      [estadoPago, userId || idEmpleadoPago, id],
    );

    await connection.commit();
    return getPedido(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function changeEstado(id, payload, userId = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pedidos] = await connection.execute(
      `SELECT id_pedido, estado, id_empleado, anticipo_requerido, total
       FROM pedido
       WHERE id_pedido = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    );

    if (pedidos.length === 0) {
      throw ApiError.notFound('Pedido no encontrado');
    }

    const pedido = pedidos[0];
    if (pedido.estado === 'cancelado') {
      throw ApiError.conflict('No se puede cambiar el estado de un pedido cancelado');
    }

    const allowedTransitions = {
      pendiente: ['en_proceso', 'terminado', 'entregado'],
      en_proceso: ['terminado', 'entregado'],
      terminado: ['entregado'],
    };

    const validos = allowedTransitions[pedido.estado] || [];
    if (!validos.includes(payload.estado)) {
      throw ApiError.badRequest(
        `No se puede pasar de "${pedido.estado}" a "${payload.estado}". Los estados permitidos son: ${validos.join(', ') || 'ninguno'}.`,
      );
    }

    if (['en_proceso', 'terminado'].includes(payload.estado) && pedido.estado === 'pendiente') {
      const totalPagado = await getTotalPagado(connection, id);
      if (totalPagado < Number(pedido.anticipo_requerido)) {
        const anticipoRequerido = Number(pedido.anticipo_requerido).toLocaleString('es-MX');
        throw ApiError.conflict(
          `El pedido necesita cubrir al menos el anticipo requerido ($${anticipoRequerido}) para pasar a ${payload.estado.replace('_', ' ')}`,
        );
      }
    }

    const idEmpleadoEntregaFinal = payload.id_empleado_entrega || userId || pedido.id_empleado;

    if (payload.estado === 'entregado') {
      const totalPagado = await getTotalPagado(connection, id);
      const saldoPendiente = Number(pedido.total) - totalPagado;
      if (saldoPendiente > 0) {
        throw ApiError.conflict(
          'El pedido tiene saldo pendiente. Registra el pago completo antes de entregarlo',
        );
      }

      if (!idEmpleadoEntregaFinal) {
        throw ApiError.badRequest(
          'Debes indicar el empleado que realiza la entrega del pedido',
        );
      }

      await getEmpleadoActivo(connection, idEmpleadoEntregaFinal);
    }

    await connection.execute(
      `UPDATE pedido
       SET estado = ?,
           fecha_entrega_real = CASE WHEN ? = 'entregado' THEN NOW() ELSE fecha_entrega_real END,
           id_empleado_entrega = CASE WHEN ? = 'entregado' THEN ? ELSE id_empleado_entrega END,
           observaciones = COALESCE(?, observaciones),
           updated_by = ?
       WHERE id_pedido = ?`,
      [
        payload.estado,
        payload.estado,
        payload.estado,
        idEmpleadoEntregaFinal || null,
        payload.observaciones || null,
        userId || pedido.id_empleado,
        id,
      ],
    );

    await connection.commit();
    return getPedido(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelPedido(id, payload, userId = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pedidos] = await connection.execute(
      `SELECT id_pedido, id_empleado, id_sucursal, estado
       FROM pedido
       WHERE id_pedido = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    );

    if (pedidos.length === 0) {
      throw ApiError.notFound('Pedido no encontrado');
    }

    const pedido = pedidos[0];
    if (pedido.estado === 'cancelado') {
      throw ApiError.conflict('El pedido ya está cancelado');
    }

    if (pedido.estado === 'entregado') {
      throw ApiError.conflict('No se puede cancelar un pedido que ya fue entregado');
    }

    const totalPagado = await getTotalPagado(connection, id);
    const montoDevolucion = Number(payload.monto_devolucion || 0);
    const [devolucionesPrevias] = await connection.execute(
      `SELECT COALESCE(SUM(monto), 0) AS total_devuelto
       FROM devolucion
       WHERE id_pedido = ? AND deleted_at IS NULL`,
      [id],
    );
    const devolvible = Math.max(
      totalPagado - Number(devolucionesPrevias[0].total_devuelto),
      0,
    );

    if (montoDevolucion > devolvible) {
      throw ApiError.badRequest(
        `La devolución no puede exceder lo disponible para devolver del pedido ($${devolvible})`,
      );
    }

    const [detalles] = await connection.execute(
      `SELECT id_detalle_pedido, id_producto, cantidad
       FROM detalle_pedido
       WHERE id_pedido = ? AND deleted_at IS NULL`,
      [id],
    );

    for (const detalle of detalles) {
      // Buscar si hubo movimiento de salida para este detalle_pedido
      const [movimientos] = await connection.execute(
        `SELECT id_inventario, cantidad
         FROM movimiento_inventario
         WHERE id_pedido = ? AND id_detalle_pedido = ? AND tipo = 'salida'
         LIMIT 1`,
        [id, detalle.id_detalle_pedido],
      );

      if (movimientos.length > 0) {
        const mov = movimientos[0];
        await connection.execute(
          `UPDATE inventario
           SET stock_actual = stock_actual + ?, updated_by = ?
           WHERE id_inventario = ?`,
          [mov.cantidad, userId || pedido.id_empleado, mov.id_inventario],
        );

        await connection.execute(
          `INSERT INTO movimiento_inventario (
             id_inventario,
             id_pedido,
             id_detalle_pedido,
             cantidad,
             tipo,
             motivo,
             created_by
           ) VALUES (?, ?, ?, ?, 'entrada', ?, ?)`,
          [
            mov.id_inventario,
            id,
            detalle.id_detalle_pedido,
            mov.cantidad,
            `Cancelación de pedido: ${payload.motivo}`.slice(0, 100),
            userId || pedido.id_empleado,
          ],
        );
      }
    }

    const idEmpleadoCancela = Number(
      payload.id_empleado_cancela || pedido.id_empleado,
    );
    await getEmpleadoActivo(connection, idEmpleadoCancela);

    if (montoDevolucion > 0) {
      const idEmpleadoAutoriza = Number(
        payload.id_empleado_autoriza || userId || idEmpleadoCancela,
      );
      const actorAutoriza = await getEmpleadoActivo(connection, idEmpleadoAutoriza);
      const rolAutoriza = String(actorAutoriza.rol || '').trim().toLowerCase();
      if (!['administrador', 'supervisor', 'gerente'].includes(rolAutoriza)) {
        throw ApiError.forbidden(
          'Solo un administrador o supervisor puede autorizar devoluciones de dinero al cancelar pedidos',
        );
      }

      let idCorteCaja = null;
      if (payload.metodo_devolucion === 'efectivo') {
        idCorteCaja =
          (await findOpenCorteId(connection, idEmpleadoCancela, pedido.id_sucursal)) ??
          (await findOpenCorteId(connection, idEmpleadoAutoriza, pedido.id_sucursal));

        if (!idCorteCaja) {
          throw ApiError.conflict(
            'Para devolver efectivo, el empleado que procesa la devolución debe tener una caja abierta.',
          );
        }
      }

      await connection.execute(
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
          id,
          idEmpleadoAutoriza,
          idCorteCaja,
          montoDevolucion,
          payload.metodo_devolucion,
          `Cancelación: ${payload.motivo}`.slice(0, 255),
          userId || idEmpleadoAutoriza,
        ],
      );

    }

    await connection.execute(
      `UPDATE pedido
       SET estado = 'cancelado',
           motivo_cancelacion = ?,
           fecha_cancelacion = NOW(),
           id_empleado_cancela = ?,
           updated_by = ?
       WHERE id_pedido = ?`,
      [
        payload.motivo,
        idEmpleadoCancela,
        userId || idEmpleadoCancela,
        id,
      ],
    );

    await connection.commit();
    return getPedido(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPedidoStats({ es_venta_directa = null } = {}) {
  const params = [];
  let sql = `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
       SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
       SUM(CASE WHEN estado = 'terminado' THEN 1 ELSE 0 END) AS terminados,
       SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) AS entregados,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total ELSE 0 END), 0) AS total_ventas,
       COALESCE(SUM(
         CASE WHEN estado <> 'cancelado'
           THEN GREATEST(total - COALESCE((
             SELECT SUM(pg.monto)
             FROM pago pg
             WHERE pg.id_pedido = p.id_pedido AND pg.deleted_at IS NULL
           ), 0), 0)
           ELSE 0
         END
       ), 0) AS saldo_por_cobrar
     FROM pedido p
     WHERE p.deleted_at IS NULL`;

  if (es_venta_directa !== null && es_venta_directa !== undefined && es_venta_directa !== '') {
    sql += ' AND p.es_venta_directa = ?';
    params.push(Number(es_venta_directa));
  }

  const [rows] = await pool.execute(sql, params);

  const stats = rows[0];
  return {
    total: Number(stats.total),
    pendientes: Number(stats.pendientes),
    en_proceso: Number(stats.en_proceso),
    terminados: Number(stats.terminados),
    entregados: Number(stats.entregados),
    cancelados: Number(stats.cancelados),
    total_ventas: Number(stats.total_ventas),
    saldo_por_cobrar: Number(stats.saldo_por_cobrar),
  };
}

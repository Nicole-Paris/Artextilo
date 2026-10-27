DROP DATABASE IF EXISTS artextilo_db;

CREATE DATABASE artextilo_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE artextilo_db;

SET NAMES utf8mb4;

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_rol_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE sucursal (
    id_sucursal INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    ciudad VARCHAR(60) NOT NULL,
    estado_republica VARCHAR(60) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    horario VARCHAR(100) NOT NULL,
    descripcion VARCHAR(150) NULL,
    estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_sucursal_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE empleado (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(45) NOT NULL,
    apellido_materno VARCHAR(45) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    horario_entrada TIME NOT NULL,
    horario_salida TIME NOT NULL,
    id_rol INT NOT NULL,
    id_sucursal INT NOT NULL,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    UNIQUE KEY uq_empleado_correo (correo),
    KEY idx_empleado_sucursal (id_sucursal),
    KEY idx_empleado_estado (estado),
    CONSTRAINT fk_empleado_rol FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol),
    CONSTRAINT fk_empleado_sucursal FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
) ENGINE=InnoDB;

CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(45) NOT NULL,
    apellido_materno VARCHAR(45) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    correo VARCHAR(100) NULL,
    direccion VARCHAR(150) NULL,
    ciudad VARCHAR(60) NULL,
    estado_republica VARCHAR(60) NULL,
    codigo_postal VARCHAR(10) NULL,
    es_frecuente TINYINT(1) NOT NULL DEFAULT 0,
    tiene_credito TINYINT(1) NOT NULL DEFAULT 0,
    limite_credito INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_cliente_telefono_activo (telefono, deleted_at),
    KEY idx_cliente_nombre (nombre, apellido_paterno),
    KEY idx_cliente_frecuente (es_frecuente),
    CONSTRAINT chk_cliente_limite CHECK (limite_credito >= 0)
) ENGINE=InnoDB;

CREATE TABLE categoria_producto (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_categoria_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    sku VARCHAR(30) NULL,
    nombre VARCHAR(60) NOT NULL,
    genero ENUM('dama', 'caballero', 'nino', 'nina', 'unisex') NOT NULL DEFAULT 'unisex',
    color VARCHAR(60) NOT NULL,
    talla VARCHAR(20) NOT NULL,
    descripcion VARCHAR(150) NULL,
    costo_compra INT NOT NULL DEFAULT 0,
    precio_unitario INT NOT NULL,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_producto_sku (sku),
    KEY idx_producto_variante (nombre, genero, color, talla),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria_producto(id_categoria),
    CONSTRAINT chk_producto_costo CHECK (costo_compra >= 0),
    CONSTRAINT chk_producto_precio CHECK (precio_unitario >= 0)
) ENGINE=InnoDB;

CREATE TABLE inventario (
    id_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_sucursal INT NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_inventario_producto_sucursal (id_producto, id_sucursal),
    CONSTRAINT fk_inventario_producto FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto),
    CONSTRAINT fk_inventario_sucursal FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal),
    CONSTRAINT chk_inventario_stock CHECK (stock_actual >= 0),
    CONSTRAINT chk_inventario_minimo CHECK (stock_minimo >= 0)
) ENGINE=InnoDB;

CREATE TABLE corte_caja (
    id_corte_caja INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL,
    id_sucursal INT NOT NULL,
    fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre DATETIME NULL,
    estado ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto',
    id_empleado_apertura INT NULL,
    id_empleado_cierre INT NULL,
    fondo_inicial INT NOT NULL DEFAULT 0,
    total_efectivo INT NOT NULL DEFAULT 0,
    total_transferencia INT NOT NULL DEFAULT 0,
    total_credito INT NOT NULL DEFAULT 0,
    total_devoluciones INT NOT NULL DEFAULT 0,
    saldo_esperado INT NOT NULL DEFAULT 0,
    saldo_real INT NULL,
    diferencia_saldo INT NULL,
    descripcion VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_corte_empleado_estado (id_empleado, estado),
    KEY idx_corte_sucursal_estado (id_sucursal, estado),
    KEY idx_corte_fecha_apertura (fecha_apertura),
    KEY idx_corte_fecha_cierre (fecha_cierre),
    CONSTRAINT fk_corte_empleado FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_corte_sucursal FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_corte_apertura FOREIGN KEY (id_empleado_apertura)
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_corte_cierre FOREIGN KEY (id_empleado_cierre)
        REFERENCES empleado(id_empleado),
    CONSTRAINT chk_corte_fondo CHECK (fondo_inicial >= 0),
    CONSTRAINT chk_corte_efectivo CHECK (total_efectivo >= 0),
    CONSTRAINT chk_corte_transferencia CHECK (total_transferencia >= 0),
    CONSTRAINT chk_corte_credito CHECK (total_credito >= 0),
    CONSTRAINT chk_corte_devoluciones CHECK (total_devoluciones >= 0),
    CONSTRAINT chk_corte_saldo CHECK (saldo_real IS NULL OR saldo_real >= 0)
) ENGINE=InnoDB;

CREATE TABLE pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_empleado INT NOT NULL,
    id_sucursal INT NOT NULL,
    fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega_prometida DATETIME NULL,
    fecha_entrega_real DATETIME NULL,
    id_empleado_entrega INT NULL,
    origen ENUM('presencial', 'whatsapp', 'instagram', 'facebook') NOT NULL DEFAULT 'presencial',
    condicion_pago ENUM('contado', 'credito') NOT NULL DEFAULT 'contado',
    forma_entrega ENUM('en_local', 'a_domicilio', 'por_paqueteria') NOT NULL DEFAULT 'en_local',
    direccion_entrega VARCHAR(200) NULL,
    costo_envio INT NOT NULL DEFAULT 0,
    total_piezas INT NOT NULL DEFAULT 0,
    subtotal_productos INT NOT NULL DEFAULT 0,
    subtotal_servicios INT NOT NULL DEFAULT 0,
    cargo_ajuste INT NOT NULL DEFAULT 0,
    subtotal INT NOT NULL DEFAULT 0,
    descuento_tipo ENUM('ninguno', 'mayoreo', 'manual') NOT NULL DEFAULT 'ninguno',
    descuento_monto INT NOT NULL DEFAULT 0,
    descuento_motivo VARCHAR(150) NULL,
    id_descuento_autoriza INT NULL,
    total INT NOT NULL DEFAULT 0,
    anticipo_requerido INT NOT NULL DEFAULT 0,
    estado_pago ENUM('pendiente', 'parcial', 'liquidado') NOT NULL DEFAULT 'pendiente',
    estado ENUM('pendiente', 'en_proceso', 'terminado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    motivo_cancelacion VARCHAR(255) NULL,
    fecha_cancelacion DATETIME NULL,
    id_empleado_cancela INT NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_pedido_fecha (fecha_pedido),
    KEY idx_pedido_cancelacion (fecha_cancelacion),
    KEY idx_pedido_estado (estado),
    KEY idx_pedido_estado_pago (estado_pago),
    KEY idx_pedido_cliente (id_cliente),
    KEY idx_pedido_sucursal (id_sucursal),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente),
    CONSTRAINT fk_pedido_empleado FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_pedido_sucursal FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_pedido_descuento FOREIGN KEY (id_descuento_autoriza)
        REFERENCES empleado(id_empleado) ON DELETE SET NULL,
    CONSTRAINT fk_pedido_empleado_entrega FOREIGN KEY (id_empleado_entrega)
        REFERENCES empleado(id_empleado) ON DELETE SET NULL,
    CONSTRAINT fk_pedido_empleado_cancela FOREIGN KEY (id_empleado_cancela)
        REFERENCES empleado(id_empleado) ON DELETE SET NULL,
    CONSTRAINT chk_pedido_costo CHECK (costo_envio >= 0),
    CONSTRAINT chk_pedido_ajuste CHECK (cargo_ajuste >= 0),
    CONSTRAINT chk_pedido_piezas CHECK (total_piezas >= 0),
    CONSTRAINT chk_pedido_subtotales CHECK (
        subtotal >= 0 AND subtotal_productos >= 0 AND subtotal_servicios >= 0
    ),
    CONSTRAINT chk_pedido_descuento CHECK (descuento_monto >= 0),
    CONSTRAINT chk_pedido_total CHECK (total >= 0 AND anticipo_requerido >= 0),
    CONSTRAINT chk_pedido_desc_ninguno CHECK (
        descuento_tipo <> 'ninguno' OR descuento_monto = 0
    ),
    CONSTRAINT chk_pedido_entrega_local CHECK (
        forma_entrega <> 'en_local' OR costo_envio = 0
    )
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido (
    id_detalle_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario INT NOT NULL,
    subtotal INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    UNIQUE KEY uq_detalle_pedido_producto (id_pedido, id_producto),
    KEY idx_detalle_pedido (id_pedido),
    KEY idx_detalle_producto (id_producto),
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto),
    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio CHECK (precio_unitario >= 0 AND subtotal >= 0)
) ENGINE=InnoDB;

CREATE TABLE pedido_servicio (
    id_pedido_servicio INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    tipo ENUM('bordado', 'diseno') NOT NULL DEFAULT 'bordado',
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio INT NOT NULL DEFAULT 0,
    imagen TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_servicio_pedido (id_pedido),
    CONSTRAINT fk_servicio_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    CONSTRAINT chk_servicio_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_servicio_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_empleado INT NOT NULL,
    id_corte_caja INT NOT NULL,
    monto INT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('efectivo', 'transferencia', 'credito') NOT NULL DEFAULT 'efectivo',
    concepto_pago ENUM('anticipo', 'abono', 'liquidacion') NOT NULL,
    referencia VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_pago_pedido (id_pedido),
    KEY idx_pago_fecha_metodo (fecha_hora, metodo_pago),
    KEY idx_pago_corte (id_corte_caja),
    CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_pago_empleado FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_pago_corte FOREIGN KEY (id_corte_caja)
        REFERENCES corte_caja(id_corte_caja),
    CONSTRAINT chk_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB;

CREATE TABLE devolucion (
    id_devolucion INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_empleado_autoriza INT NOT NULL,
    id_corte_caja INT NULL,
    monto INT NOT NULL,
    metodo ENUM('efectivo', 'transferencia') NOT NULL DEFAULT 'efectivo',
    motivo VARCHAR(255) NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    KEY idx_devolucion_pedido (id_pedido),
    KEY idx_devolucion_fecha (fecha_hora),
    CONSTRAINT fk_devolucion_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_devolucion_autoriza FOREIGN KEY (id_empleado_autoriza)
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_devolucion_corte FOREIGN KEY (id_corte_caja)
        REFERENCES corte_caja(id_corte_caja),
    CONSTRAINT chk_devolucion_monto CHECK (monto > 0),
    CONSTRAINT chk_devolucion_corte_efectivo CHECK (
        metodo <> 'efectivo' OR id_corte_caja IS NOT NULL
    )
) ENGINE=InnoDB;

CREATE TABLE movimiento_inventario (
    id_movimiento_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_inventario INT NOT NULL,
    id_pedido INT NULL,
    id_detalle_pedido INT NULL,
    cantidad INT NOT NULL,
    tipo ENUM('entrada', 'salida') NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    KEY idx_mov_inventario (id_inventario),
    KEY idx_mov_pedido (id_pedido),
    KEY idx_mov_fecha (fecha),
    KEY idx_mov_tipo_fecha (tipo, fecha),
    CONSTRAINT fk_mov_inventario FOREIGN KEY (id_inventario)
        REFERENCES inventario(id_inventario),
    CONSTRAINT fk_mov_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido(id_pedido) ON DELETE SET NULL,
    CONSTRAINT fk_mov_detalle FOREIGN KEY (id_detalle_pedido)
        REFERENCES detalle_pedido(id_detalle_pedido) ON DELETE SET NULL,
    CONSTRAINT chk_mov_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

CREATE TABLE codigo_recuperacion (
    id_codigo INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    expira_en DATETIME NOT NULL,
    usado TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_codigo_empleado (id_empleado, expira_en),
    CONSTRAINT fk_codigo_empleado FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE global_values (
    id_global_value INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(45) NOT NULL,
    nombre VARCHAR(45) NOT NULL,
    valor TEXT NOT NULL,
    descripcion VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    UNIQUE KEY uq_global_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO rol (nombre, descripcion) VALUES
    ('administrador', 'Dueña: control total del sistema y caja'),
    ('empleado', 'Cajera: pedidos, catálogo, inventario y cobros');

INSERT INTO sucursal
    (nombre, direccion, ciudad, estado_republica, codigo_postal, telefono, horario, descripcion)
VALUES
    ('Artextilo Oaxaca', 'Calle Principal 123, Col. Centro',
     'Oaxaca de Juárez', 'Oaxaca', '68000', '9510000000',
     'Lun-Sab 10:00-19:00', 'Sucursal principal');

INSERT INTO categoria_producto (nombre, descripcion) VALUES
    ('Guayabera', 'Guayaberas artesanales típicas'),
    ('Vestido', 'Vestidos bordados típicos');

INSERT INTO global_values (tipo, nombre, valor, descripcion) VALUES
    ('empresa', 'nombre_comercial', 'Artextilo', 'Nombre comercial de la tienda'),
    ('empresa', 'razon_social', 'Artextilo Tradición y Moda S.A. de C.V.', 'Razón social fiscal'),
    ('empresa', 'rfc', 'ARTX20000101XYZ', 'RFC del negocio'),
    ('empresa', 'direccion_fiscal', 'Calle Principal 123, Col. Centro', 'Dirección fiscal'),
    ('empresa', 'codigo_postal', '68000', 'Código postal fiscal'),
    ('empresa', 'telefono_contacto', '9510000000', 'Teléfono principal'),
    ('empresa', 'correo_contacto', 'contacto@artextilo.com', 'Correo de atención a clientes'),
    ('empresa', 'logo_url', '/assets/img/logo_artextilo.png', 'Ruta del logo para PDFs'),
    ('ventas', 'mayoreo_minimo_piezas', '12', 'Piezas mínimas para mayoreo'),
    ('ventas', 'descuento_mayoreo_porcentaje', '10', 'Porcentaje de descuento por mayoreo'),
    ('ventas', 'anticipo_porcentaje', '50', 'Porcentaje mínimo de anticipo'),
    ('inventario', 'stock_minimo_default', '5', 'Stock mínimo por defecto'),
    ('seguridad', 'codigo_recuperacion_minutos', '10', 'Minutos de vigencia del token'),
    ('seguridad', 'intentos_login_max', '5', 'Máximo de intentos fallidos permitidos'),
    ('general', 'moneda', 'MXN', 'Moneda oficial');
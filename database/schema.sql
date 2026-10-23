-- Esquema de la base de datos Artextilo v1.1
-- Basado en bd/Artextilov1.1.sql. No elimina ni recrea la base.
USE artextilo_db;

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL
) ENGINE=InnoDB;

CREATE TABLE sucursal (
    id_sucursal INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    direccion VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    horario VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL
) ENGINE=InnoDB;

CREATE TABLE empleado (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(45) NOT NULL,
    apellido_materno VARCHAR(45) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    id_rol INT NOT NULL,
    id_sucursal INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_empleado_rol FOREIGN KEY (id_rol) 
        REFERENCES rol(id_rol),
    CONSTRAINT fk_empleado_sucursal FOREIGN KEY (id_sucursal) 
        REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_empleado_created_by FOREIGN KEY (created_by) 
        REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_empleado_updated_by FOREIGN KEY (updated_by) 
        REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_empleado_deleted_by FOREIGN KEY (deleted_by) 
        REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE rol
    ADD CONSTRAINT fk_rol_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_rol_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_rol_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE sucursal
    ADD CONSTRAINT fk_sucursal_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_sucursal_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_sucursal_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(45) NOT NULL,
    apellido_materno VARCHAR(45) NOT NULL,
    direccion VARCHAR(100) NULL,
    tiene_credito TINYINT(1) NOT NULL DEFAULT 0,
    limite_credito DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    telefono VARCHAR(15) NOT NULL,
    tipo ENUM('frecuente', 'no frecuente') NOT NULL DEFAULT 'no frecuente',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_cliente_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cliente_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cliente_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
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
    CONSTRAINT fk_catprod_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_catprod_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_catprod_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    color VARCHAR(30) NOT NULL,
    descripcion VARCHAR(150) NULL,
    talla VARCHAR(10) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) 
        REFERENCES categoria_producto(id_categoria),
    CONSTRAINT fk_producto_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_producto_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_producto_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE corte_caja (
    id_corte_caja INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_cierre TIME NULL,
    saldo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    saldo_esperado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    saldo_real DECIMAL(10,2) NULL,
    diferencia_saldo DECIMAL(10,2) NULL,
    descripcion VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_corte_empleado FOREIGN KEY (id_empleado) 
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_corte_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_corte_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_corte_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventario (
    id_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_sucursal INT NOT NULL,
    stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_inventario_producto FOREIGN KEY (id_producto) 
        REFERENCES producto(id_producto),
    CONSTRAINT fk_inventario_sucursal FOREIGN KEY (id_sucursal) 
        REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_inventario_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inventario_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inventario_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE movimiento_inventario (
    id_movimiento_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_inventario INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo ENUM('entrada', 'salida') NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    CONSTRAINT fk_movimiento_inventario FOREIGN KEY (id_inventario) 
        REFERENCES inventario(id_inventario),
    CONSTRAINT fk_movimiento_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_empleado INT NOT NULL,
    fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATETIME NULL,
    origen ENUM('local', 'whatsapp', 'instagram', 'facebook') NOT NULL DEFAULT 'local',
    descuento TINYINT(1) NOT NULL DEFAULT 0,
    cantidad_descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM('pendiente', 'en_proceso', 'por_entregar', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    descripcion VARCHAR(150) NULL,
    forma_pago ENUM('contado', 'credito') NOT NULL DEFAULT 'contado',
    motivo_cancelacion VARCHAR(255) NULL,
    monto_devuelto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tiene_servicio TINYINT(1) NOT NULL DEFAULT 0,
    precio_servicio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descripcion_servicio VARCHAR(150) NULL,
    imagen_servicio VARCHAR(255) NULL,
    forma_entrega ENUM('en_local', 'a_domicilio', 'por_paqueteria') NOT NULL DEFAULT 'en_local',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) 
        REFERENCES cliente(id_cliente),
    CONSTRAINT fk_pedido_empleado FOREIGN KEY (id_empleado) 
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_pedido_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido (
    id_detalle_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido) 
        REFERENCES pedido(id_pedido),
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) 
        REFERENCES producto(id_producto),
    CONSTRAINT fk_detalle_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_detalle_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_detalle_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_empleado INT NOT NULL,
    id_corte_caja INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    hora_pago TIME NOT NULL,
    referencia VARCHAR(50) NULL,
    forma_pago ENUM('Efectivo', 'Transferencia', 'Credito') NOT NULL DEFAULT 'Efectivo',
    concepto_pago ENUM('anticipo', 'abono', 'liquidacion', 'devolucion') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido) 
        REFERENCES pedido(id_pedido),
    CONSTRAINT fk_pago_empleado FOREIGN KEY (id_empleado) 
        REFERENCES empleado(id_empleado),
    CONSTRAINT fk_pago_corte_caja FOREIGN KEY (id_corte_caja) 
        REFERENCES corte_caja(id_corte_caja),
    CONSTRAINT fk_pago_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pago_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pago_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE global_values (
    id_global_value INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(45) NOT NULL,
    nombre VARCHAR(45) NOT NULL,
    valor TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    created_by INT NULL,
    updated_by INT NULL,
    deleted_by INT NULL,
    CONSTRAINT fk_global_values_created_by FOREIGN KEY (created_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_global_values_updated_by FOREIGN KEY (updated_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_global_values_deleted_by FOREIGN KEY (deleted_by) REFERENCES empleado(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
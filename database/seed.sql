USE artextilo_db;

-- Roles base del sistema
INSERT INTO rol (nombre, descripcion)
SELECT 'Administrador', 'Acceso total al sistema y configuración general'
WHERE NOT EXISTS (
  SELECT 1 FROM rol WHERE LOWER(nombre) = 'administrador' AND deleted_at IS NULL
);

INSERT INTO rol (nombre, descripcion)
SELECT 'Cajera', 'Atención en mostrador, registro de pedidos y cobro'
WHERE NOT EXISTS (
  SELECT 1 FROM rol WHERE LOWER(nombre) = 'cajera' AND deleted_at IS NULL
);

-- Sucursal de ejemplo para desarrollo
INSERT INTO sucursal (nombre, direccion, codigo_postal, telefono, horario)
SELECT 'Sucursal Centro', 'Av. Juárez 123, Col. Centro', '58000', '4431234567', 'Lunes a sábado de 9:00 a 19:00'
WHERE NOT EXISTS (
  SELECT 1 FROM sucursal WHERE LOWER(nombre) = 'sucursal centro' AND deleted_at IS NULL
);

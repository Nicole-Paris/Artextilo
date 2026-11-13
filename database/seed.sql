USE artextilo_db;

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

INSERT INTO sucursal (nombre, direccion, codigo_postal, telefono, horario)
SELECT 'Sucursal Centro', 'Av. Juárez 123, Col. Centro', '58000', '4431234567', 'Lunes a sábado de 9:00 a 19:00'
WHERE NOT EXISTS (
  SELECT 1 FROM sucursal WHERE LOWER(nombre) = 'sucursal centro' AND deleted_at IS NULL
);

INSERT INTO empleado (nombre, apellido_paterno, apellido_materno, telefono, correo, contrasena, horario_entrada, horario_salida, id_rol, id_sucursal, estado)
SELECT 'Administrador', 'General', 'Artextilo', '9510000000', 'admin@artextilo.com', '$2b$10$cQcgb5IzyYVjQoMfldTakOicc6oYkCmPdZgfQu1l9Cv2I2UI0/bNS', '09:00:00', '18:00:00', 1, 1, 'activo'
WHERE NOT EXISTS (
  SELECT 1 FROM empleado WHERE LOWER(correo) = 'admin@artextilo.com' AND deleted_at IS NULL
);

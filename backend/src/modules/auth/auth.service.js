import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';
import { sendRecoveryCodeEmail } from '../../lib/mailer.js';

export async function loginEmpleado({ correo, contrasena }) {
  const [empleados] = await pool.execute(
    `SELECT e.id_empleado, e.nombre, e.apellido_paterno,
            e.apellido_materno, e.correo, e.contrasena,
            e.estado, e.id_rol, r.nombre AS rol,
            e.id_sucursal, s.nombre AS sucursal
     FROM empleado e
     INNER JOIN rol r ON r.id_rol = e.id_rol
     INNER JOIN sucursal s ON s.id_sucursal = e.id_sucursal
     WHERE LOWER(e.correo) = LOWER(?)
       AND e.deleted_at IS NULL
     LIMIT 1`,
    [correo],
  );

  if (empleados.length === 0) {
    throw ApiError.unauthorized('Correo o contraseña incorrectos');
  }

  const empleado = empleados[0];

  if (empleado.estado !== 'activo') {
    throw ApiError.unauthorized('El empleado se encuentra inactivo');
  }

  const passwordCorrecta = await bcrypt.compare(
    contrasena,
    empleado.contrasena,
  );

  if (!passwordCorrecta) {
    throw ApiError.unauthorized('Correo o contraseña incorrectos');
  }

  const { contrasena: password, ...datosEmpleado } = empleado;

  // Obtener las sucursales asignadas al empleado (o todas las activas si es administrador)
  let sucursalesAsignadas = [];
  const esAdmin = ['administrador', 'admin'].includes(String(empleado.rol || '').trim().toLowerCase());

  if (esAdmin) {
    const [todasSucursales] = await pool.execute(
      `SELECT id_sucursal, nombre FROM sucursal WHERE deleted_at IS NULL AND estado = 'activa' ORDER BY nombre ASC`
    );
    sucursalesAsignadas = todasSucursales;
  } else {
    // Si tiene la tabla sucursal_empleado o sucursales múltiples
    try {
      const [sucursalesEmp] = await pool.execute(
        `SELECT s.id_sucursal, s.nombre 
         FROM sucursal_empleado se
         INNER JOIN sucursal s ON s.id_sucursal = se.id_sucursal
         WHERE se.id_empleado = ? AND s.deleted_at IS NULL AND s.estado = 'activa'
         ORDER BY s.nombre ASC`,
        [empleado.id_empleado]
      );
      if (sucursalesEmp.length > 0) {
        sucursalesAsignadas = sucursalesEmp;
      }
    } catch {
      // Si no existe la tabla relacional, se toma la sucursal directa
    }

    if (sucursalesAsignadas.length === 0 && empleado.id_sucursal) {
      sucursalesAsignadas = [{ id_sucursal: empleado.id_sucursal, nombre: empleado.sucursal }];
    }
  }

  datosEmpleado.sucursales = sucursalesAsignadas;

  return datosEmpleado;
}

async function getMinutosVigenciaCodigo() {
  try {
    const [rows] = await pool.execute(
      `SELECT valor FROM global_values
       WHERE nombre = 'codigo_recuperacion_minutos' AND deleted_at IS NULL
       LIMIT 1`,
    );
    if (rows.length > 0 && Number(rows[0].valor) > 0) {
      return Number(rows[0].valor);
    }
  } catch {
  }
  return 10;
}

export async function solicitarRecuperacion({ correo }) {
  const [empleados] = await pool.execute(
    `SELECT id_empleado, nombre, apellido_paterno, correo, estado
     FROM empleado
     WHERE LOWER(correo) = LOWER(?) AND deleted_at IS NULL
     LIMIT 1`,
    [correo],
  );

  if (empleados.length === 0) {
    throw ApiError.notFound('No existe ninguna cuenta de empleado registrada con este correo electrónico.');
  }

  const empleado = empleados[0];

  if (empleado.estado !== 'activo') {
    throw ApiError.forbidden('Esta cuenta de empleado se encuentra inactiva. Contacta al administrador.');
  }

  const minutosVigencia = await getMinutosVigenciaCodigo();

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const codigoHash = await bcrypt.hash(codigo, 10);

  await pool.execute(
    `UPDATE codigo_recuperacion
     SET usado = 1
     WHERE id_empleado = ? AND usado = 0`,
    [empleado.id_empleado],
  );

  await pool.execute(
    `INSERT INTO codigo_recuperacion (id_empleado, codigo_hash, expira_en, usado)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0)`,
    [empleado.id_empleado, codigoHash, minutosVigencia],
  );

  const nombreCompleto = `${empleado.nombre} ${empleado.apellido_paterno}`.trim();

  const resultadoEnvio = await sendRecoveryCodeEmail({
    to: empleado.correo,
    nombre: nombreCompleto,
    codigo,
    expiraMinutos: minutosVigencia,
  });

  return {
    correo: empleado.correo,
    expiraEnMinutos: minutosVigencia,
    devMode: resultadoEnvio.devMode,
    message: resultadoEnvio.devMode
      ? `Código generado exitosamente. Como aún no se han configurado credenciales SMTP de Gmail en el archivo .env, el código se ha mostrado en la consola del servidor: [ ${codigo} ]`
      : 'Código de recuperación enviado con éxito a tu correo electrónico.',
  };
}

export async function verificarCodigo({ correo, codigo }) {
  const [empleados] = await pool.execute(
    `SELECT id_empleado, estado
     FROM empleado
     WHERE LOWER(correo) = LOWER(?) AND deleted_at IS NULL
     LIMIT 1`,
    [correo],
  );

  if (empleados.length === 0) {
    throw ApiError.notFound('No se encontró ninguna cuenta asociada a este correo.');
  }

  const empleado = empleados[0];

  const [codigos] = await pool.execute(
    `SELECT id_codigo, codigo_hash, expira_en, (expira_en < NOW()) AS expirado
     FROM codigo_recuperacion
     WHERE id_empleado = ? AND usado = 0
     ORDER BY id_codigo DESC
     LIMIT 1`,
    [empleado.id_empleado],
  );

  if (codigos.length === 0) {
    throw ApiError.badRequest('No hay ningún código de recuperación pendiente. Solicita uno nuevo.');
  }

  const regCodigo = codigos[0];

  if (Number(regCodigo.expirado)) {
    throw ApiError.badRequest('El código de verificación ha expirado. Por favor solicita uno nuevo.');
  }

  const esValido = await bcrypt.compare(codigo, regCodigo.codigo_hash);

  if (!esValido) {
    throw ApiError.badRequest('El código de verificación ingresado es incorrecto.');
  }

  return {
    valido: true,
    message: 'Código de verificación válido.',
  };
}

export async function restablecerPassword({ correo, codigo, nueva_contrasena }) {
  const [empleados] = await pool.execute(
    `SELECT id_empleado, estado
     FROM empleado
     WHERE LOWER(correo) = LOWER(?) AND deleted_at IS NULL
     LIMIT 1`,
    [correo],
  );

  if (empleados.length === 0) {
    throw ApiError.notFound('No se encontró la cuenta de empleado.');
  }

  const empleado = empleados[0];

  const [codigos] = await pool.execute(
    `SELECT id_codigo, codigo_hash, expira_en, (expira_en < NOW()) AS expirado
     FROM codigo_recuperacion
     WHERE id_empleado = ? AND usado = 0
     ORDER BY id_codigo DESC
     LIMIT 1`,
    [empleado.id_empleado],
  );

  if (codigos.length === 0) {
    throw ApiError.badRequest('No hay ningún código de recuperación pendiente. Solicita uno nuevo.');
  }

  const regCodigo = codigos[0];

  if (Number(regCodigo.expirado)) {
    throw ApiError.badRequest('El código de verificación ha expirado. Solicita uno nuevo.');
  }

  const esValido = await bcrypt.compare(codigo, regCodigo.codigo_hash);

  if (!esValido) {
    throw ApiError.badRequest('El código de verificación es incorrecto.');
  }

  await pool.execute(
    `UPDATE codigo_recuperacion
     SET usado = 1
     WHERE id_codigo = ?`,
    [regCodigo.id_codigo],
  );

  const passwordHash = await bcrypt.hash(nueva_contrasena, 10);

  await pool.execute(
    `UPDATE empleado
     SET contrasena = ?
     WHERE id_empleado = ?`,
    [passwordHash, empleado.id_empleado],
  );

  return {
    success: true,
    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
  };
}

export async function actualizarPerfil({ id_empleado, correo, contrasena_actual, nueva_contrasena }) {
  const [empleados] = await pool.execute(
    `SELECT e.id_empleado, e.nombre, e.apellido_paterno, e.apellido_materno,
            e.correo, e.contrasena, e.estado, e.id_rol, r.nombre AS rol,
            e.id_sucursal, s.nombre AS sucursal
     FROM empleado e
     INNER JOIN rol r ON r.id_rol = e.id_rol
     INNER JOIN sucursal s ON s.id_sucursal = e.id_sucursal
     WHERE e.id_empleado = ? AND e.deleted_at IS NULL
     LIMIT 1`,
    [id_empleado],
  );

  if (empleados.length === 0) {
    throw ApiError.notFound('Empleado no encontrado');
  }

  const empleado = empleados[0];

  // Verificar si el correo ya existe en otro empleado
  const [existentes] = await pool.execute(
    `SELECT id_empleado FROM empleado WHERE LOWER(correo) = LOWER(?) AND id_empleado <> ? AND deleted_at IS NULL LIMIT 1`,
    [correo, id_empleado],
  );

  if (existentes.length > 0) {
    throw ApiError.conflict('El correo ya está registrado por otro empleado');
  }

  let nuevoPasswordHash = empleado.contrasena;

  if (nueva_contrasena && nueva_contrasena.trim()) {
    if (!contrasena_actual) {
      throw ApiError.badRequest('Debes ingresar tu contraseña actual para cambiarla');
    }

    const passwordValida = await bcrypt.compare(contrasena_actual, empleado.contrasena);
    if (!passwordValida) {
      throw ApiError.badRequest('La contraseña actual es incorrecta');
    }

    if (nueva_contrasena.length < 6) {
      throw ApiError.badRequest('La nueva contraseña debe tener al menos 6 caracteres');
    }

    nuevoPasswordHash = await bcrypt.hash(nueva_contrasena, 10);
  }

  await pool.execute(
    `UPDATE empleado SET correo = ?, contrasena = ?, updated_at = NOW() WHERE id_empleado = ?`,
    [correo, nuevoPasswordHash, id_empleado],
  );

  const { contrasena, ...datosActualizados } = {
    ...empleado,
    correo,
  };

  return datosActualizados;
}

import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';
import { sendRecoveryCodeEmail } from '../../lib/mailer.js';
import { generateToken } from '../../middlewares/authMiddleware.js';

export async function loginEmpleado({ correo, contrasena }) {
  const [empleados] = await pool.execute(
    `SELECT e.id_empleado, e.nombre, e.apellido_paterno,
            e.apellido_materno, e.correo, e.contrasena,
            e.estado, e.id_rol, r.nombre AS rol,
            e.id_sucursal, s.nombre AS sucursal,
            e.intentos_fallidos, e.bloqueado_hasta
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

  // Verificar si la cuenta se encuentra bloqueada temporalmente
  if (empleado.bloqueado_hasta && new Date(empleado.bloqueado_hasta) > new Date()) {
    const minutosRestantes = Math.ceil(
      (new Date(empleado.bloqueado_hasta).getTime() - Date.now()) / 60000,
    );
    throw ApiError.forbidden(
      `Cuenta bloqueada temporalmente por seguridad debido a múltiples intentos fallidos. Intenta nuevamente en ${minutosRestantes} minuto(s).`,
    );
  }

  const passwordCorrecta = await bcrypt.compare(
    contrasena,
    empleado.contrasena,
  );

  if (!passwordCorrecta) {
    const nuevosIntentos = Number(empleado.intentos_fallidos || 0) + 1;
    let bloqueadoHasta = null;
    let mensaje = 'Correo o contraseña incorrectos';

    if (nuevosIntentos >= 5) {
      bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
      mensaje = 'Has alcanzado 5 intentos fallidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente por 15 minutos.';
    } else {
      mensaje = `Correo o contraseña incorrectos. Intentos restantes antes del bloqueo: ${5 - nuevosIntentos}.`;
    }

    await pool.execute(
      `UPDATE empleado SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_empleado = ?`,
      [nuevosIntentos, bloqueadoHasta, empleado.id_empleado],
    );

    throw ApiError.unauthorized(mensaje);
  }

  // Si el login fue exitoso y tenía intentos fallidos o bloqueo, reiniciar
  if (Number(empleado.intentos_fallidos || 0) > 0 || empleado.bloqueado_hasta) {
    await pool.execute(
      `UPDATE empleado SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_empleado = ?`,
      [empleado.id_empleado],
    );
  }

  const {
    contrasena: password,
    intentos_fallidos: _if,
    bloqueado_hasta: _bh,
    ...datosEmpleado
  } = empleado;

  // Generar token JWT firmado
  const token = generateToken({
    id_empleado: empleado.id_empleado,
    correo: empleado.correo,
    nombre: `${empleado.nombre} ${empleado.apellido_paterno}`.trim(),
    id_rol: empleado.id_rol,
    rol: empleado.rol,
    id_sucursal: empleado.id_sucursal,
  });

  // Solo el administrador tiene acceso a entrar o cambiar entre todas las sucursales con las mismas credenciales
  let sucursalesAsignadas = [];
  const esAdmin = ['administrador', 'admin'].includes(
    String(empleado.rol || '').trim().toLowerCase()
  );

  if (esAdmin) {
    const [todasSucursales] = await pool.execute(
      `SELECT id_sucursal, nombre, estado FROM sucursal WHERE deleted_at IS NULL AND (estado = 'activa' OR estado IS NULL) ORDER BY nombre ASC`
    );
    sucursalesAsignadas = todasSucursales;
  } else {
    // Supervisor y empleados quedan asignados exclusivamente a su sucursal fija
    if (empleado.id_sucursal) {
      sucursalesAsignadas = [{ id_sucursal: empleado.id_sucursal, nombre: empleado.sucursal }];
    }
  }

  datosEmpleado.sucursales = sucursalesAsignadas;
  datosEmpleado.token = token;

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

  if (resultadoEnvio.devMode) {
    console.log(`\n========================================`);
    console.log(`[SEGURIDAD DEV] Código para ${empleado.correo}: [ ${codigo} ]`);
    console.log(`========================================\n`);
  }

  return {
    correo: empleado.correo,
    expiraEnMinutos: minutosVigencia,
    message: 'Se ha enviado un código de recuperación a tu correo electrónico.',
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

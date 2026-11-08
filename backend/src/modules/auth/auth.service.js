
import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import { ApiError } from '../../lib/ApiError.js';

const MAX_INTENTOS = 5;
const TIEMPO_BLOQUEO = 15;

export async function loginEmpleado({ correo, contrasena }) {
  const [empleados] = await pool.execute(
    `SELECT e.id_empleado, e.nombre, e.apellido_paterno,
            e.apellido_materno, e.correo, e.contrasena,
            e.estado, e.id_rol, r.nombre AS rol,
            e.id_sucursal, s.nombre AS sucursal,
            e.intentos_fallidos, e.bloqueado_hasta,
            (e.bloqueado_hasta > NOW()) AS esta_bloqueado
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

  if (Number(empleado.esta_bloqueado)) {
    throw ApiError.unauthorized(
      'La cuenta está bloqueada temporalmente. Intenta nuevamente más tarde.',
    );
  }

  if (empleado.estado !== 'activo') {
    throw ApiError.unauthorized('El empleado se encuentra inactivo');
  }

  const passwordCorrecta = await bcrypt.compare(
    contrasena,
    empleado.contrasena,
  );

  if (!passwordCorrecta) {
    const intentos = Number(empleado.intentos_fallidos) + 1;

    if (intentos >= MAX_INTENTOS) {
      await pool.execute(
        `UPDATE empleado
         SET intentos_fallidos = ?,
             bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE)
         WHERE id_empleado = ?`,
        [MAX_INTENTOS, TIEMPO_BLOQUEO, empleado.id_empleado],
      );

      throw ApiError.unauthorized(
        'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada durante 15 minutos.',
      );
    }

    await pool.execute(
      `UPDATE empleado
       SET intentos_fallidos = ?
       WHERE id_empleado = ?`,
      [intentos, empleado.id_empleado],
    );

    throw ApiError.unauthorized(
      `Correo o contraseña incorrectos. Intento ${intentos} de ${MAX_INTENTOS}.`,
    );
  }

  // Reiniciar los intentos después de un inicio de sesión correcto.
  await pool.execute(
    `UPDATE empleado
     SET intentos_fallidos = 0,
         bloqueado_hasta = NULL
     WHERE id_empleado = ?`,
    [empleado.id_empleado],
  );

  // No devolver la contraseña ni los datos internos de seguridad.
  const {
    contrasena: password,
    intentos_fallidos,
    bloqueado_hasta,
    esta_bloqueado,
    ...datosEmpleado
  } = empleado;

  return datosEmpleado;
}
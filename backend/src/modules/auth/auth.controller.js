import {
  loginPayloadSchema,
  restablecerPasswordSchema,
  solicitarRecuperacionSchema,
  verificarCodigoSchema,
  updatePerfilSchema,
} from './auth.schema.js';
import {
  loginEmpleado,
  restablecerPassword,
  solicitarRecuperacion,
  verificarCodigo,
  actualizarPerfil,
} from './auth.service.js';

export async function login(req, res) {
  const payload = loginPayloadSchema.parse(req.body);
  const empleado = await loginEmpleado(payload);

  res.json({
    success: true,
    data: empleado,
    message: 'Inicio de sesión exitoso',
  });
}

export async function pedirRecuperacion(req, res) {
  const payload = solicitarRecuperacionSchema.parse(req.body);
  const resultado = await solicitarRecuperacion(payload);

  res.json({
    success: true,
    data: resultado,
    message: resultado.message,
  });
}

export async function validarCodigo(req, res) {
  const payload = verificarCodigoSchema.parse(req.body);
  const resultado = await verificarCodigo(payload);

  res.json({
    success: true,
    data: resultado,
    message: resultado.message,
  });
}

export async function cambiarPassword(req, res) {
  const payload = restablecerPasswordSchema.parse(req.body);
  const resultado = await restablecerPassword(payload);

  res.json({
    success: true,
    data: resultado,
    message: resultado.message,
  });
}

export async function modificarPerfil(req, res) {
  const payload = updatePerfilSchema.parse(req.body);
  const idEmpleadoAuth = req.user?.id_empleado || payload.id_empleado;
  const resultado = await actualizarPerfil({ ...payload, id_empleado: idEmpleadoAuth });

  res.json({
    success: true,
    data: resultado,
    message: 'Perfil actualizado correctamente',
  });
}

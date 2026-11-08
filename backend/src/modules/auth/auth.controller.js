
import { loginPayloadSchema } from './auth.schema.js';
import { loginEmpleado } from './auth.service.js';

export async function login(req, res) {
  const payload = loginPayloadSchema.parse(req.body);

  const empleado = await loginEmpleado(payload);

  res.json({
    success: true,
    data: empleado,
    message: 'Inicio de sesión exitoso',
  });
}

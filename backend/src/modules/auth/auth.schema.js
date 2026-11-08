
import { z } from 'zod';

export const loginPayloadSchema = z.object({
  correo: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .min(1, 'El correo es obligatorio')
    .email('El correo no es válido')
    .max(100, 'El correo no puede exceder 100 caracteres')
    .transform((value) => value.toLowerCase()),

  contrasena: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

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

export const solicitarRecuperacionSchema = z.object({
  correo: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(100, 'El correo no puede exceder 100 caracteres')
    .transform((value) => value.toLowerCase()),
});

export const verificarCodigoSchema = z.object({
  correo: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .transform((value) => value.toLowerCase()),

  codigo: z
    .string({ error: 'El código de verificación es obligatorio' })
    .trim()
    .regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos numéricos'),
});

export const restablecerPasswordSchema = z
  .object({
    correo: z
      .string({ error: 'El correo electrónico es obligatorio' })
      .trim()
      .min(1, 'El correo electrónico es obligatorio')
      .email('Ingresa un correo electrónico válido')
      .transform((value) => value.toLowerCase()),

    codigo: z
      .string({ error: 'El código de verificación es obligatorio' })
      .trim()
      .regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos numéricos'),

    nueva_contrasena: z
      .string({ error: 'La nueva contraseña es obligatoria' })
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(100, 'La contraseña no puede exceder 100 caracteres'),

    confirmar_contrasena: z
      .string({ error: 'La confirmación de la contraseña es obligatoria' })
      .min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.nueva_contrasena === data.confirmar_contrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar_contrasena'],
  });

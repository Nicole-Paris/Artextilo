import { z } from 'zod';

export const sucursalPayloadSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  direccion: z
    .string({ error: 'La dirección es obligatoria' })
    .trim()
    .min(1, 'La dirección es obligatoria')
    .max(100, 'La dirección no puede exceder 100 caracteres'),
  codigo_postal: z
    .string({ error: 'El código postal es obligatorio' })
    .trim()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
  telefono: z
    .string({ error: 'El teléfono es obligatorio' })
    .trim()
    .regex(/^\d{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos'),
  horario: z
    .string({ error: 'El horario es obligatorio' })
    .trim()
    .min(1, 'El horario es obligatorio')
    .max(100, 'El horario no puede exceder 100 caracteres'),
});

export const sucursalIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');

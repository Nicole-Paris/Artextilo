
import { z } from 'zod';

export const globalValuePayloadSchema = z.object({
  tipo: z
    .string({ error: 'El tipo es obligatorio' })
    .trim()
    .min(1, 'El tipo es obligatorio')
    .max(45, 'El tipo no puede exceder 45 caracteres'),

  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(45, 'El nombre no puede exceder 45 caracteres'),

  valor: z
    .string({ error: 'El valor es obligatorio' })
    .trim()
    .min(1, 'El valor es obligatorio'),

  descripcion: z
    .string()
    .trim()
    .max(150, 'La descripción no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export const globalValueIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');
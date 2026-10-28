import { z } from 'zod';

export const categoriaPayloadSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(150, 'La descripción no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  estado: z
    .enum(['activo', 'inactivo'], { error: 'El estado debe ser activo o inactivo' })
    .default('activo')
    .optional(),
});

export const categoriaIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');

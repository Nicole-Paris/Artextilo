import { z } from 'zod';

export const productoPayloadSchema = z.object({
  id_categoria: z.coerce
    .number({ error: 'La categoría es obligatoria' })
    .int('La categoría debe ser un ID válido')
    .positive('La categoría debe ser un ID válido'),
  sku: z
    .string()
    .trim()
    .max(30, 'El SKU no puede exceder 30 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(60, 'El nombre no puede exceder 60 caracteres'),
  genero: z
    .enum(['dama', 'caballero', 'nino', 'nina', 'unisex'], {
      error: 'El género debe ser dama, caballero, nino, nina o unisex',
    })
    .default('unisex'),
  color: z
    .string({ error: 'El color es obligatorio' })
    .trim()
    .min(1, 'El color es obligatorio')
    .max(60, 'El color no puede exceder 60 caracteres'),
  talla: z
    .string({ error: 'La talla es obligatoria' })
    .trim()
    .min(1, 'La talla es obligatoria')
    .max(20, 'La talla no puede exceder 20 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(150, 'La descripción no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  costo_compra: z.coerce
    .number({ error: 'El costo de compra debe ser un número' })
    .int('El costo de compra debe ser un número entero')
    .min(0, 'El costo de compra no puede ser negativo')
    .default(0),
  precio_unitario: z.coerce
    .number({ error: 'El precio unitario es obligatorio' })
    .int('El precio unitario debe ser un número entero')
    .min(0, 'El precio unitario no puede ser negativo'),
  estado: z
    .enum(['activo', 'inactivo'], { error: 'El estado debe ser activo o inactivo' })
    .default('activo')
    .optional(),
});

export const productoIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');

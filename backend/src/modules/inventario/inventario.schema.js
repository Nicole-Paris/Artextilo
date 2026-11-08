import { z } from 'zod';

export const inventarioIdSchema = z.coerce
  .number({ error: 'El ID de inventario debe ser numérico' })
  .int('El ID de inventario debe ser entero')
  .positive('El ID de inventario debe ser mayor a cero');

export const inventarioCreatePayloadSchema = z.object({
  id_producto: z.coerce
    .number({ error: 'El producto es obligatorio' })
    .int('El producto debe ser un ID válido')
    .positive('El producto debe ser un ID válido'),
  id_sucursal: z.coerce
    .number({ error: 'La sucursal es obligatoria' })
    .int('La sucursal debe ser un ID válido')
    .positive('La sucursal debe ser un ID válido'),
  stock_minimo: z.coerce
    .number({ error: 'El stock mínimo debe ser numérico' })
    .int('El stock mínimo debe ser un número entero')
    .min(0, 'El stock mínimo no puede ser negativo')
    .default(5),
  stock_inicial: z.coerce
    .number({ error: 'El stock inicial debe ser numérico' })
    .int('El stock inicial debe ser un número entero')
    .min(0, 'El stock inicial no puede ser negativo')
    .default(0),
});

export const inventarioStockMinimoPayloadSchema = z.object({
  stock_minimo: z.coerce
    .number({ error: 'El stock mínimo debe ser numérico' })
    .int('El stock mínimo debe ser un número entero')
    .min(0, 'El stock mínimo no puede ser negativo'),
});

export const movimientoPayloadSchema = z.object({
  id_inventario: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  tipo: z.enum(['entrada', 'salida'], {
    error: 'El tipo de movimiento debe ser entrada o salida',
  }),
  cantidad: z.coerce
    .number({ error: 'La cantidad es obligatoria' })
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a cero'),
  motivo: z
    .string({ error: 'El motivo es obligatorio' })
    .trim()
    .min(3, 'El motivo debe tener al menos 3 caracteres')
    .max(100, 'El motivo no puede exceder 100 caracteres'),
  id_pedido: z.coerce.number().int().positive().nullable().optional(),
  id_detalle_pedido: z.coerce.number().int().positive().nullable().optional(),
});


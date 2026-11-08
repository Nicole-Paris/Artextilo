import { z } from 'zod';

export const cajaIdSchema = z.coerce
  .number({ error: 'El ID de corte debe ser numérico' })
  .int('El ID de corte debe ser entero')
  .positive('El ID de corte debe ser mayor a cero');

export const cajaEmpleadoIdSchema = z.coerce
  .number({ error: 'El ID de empleado debe ser numérico' })
  .int('El ID de empleado debe ser entero')
  .positive('El ID de empleado debe ser mayor a cero');

export const cajaOpenPayloadSchema = z.object({
  id_empleado: z.coerce
    .number({ error: 'El empleado es obligatorio' })
    .int('El empleado debe ser un ID válido')
    .positive('El empleado debe ser un ID válido'),
  id_sucursal: z.coerce
    .number({ error: 'La sucursal es obligatoria' })
    .int('La sucursal debe ser un ID válido')
    .positive('La sucursal debe ser un ID válido'),
  fondo_inicial: z.coerce
    .number({ error: 'El fondo inicial debe ser numérico' })
    .int('El fondo inicial debe ser un número entero')
    .min(0, 'El fondo inicial no puede ser negativo')
    .default(0),
  id_empleado_apertura: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  descripcion: z
    .string()
    .trim()
    .max(150, 'La descripción no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export const cajaClosePayloadSchema = z.object({
  saldo_real: z.coerce
    .number({ error: 'El saldo real es obligatorio' })
    .int('El saldo real debe ser un número entero')
    .min(0, 'El saldo real no puede ser negativo'),
  id_empleado_cierre: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  descripcion: z
    .string()
    .trim()
    .max(150, 'La descripción no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

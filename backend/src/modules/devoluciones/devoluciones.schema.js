import { z } from 'zod';

const positiveId = (message) =>
  z.coerce.number({ error: message }).int(message).positive(message);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'La fecha no es válida');

export const devolucionIdSchema = positiveId('El ID debe ser un entero positivo');

export const devolucionPayloadSchema = z.object({
  id_pedido: positiveId('El ID del pedido debe ser un entero positivo'),
  monto: z.coerce
    .number({ error: 'El monto debe ser un número entero mayor a cero' })
    .int('El monto debe ser un número entero mayor a cero')
    .positive('El monto debe ser un número entero mayor a cero'),
  metodo: z.enum(['efectivo', 'transferencia'], {
    error: 'El método debe ser efectivo o transferencia',
  }),
  motivo: z
    .string({ error: 'El motivo es obligatorio' })
    .trim()
    .min(1, 'El motivo es obligatorio')
    .max(255, 'El motivo no puede exceder 255 caracteres'),
  id_empleado_autoriza: positiveId(
    'El empleado que autoriza debe ser un entero positivo',
  ),
  id_empleado_procesa: positiveId(
    'El empleado que procesa debe ser un entero positivo',
  ).optional(),
});

export const devolucionesListQuerySchema = z.object({
  search: z.string().trim().optional(),
  metodo: z.enum(['efectivo', 'transferencia']).optional(),
  id_sucursal: positiveId('La sucursal debe ser un ID entero positivo').optional(),
  desde: dateOnly.optional(),
  hasta: dateOnly.optional(),
});

export const devolucionPedidoIdSchema = positiveId(
  'El ID del pedido debe ser un entero positivo',
);

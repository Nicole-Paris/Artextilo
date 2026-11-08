import { z } from 'zod';

export const pedidoIdSchema = z.coerce
  .number({ error: 'El ID de pedido debe ser numérico' })
  .int('El ID de pedido debe ser entero')
  .positive('El ID de pedido debe ser mayor a cero');

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    return value.replace('T', ' ').slice(0, 19);
  });

const optionalText = (max, message) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const pagoPayloadSchema = z.object({
  monto: z.coerce
    .number({ error: 'El monto es obligatorio' })
    .int('El monto debe ser un número entero')
    .positive('El monto debe ser mayor a cero'),
  metodo_pago: z.enum(['efectivo', 'transferencia', 'credito'], {
    error: 'El método de pago debe ser efectivo, transferencia o crédito',
  }),
  referencia: optionalText(50, 'La referencia no puede exceder 50 caracteres'),
  concepto_pago: z
    .enum(['anticipo', 'abono', 'liquidacion'], {
      error: 'El concepto de pago debe ser anticipo, abono o liquidación',
    })
    .optional(),
  id_empleado: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
}).superRefine((pago, context) => {
  if (pago.metodo_pago === 'transferencia' && !pago.referencia) {
    context.addIssue({
      code: 'custom',
      path: ['referencia'],
      message: 'La referencia es obligatoria para pagos por transferencia',
    });
  }
});

const productoPayloadSchema = z.object({
  id_producto: z.coerce
    .number({ error: 'El producto es obligatorio' })
    .int('El producto debe ser un ID válido')
    .positive('El producto debe ser un ID válido'),
  cantidad: z.coerce
    .number({ error: 'La cantidad es obligatoria' })
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a cero'),
});

const servicioPayloadSchema = z.object({
  tipo: z
    .enum(['bordado', 'diseno'], {
      error: 'El tipo de servicio debe ser bordado o diseño',
    })
    .default('bordado'),
  descripcion: z
    .string({ error: 'La descripción del servicio es obligatoria' })
    .trim()
    .min(1, 'La descripción del servicio es obligatoria')
    .max(200, 'La descripción del servicio no puede exceder 200 caracteres'),
  cantidad: z.coerce
    .number()
    .int()
    .positive('La cantidad del servicio debe ser mayor a cero')
    .default(1),
  precio: z.coerce
    .number()
    .int('El precio del servicio debe ser un número entero')
    .min(0, 'El precio del servicio no puede ser negativo')
    .default(0),
  imagen: optionalText(500000, 'La imagen del servicio es demasiado grande'),
});

export const pedidoCreatePayloadSchema = z.object({
  id_cliente: z.coerce
    .number({ error: 'El cliente es obligatorio' })
    .int('El cliente debe ser un ID válido')
    .positive('El cliente debe ser un ID válido'),
  id_empleado: z.coerce
    .number({ error: 'El empleado es obligatorio' })
    .int('El empleado debe ser un ID válido')
    .positive('El empleado debe ser un ID válido'),
  id_sucursal: z.coerce
    .number({ error: 'La sucursal es obligatoria' })
    .int('La sucursal debe ser un ID válido')
    .positive('La sucursal debe ser un ID válido'),
  origen: z
    .enum(['presencial', 'whatsapp', 'instagram', 'facebook'], {
      error: 'El origen del pedido no es válido',
    })
    .default('presencial'),
  condicion_pago: z
    .enum(['contado', 'credito'], {
      error: 'La condición de pago debe ser contado o crédito',
    })
    .default('contado'),
  forma_entrega: z
    .enum(['en_local', 'a_domicilio', 'por_paqueteria'], {
      error: 'La forma de entrega no es válida',
    })
    .default('en_local'),
  direccion_entrega: optionalText(
    200,
    'La dirección de entrega no puede exceder 200 caracteres',
  ),
  costo_envio: z.coerce
    .number()
    .int('El costo de envío debe ser un número entero')
    .min(0, 'El costo de envío no puede ser negativo')
    .default(0),
  fecha_entrega_prometida: optionalDateTime,
  descuento_tipo: z
    .enum(['ninguno', 'mayoreo', 'manual'], {
      error: 'El tipo de descuento no es válido',
    })
    .default('ninguno'),
  descuento_monto: z.coerce
    .number()
    .int('El descuento debe ser un número entero')
    .min(0, 'El descuento no puede ser negativo')
    .default(0),
  descuento_motivo: optionalText(
    150,
    'El motivo del descuento no puede exceder 150 caracteres',
  ),
  id_descuento_autoriza: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  observaciones: optionalText(1000, 'Las observaciones no pueden exceder 1000 caracteres'),
  productos: z.array(productoPayloadSchema).default([]),
  servicios: z.array(servicioPayloadSchema).default([]),
  pago_inicial: pagoPayloadSchema.optional().nullable(),
});

export const pedidoEstadoPayloadSchema = z.object({
  estado: z.enum(['en_proceso', 'terminado', 'entregado'], {
    error: 'El estado debe ser en_proceso, terminado o entregado',
  }),
  id_empleado_entrega: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  observaciones: optionalText(1000, 'Las observaciones no pueden exceder 1000 caracteres'),
});

export const pedidoCancelPayloadSchema = z.object({
  motivo: z
    .string({ error: 'El motivo de cancelación es obligatorio' })
    .trim()
    .min(3, 'El motivo de cancelación debe tener al menos 3 caracteres')
    .max(255, 'El motivo de cancelación no puede exceder 255 caracteres'),
  id_empleado_cancela: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  monto_devolucion: z.coerce
    .number()
    .int('El monto de devolución debe ser un número entero')
    .min(0, 'El monto de devolución no puede ser negativo')
    .default(0),
  metodo_devolucion: z
    .enum(['efectivo', 'transferencia'], {
      error: 'El método de devolución debe ser efectivo o transferencia',
    })
    .default('efectivo'),
  id_empleado_autoriza: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
});

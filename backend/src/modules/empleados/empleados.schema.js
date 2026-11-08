import { z } from 'zod';

const contrasenaSchema = z
  .string({ error: 'La contraseña es débil' })
  .min(8, 'La contraseña es débil')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, 'La contraseña es débil');

const horarioSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario inválido')
  .optional();

function validateHorarioRange(payload, ctx, { defaults = false } = {}) {
  const horarioEntrada = payload.horario_entrada ?? (defaults ? '09:00' : undefined);
  const horarioSalida = payload.horario_salida ?? (defaults ? '18:00' : undefined);

  if (
    horarioEntrada !== undefined &&
    horarioSalida !== undefined &&
    horarioSalida <= horarioEntrada
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['horario_salida'],
      message: 'La hora de salida debe ser posterior a la de entrada',
    });
  }
}

const empleadoPayloadObjectSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  apellido_paterno: z
    .string({ error: 'El apellido paterno es obligatorio' })
    .trim()
    .min(1, 'El apellido paterno es obligatorio')
    .max(45, 'El apellido paterno no puede exceder 45 caracteres'),
  apellido_materno: z
    .string()
    .trim()
    .max(45, 'El apellido materno no puede exceder 45 caracteres')
    .optional()
    .nullable()
    .transform((value) => value ?? ''),
  correo: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .email('El correo no es válido')
    .max(100, 'El correo no puede exceder 100 caracteres')
    .transform((value) => value.toLowerCase()),
  telefono: z
    .string({ error: 'El teléfono es obligatorio' })
    .trim()
    .regex(/^\d{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos'),
  contrasena: z
    .union([contrasenaSchema, z.literal('')])
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  horario_entrada: horarioSchema,
  horario_salida: horarioSchema,
  id_rol: z
    .coerce.number({ error: 'El ID del rol debe ser numérico' })
    .int('El ID del rol debe ser entero')
    .positive('El ID del rol debe ser mayor a cero'),
  id_sucursal: z
    .coerce.number({ error: 'El ID de la sucursal debe ser numérico' })
    .int('El ID de la sucursal debe ser entero')
    .positive('El ID de la sucursal debe ser mayor a cero'),
});

export const empleadoPayloadSchema = empleadoPayloadObjectSchema.superRefine((payload, ctx) => {
  validateHorarioRange(payload, ctx);
});

export const empleadoCreatePayloadSchema = empleadoPayloadObjectSchema.extend({
  contrasena: contrasenaSchema,
}).superRefine((payload, ctx) => {
  validateHorarioRange(payload, ctx, { defaults: true });
});

export const empleadoEstadoSchema = z.object({
  estado: z.enum(['activo', 'inactivo'], {
    error: "El estado debe ser 'activo' o 'inactivo'",
  }),
});

export const empleadoIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');

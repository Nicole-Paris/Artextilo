import { z } from 'zod';

const creditLimitError = 'El límite de crédito debe ser mayor a 0';

const optionalText = (maxLength, maxMessage) =>
  z
    .union([
      z.string().trim().max(maxLength, maxMessage),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null));

export const clientePayloadSchema = z.object({
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
    .union([
      z
        .string()
        .trim()
        .max(100, 'El correo no puede exceder 100 caracteres')
        .email('El correo no es válido'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null)),
  telefono: z
    .string({ error: 'El teléfono es obligatorio' })
    .trim()
    .regex(/^\d{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos'),
  direccion: z
    .string({ error: 'La dirección es obligatoria' })
    .trim()
    .min(1, 'La dirección es obligatoria')
    .max(150, 'La dirección no puede exceder 150 caracteres'),
  ciudad: optionalText(60, 'La ciudad no puede exceder 60 caracteres'),
  estado_republica: optionalText(
    60,
    'El estado no puede exceder 60 caracteres',
  ),
  codigo_postal: z
    .union([
      z.string().trim().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null)),
  tiene_credito: z.boolean().optional(),
  limite_credito: z.unknown().optional(),
}).superRefine((payload, ctx) => {
  if (payload.tiene_credito === false) return;
  if (payload.tiene_credito === true || payload.limite_credito !== undefined) {
    if (
      !Number.isInteger(payload.limite_credito) ||
      payload.limite_credito <= 0 ||
      payload.limite_credito > 99999999
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['limite_credito'],
        message: creditLimitError,
      });
    }
  }
}).transform((payload) =>
  payload.tiene_credito === false
    ? { ...payload, limite_credito: 0 }
    : payload,
);

export const clienteCreditoPayloadSchema = z
  .object({
    tiene_credito: z.boolean({
      error: 'Tiene crédito debe ser verdadero o falso',
    }),
    limite_credito: z.unknown().optional(),
  })
  .superRefine((payload, ctx) => {
    if (
      payload.tiene_credito &&
      (!Number.isInteger(payload.limite_credito) ||
        payload.limite_credito <= 0 ||
        payload.limite_credito > 99999999)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['limite_credito'],
        message: creditLimitError,
      });
    }
  })
  .transform((payload) => ({
    tiene_credito: payload.tiene_credito,
    limite_credito: payload.tiene_credito ? payload.limite_credito : 0,
  }));

export const clienteIdSchema = z.coerce
  .number({ error: 'El ID debe ser numérico' })
  .int('El ID debe ser entero')
  .positive('El ID debe ser mayor a cero');

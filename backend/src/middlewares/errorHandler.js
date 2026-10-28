import { ZodError } from 'zod';
import { ApiError } from '../lib/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message,
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'El cuerpo de la petición no es un JSON válido',
      message: 'El cuerpo de la petición no es un JSON válido',
    });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'El registro ya existe',
      message: 'El registro ya existe',
    });
  }

  console.error('[errorHandler]', error);
  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: 'Error interno del servidor',
  });
}

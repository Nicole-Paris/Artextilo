import jwt from 'jsonwebtoken';
import { ApiError } from '../lib/ApiError.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'artextilo_jwt_secret_key_prod_2026_super_secure_987654321';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Token de autorización no proporcionado o formato inválido'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('La sesión ha expirado. Por favor inicia sesión nuevamente'));
    }
    return next(ApiError.unauthorized('Token de autorización inválido o alterado'));
  }
}

export function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => String(r).trim().toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Usuario no autenticado'));
    }

    const userRole = String(req.user.rol || '').trim().toLowerCase();
    if (!normalizedAllowed.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Acceso denegado: tu rol (${req.user.rol}) no tiene permisos para esta acción`,
        ),
      );
    }

    return next();
  };
}

import { Navigate, Outlet } from 'react-router-dom';
import { normalizeRole } from '../lib/roles.js';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('artextilo_token');
  const empleadoStr = localStorage.getItem('artextilo_empleado');

  if (!token || !empleadoStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const empleado = JSON.parse(empleadoStr);
      const userRole = normalizeRole(empleado?.rol);
      const normalizedAllowed = allowedRoles.map(normalizeRole);
      if (!normalizedAllowed.includes(userRole)) {
        return <Navigate to="/" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
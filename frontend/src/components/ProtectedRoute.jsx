import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('artextilo_token');
  const empleado = localStorage.getItem('artextilo_empleado');

  if (!token || !empleado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
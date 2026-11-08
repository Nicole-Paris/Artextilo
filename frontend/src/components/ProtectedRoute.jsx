import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const empleado = localStorage.getItem('artextilo_empleado');

  if (!empleado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
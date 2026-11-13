
import { Route, Routes, Navigate } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CajaPage from './pages/CajaPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import DevolucionesPage from './pages/DevolucionesPage.jsx';
import EmpleadosPage from './pages/EmpleadosPage.jsx';
import InventarioPage from './pages/InventarioPage.jsx';
import NotFound from './pages/NotFound.jsx';
import PedidosPage from './pages/PedidosPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import SucursalesPage from './pages/SucursalesPage.jsx';
import CategoriaPage from './pages/CategoriaPage.jsx';
import ProductosPage from './pages/ProductosPage.jsx';
import GlobalValuesPage from './pages/GlobalValuesPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="empleados" element={<EmpleadosPage />} />
          <Route path="sucursales" element={<SucursalesPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="categorias" element={<CategoriaPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="caja" element={<CajaPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="devoluciones" element={<DevolucionesPage />} />
          <Route path="global-values" element={<GlobalValuesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={
          localStorage.getItem('artextilo_empleado')
            ? <Navigate to="/inicio" replace />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}
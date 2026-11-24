import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Code-splitting de páginas con React.lazy para reducir el bundle inicial
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const CajaPage = lazy(() => import('./pages/CajaPage.jsx'));
const ClientesPage = lazy(() => import('./pages/ClientesPage.jsx'));
const InventarioPage = lazy(() => import('./pages/InventarioPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const PedidosPage = lazy(() => import('./pages/PedidosPage.jsx'));
const PuntoVentaPage = lazy(() => import('./pages/PuntoVentaPage.jsx'));
const ReportesPage = lazy(() => import('./pages/ReportesPage.jsx'));
const SucursalesPage = lazy(() => import('./pages/SucursalesPage.jsx'));
const ProductosPage = lazy(() => import('./pages/ProductosPage.jsx'));
const GlobalValuesPage = lazy(() => import('./pages/GlobalValuesPage.jsx'));

function PageLoading() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-clay border-t-transparent" />
        <span className="text-xs font-semibold text-muted">Cargando módulo…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="inicio" element={<Navigate to="/" replace />} />
              <Route path="pos" element={<PuntoVentaPage />} />
              <Route path="punto-de-venta" element={<Navigate to="/pos" replace />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route path="empleados" element={<Navigate to="/sucursales" replace />} />
              <Route path="sucursales" element={<SucursalesPage />} />
              <Route path="categorias" element={<Navigate to="/productos?tab=categorias" replace />} />
              <Route path="productos" element={<ProductosPage />} />
              <Route path="inventario" element={<InventarioPage />} />
              <Route path="caja" element={<CajaPage />} />
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="reportes" element={<ReportesPage />} />
              <Route path="devoluciones" element={<Navigate to="/pedidos?tab=devoluciones" replace />} />
              <Route path="global-values" element={<GlobalValuesPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>

          <Route
            path="/"
            element={
              localStorage.getItem('artextilo_token') && localStorage.getItem('artextilo_empleado')
                ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

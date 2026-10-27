import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import EmpleadosPage from './pages/EmpleadosPage.jsx';
import NotFound from './pages/NotFound.jsx';
import RolesPage from './pages/RolesPage.jsx';
import SucursalesPage from './pages/SucursalesPage.jsx';
import CategoriaPage from './pages/CategoriaPage.jsx';
import ProductosPage from './pages/ProductosPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="empleados" element={<EmpleadosPage />} />
        <Route path="sucursales" element={<SucursalesPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="categorias" element={<CategoriaPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
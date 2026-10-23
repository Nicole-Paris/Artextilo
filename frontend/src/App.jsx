import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import RolesPage from './pages/RolesPage.jsx';
import SucursalesPage from './pages/SucursalesPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="sucursales" element={<SucursalesPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

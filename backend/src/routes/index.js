import { Router } from 'express';
import categoriasRoutes from '../modules/categorias/categorias.routes.js';
import clientesRoutes from '../modules/clientes/clientes.routes.js';
import empleadosRoutes from '../modules/empleados/empleados.routes.js';
import productosRoutes from '../modules/productos/productos.routes.js';
import rolesRoutes from '../modules/roles/roles.routes.js';
import sucursalesRoutes from '../modules/sucursales/sucursales.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/roles', rolesRoutes);
router.use('/sucursales', sucursalesRoutes);
router.use('/empleados', empleadosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);

export default router;

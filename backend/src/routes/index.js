import { Router } from 'express';
import cajaRoutes from '../modules/caja/caja.routes.js';
import categoriasRoutes from '../modules/categorias/categorias.routes.js';
import clientesRoutes from '../modules/clientes/clientes.routes.js';
import devolucionesRoutes from '../modules/devoluciones/devoluciones.routes.js';
import empleadosRoutes from '../modules/empleados/empleados.routes.js';
import inventarioRoutes from '../modules/inventario/inventario.routes.js';
import pedidosRoutes from '../modules/pedidos/pedidos.routes.js';
import productosRoutes from '../modules/productos/productos.routes.js';
import rolesRoutes from '../modules/roles/roles.routes.js';
import sucursalesRoutes from '../modules/sucursales/sucursales.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import globalValuesRoutes from '../modules/global-values/global-values.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/roles', rolesRoutes);
router.use('/sucursales', sucursalesRoutes);
router.use('/empleados', empleadosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/devoluciones', devolucionesRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/caja', cajaRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/auth', authRoutes);
router.use('/global-values', globalValuesRoutes);

export default router;
import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
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
import reportesRoutes from '../modules/reportes/reportes.routes.js';

const router = Router();

// Rutas públicas
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.use('/auth', authRoutes);

// Rutas protegidas con autenticación obligatoria
router.use('/roles', requireAuth, rolesRoutes);
router.use('/sucursales', requireAuth, sucursalesRoutes);
router.use('/empleados', requireAuth, empleadosRoutes);
router.use('/clientes', requireAuth, clientesRoutes);
router.use('/devoluciones', requireAuth, devolucionesRoutes);
router.use('/categorias', requireAuth, categoriasRoutes);
router.use('/productos', requireAuth, productosRoutes);
router.use('/inventario', requireAuth, inventarioRoutes);
router.use('/caja', requireAuth, cajaRoutes);
router.use('/pedidos', requireAuth, pedidosRoutes);
router.use('/global-values', requireAuth, globalValuesRoutes);
router.use('/reportes', requireAuth, reportesRoutes);

export default router;
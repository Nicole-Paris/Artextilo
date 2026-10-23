import { Router } from 'express';
import rolesRoutes from '../modules/roles/roles.routes.js';
import sucursalesRoutes from '../modules/sucursales/sucursales.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/roles', rolesRoutes);
router.use('/sucursales', sucursalesRoutes);

export default router;

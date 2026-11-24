import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  destroy,
  index,
  movimientos,
  show,
  stats,
  store,
  storeMovimiento,
  updateMinimo,
} from './inventario.controller.js';

const router = Router();

// Consultar inventario y registrar movimientos (Entradas para supervisor; cualquier movimiento para admin)
router.get('/', requireRole('administrador', 'supervisor', 'gerente'), index);
router.get('/stats', requireRole('administrador', 'supervisor', 'gerente'), stats);
router.get('/movimientos', requireRole('administrador', 'supervisor', 'gerente'), movimientos);
router.post('/movimientos', requireRole('administrador', 'supervisor', 'gerente'), storeMovimiento);

router.get('/:id', requireRole('administrador', 'supervisor', 'gerente'), show);
router.post('/:id/movimientos', requireRole('administrador', 'supervisor', 'gerente'), storeMovimiento);

// Gestión estructural de inventario (solo administrador)
router.post('/', requireRole('administrador'), store);
router.patch('/:id/stock-minimo', requireRole('administrador'), updateMinimo);
router.delete('/:id', requireRole('administrador'), destroy);

export default router;


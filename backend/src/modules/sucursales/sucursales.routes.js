import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  dependencies,
  destroy,
  index,
  restore,
  show,
  store,
  update,
} from './sucursales.controller.js';

const router = Router();

router.get('/', index);
router.get('/:id', show);

// Solo administrador puede gestionar sucursales
router.get('/:id/dependencies', requireRole('administrador'), dependencies);
router.post('/:id/restore', requireRole('administrador'), restore);
router.post('/', requireRole('administrador'), store);
router.put('/:id', requireRole('administrador'), update);
router.delete('/:id', requireRole('administrador'), destroy);

export default router;

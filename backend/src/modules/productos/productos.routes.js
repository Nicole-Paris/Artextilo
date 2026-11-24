import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  destroy,
  index,
  show,
  store,
  update,
} from './productos.controller.js';

const router = Router();

// Consulta permitida para todos (POS)
router.get('/', index);
router.get('/:id', show);

// Modificación solo administrador
router.post('/', requireRole('administrador'), store);
router.put('/:id', requireRole('administrador'), update);
router.delete('/:id', requireRole('administrador'), destroy);

export default router;

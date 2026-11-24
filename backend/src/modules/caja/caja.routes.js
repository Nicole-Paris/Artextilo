import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  abierta,
  cerrar,
  index,
  pagos,
  show,
  store,
} from './caja.controller.js';

const router = Router();

router.get('/', index);
router.get('/abierta', abierta);
router.get('/:id/pagos', pagos);
router.get('/:id', show);

// Solo administrador y supervisor pueden abrir y cerrar cajas
router.post('/abrir', requireRole('administrador', 'supervisor', 'gerente'), store);
router.post('/:id/cerrar', requireRole('administrador', 'supervisor', 'gerente'), cerrar);

export default router;

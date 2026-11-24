import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';

import {
  create,
  getLogoHandler,
  index,
  show,
  update,
  updateLogoHandler,
} from './global-values.controller.js';

const router = Router();

// Lectura de logo y valores globales permitida
router.get('/logo', getLogoHandler);
router.get('/', index);
router.get('/:id', show);

// Modificaciones solo administrador
router.put('/logo', requireRole('administrador'), updateLogoHandler);
router.post('/', requireRole('administrador'), create);
router.put('/:id', requireRole('administrador'), update);

export default router;

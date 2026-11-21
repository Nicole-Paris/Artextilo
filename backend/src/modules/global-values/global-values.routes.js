import { Router } from 'express';

import {
  create,
  getLogoHandler,
  index,
  show,
  update,
  updateLogoHandler,
} from './global-values.controller.js';

const router = Router();

// Logotipo de la empresa
router.get('/logo', getLogoHandler);
router.put('/logo', updateLogoHandler);

// Catálogo de valores globales
router.get('/', index);
router.post('/', create);
router.get('/:id', show);
router.put('/:id', update);

export default router;

import { Router } from 'express';

import {
  index,
  show,
  update,
} from './global-values.controller.js';

const router = Router();

// Catálogo operativo de solo edición: no se crean ni eliminan valores.
router.get('/', index);
router.get('/:id', show);
router.put('/:id', update);

export default router;

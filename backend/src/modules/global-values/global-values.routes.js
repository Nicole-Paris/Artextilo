
import { Router } from 'express';

import {
  destroy,
  index,
  restore,
  show,
  store,
  update,
} from './global-values.controller.js';

const router = Router();

router.get('/', index);
router.post('/', store);

router.post('/:id/restore', restore);
router.get('/:id', show);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;
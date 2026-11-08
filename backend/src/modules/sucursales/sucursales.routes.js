import { Router } from 'express';
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
router.get('/:id/dependencies', dependencies);
router.post('/:id/restore', restore);
router.get('/:id', show);
router.post('/', store);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;

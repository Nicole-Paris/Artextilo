import { Router } from 'express';
import {
  destroy,
  index,
  show,
  store,
  update,
} from './categorias.controller.js';

const router = Router();

router.get('/', index);
router.get('/:id', show);
router.post('/', store);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;

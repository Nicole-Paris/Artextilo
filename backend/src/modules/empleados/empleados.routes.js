import { Router } from 'express';
import {
  destroy,
  index,
  restore,
  show,
  store,
  updateEstado,
  update,
} from './empleados.controller.js';

const router = Router();

router.get('/', index);
router.post('/:id/restore', restore);
router.patch('/:id/estado', updateEstado);
router.get('/:id', show);
router.post('/', store);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;

import { Router } from 'express';
import {
  cancelar,
  index,
  show,
  stats,
  store,
  storePago,
  updateEstado,
} from './pedidos.controller.js';

const router = Router();

router.get('/', index);
router.get('/stats', stats);
router.post('/', store);
router.get('/:id', show);
router.post('/:id/pagos', storePago);
router.patch('/:id/estado', updateEstado);
router.post('/:id/cancelar', cancelar);

export default router;

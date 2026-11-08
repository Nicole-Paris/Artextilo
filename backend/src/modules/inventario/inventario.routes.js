import { Router } from 'express';
import {
  destroy,
  index,
  movimientos,
  show,
  stats,
  store,
  storeMovimiento,
  updateMinimo,
} from './inventario.controller.js';

const router = Router();

// Rutas especiales sin parámetro dinámico :id
router.get('/', index);
router.get('/stats', stats);
router.get('/movimientos', movimientos);
router.post('/movimientos', storeMovimiento);

// Rutas con ID
router.get('/:id', show);
router.post('/', store);
router.patch('/:id/stock-minimo', updateMinimo);
router.post('/:id/movimientos', storeMovimiento);
router.delete('/:id', destroy);

export default router;


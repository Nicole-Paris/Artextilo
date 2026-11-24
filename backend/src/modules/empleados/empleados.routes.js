import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  destroy,
  index,
  restore,
  show,
  store,
  updateEstado,
  updateSucursal,
  update,
} from './empleados.controller.js';

const router = Router();

// Solo el administrador puede gestionar empleados
router.use(requireRole('administrador'));

router.get('/', index);
router.post('/:id/restore', restore);
router.patch('/:id/estado', updateEstado);
router.patch('/:id/sucursal', updateSucursal);
router.get('/:id', show);
router.post('/', store);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;

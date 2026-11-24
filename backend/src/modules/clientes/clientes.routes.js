import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import {
  destroy,
  index,
  show,
  store,
  update,
  updateCredito,
} from './clientes.controller.js';

const router = Router();

// Consultar y registrar clientes permitido para todos (empleados, cajeras, supervisores, admin)
router.get('/', index);
router.get('/:id', show);
router.post('/', store);

// Actualizar datos de cliente permitido a supervisor y administrador
router.put('/:id', requireRole('administrador', 'supervisor', 'gerente'), update);

// Asignación de crédito y eliminación exclusiva de administrador
router.patch('/:id/credito', requireRole('administrador'), updateCredito);
router.delete('/:id', requireRole('administrador'), destroy);

export default router;

import { Router } from 'express';
import { requireRole } from '../../middlewares/authMiddleware.js';
import { index, show, showPedido, store } from './devoluciones.controller.js';

const router = Router();

// Solo administrador y supervisor pueden consultar y registrar devoluciones
router.use(requireRole('administrador', 'supervisor', 'gerente'));

router.get('/', index);
router.get('/pedido/:idPedido', showPedido);
router.get('/:id', show);
router.post('/', store);

export default router;

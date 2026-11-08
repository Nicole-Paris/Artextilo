import { Router } from 'express';
import { index, show, showPedido, store } from './devoluciones.controller.js';

const router = Router();

router.get('/', index);
router.get('/pedido/:idPedido', showPedido);
router.get('/:id', show);
router.post('/', store);

export default router;

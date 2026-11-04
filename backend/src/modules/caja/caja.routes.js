import { Router } from 'express';
import {
  abierta,
  cerrar,
  index,
  pagos,
  show,
  store,
} from './caja.controller.js';

const router = Router();

router.get('/', index);
router.get('/abierta', abierta);
router.post('/abrir', store);
router.get('/:id/pagos', pagos);
router.get('/:id', show);
router.post('/:id/cerrar', cerrar);

export default router;

import { Router } from 'express';
import {
  cambiarPassword,
  login,
  pedirRecuperacion,
  validarCodigo,
} from './auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/recuperar-password', pedirRecuperacion);
router.post('/verificar-codigo', validarCodigo);
router.post('/restablecer-password', cambiarPassword);

export default router;

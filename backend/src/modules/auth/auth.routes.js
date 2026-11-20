import { Router } from 'express';
import {
  cambiarPassword,
  login,
  pedirRecuperacion,
  validarCodigo,
  modificarPerfil,
} from './auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/recuperar-password', pedirRecuperacion);
router.post('/verificar-codigo', validarCodigo);
router.post('/restablecer-password', cambiarPassword);
router.put('/perfil', modificarPerfil);

export default router;

import { Router } from 'express';
import { index } from './roles.controller.js';

const router = Router();

// Catálogo de solo lectura: los roles del sistema son fijos.
router.get('/', index);

export default router;

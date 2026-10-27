import 'dotenv/config';
import app from './app.js';
import { checkConnection } from './config/db.js';

const port = Number(process.env.PORT ?? 4000);

try {
  await checkConnection();
  console.log('[db] Conexión a MySQL establecida');
} catch (error) {
  console.error('[db] No se pudo conectar a MySQL:', error.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`[api] Servidor escuchando en http://localhost:${port}`);
});
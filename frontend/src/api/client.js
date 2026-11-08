const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución en el puerto 4000.',
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    let errorMessage = body?.message || body?.error;

    if (!errorMessage) {
      if (response.status === 502 || response.status === 504) {
        errorMessage = 'El servidor backend no responde. Verifica que el servicio esté corriendo en el puerto 4000.';
      } else if (response.status === 500) {
        errorMessage = 'Error interno del servidor (500). Verifica la conexión a la base de datos o la consola del backend.';
      } else if (response.status === 404) {
        errorMessage = `Ruta no encontrada (404): ${path}`;
      } else {
        errorMessage = `Error en el servidor (Código ${response.status})`;
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = body?.details;
    throw error;
  }

  return body;
}

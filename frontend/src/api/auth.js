import { request } from './client.js';

export const authApi = {
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  solicitarRecuperacion(payload) {
    return request('/auth/recuperar-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verificarCodigo(payload) {
    return request('/auth/verificar-codigo', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  restablecerPassword(payload) {
    return request('/auth/restablecer-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

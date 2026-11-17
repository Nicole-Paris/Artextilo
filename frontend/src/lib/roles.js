export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function canManageCaja(empleado) {
  return ['administrador', 'supervisor', 'gerente'].includes(
    normalizeRole(empleado?.rol),
  );
}

export function isCashier(empleado) {
  return ['cajera', 'cajero', 'empleado'].includes(
    normalizeRole(empleado?.rol),
  );
}

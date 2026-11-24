export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function isAdmin(empleado) {
  return ['administrador', 'admin'].includes(
    normalizeRole(empleado?.rol),
  );
}

export function isSupervisor(empleado) {
  return ['supervisor', 'gerente'].includes(
    normalizeRole(empleado?.rol),
  );
}

export function isSupervisorOrAdmin(empleado) {
  return ['administrador', 'admin', 'supervisor', 'gerente'].includes(
    normalizeRole(empleado?.rol),
  );
}

export function canManageCaja(empleado) {
  return isSupervisorOrAdmin(empleado);
}

export function canManageInventario(empleado) {
  return isSupervisorOrAdmin(empleado);
}

export function canManageDevoluciones(empleado) {
  return isSupervisorOrAdmin(empleado);
}

export function isCashier(empleado) {
  return ['cajera', 'cajero', 'empleado', 'supervisor', 'administrador', 'admin'].includes(
    normalizeRole(empleado?.rol),
  );
}

export function formatRole(role) {
  const norm = normalizeRole(role);
  if (norm === 'administrador') return 'Administrador';
  if (norm === 'supervisor') return 'Supervisor';
  if (norm === 'cajera') return 'Cajera';
  if (norm === 'empleado' || norm === 'cajero') return 'Cajero / Empleado';
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Empleado';
}

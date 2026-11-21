import { pool } from '../../config/db.js';

const BASE_SELECT = `
  SELECT id_rol, nombre, descripcion, created_at, updated_at
  FROM rol
`;

export async function listRoles() {
  try {
    const rolesToEnsure = [
      ['administrador', 'Dueña: control total del sistema y caja'],
      ['supervisor', 'Supervisión de sucursal, control de cajas y pedidos'],
      ['cajera', 'Atención en mostrador, registro de pedidos y cobro'],
    ];

    for (const [nombre, descripcion] of rolesToEnsure) {
      const [existing] = await pool.execute(
        `SELECT id_rol FROM rol WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
        [nombre],
      );
      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO rol (nombre, descripcion) VALUES (?, ?)`,
          [nombre, descripcion],
        );
      }
    }
  } catch (err) {
    console.error('[roles] Error asegurando roles base:', err.message);
  }

  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE deleted_at IS NULL ORDER BY nombre ASC`,
  );
  return rows;
}

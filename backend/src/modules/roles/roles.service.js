import { pool } from '../../config/db.js';

const BASE_SELECT = `
  SELECT id_rol, nombre, descripcion, created_at, updated_at
  FROM rol
`;

export async function listRoles() {
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE deleted_at IS NULL ORDER BY nombre ASC`,
  );
  return rows;
}

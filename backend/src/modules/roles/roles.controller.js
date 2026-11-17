import { listRoles } from './roles.service.js';

export async function index(req, res) {
  const roles = await listRoles();
  res.json({ data: roles });
}

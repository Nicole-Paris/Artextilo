const pool = require('../config/database'); // Ajusta la ruta a tu conexión de BD

class CategoriaService {
    async listar() {
        const [rows] = await pool.query(
            'SELECT id_categoria, nombre, descripcion, estado, created_at, updated_at FROM categoria_producto WHERE deleted_at IS NULL'
        );
        return rows;
    }

    async obtenerPorId(id) {
        const [rows] = await pool.query(
            'SELECT id_categoria, nombre, descripcion, estado, created_at, updated_at FROM categoria_producto WHERE id_categoria = ? AND deleted_at IS NULL',
            [id]
        );
        return rows[0];
    }

    async crear(data, userId) {
        const { nombre, descripcion, estado = 'activo' } = data;
        const [result] = await pool.query(
            `INSERT INTO categoria_producto (nombre, descripcion, estado, created_by) VALUES (?, ?, ?, ?)`,
            [nombre, descripcion, estado, userId || null]
        );
        return { id_categoria: result.insertId, nombre, descripcion, estado };
    }

    async actualizar(id, data, userId) {
        const { nombre, descripcion, estado } = data;
        await pool.query(
            `UPDATE categoria_producto 
             SET nombre = COALESCE(?, nombre), 
                 descripcion = COALESCE(?, descripcion), 
                 estado = COALESCE(?, estado), 
                 updated_by = ? 
             WHERE id_categoria = ? AND deleted_at IS NULL`,
            [nombre, descripcion, estado, userId || null, id]
        );
        return await this.obtenerPorId(id);
    }

    async eliminar(id, userId) {
        // Borrado lógico
        await pool.query(
            `UPDATE categoria_producto 
             SET deleted_at = NOW(), deleted_by = ? 
             WHERE id_categoria = ? AND deleted_at IS NULL`,
            [userId || null, id]
        );
        return { message: 'Categoría eliminada correctamente' };
    }
}

module.exports = new CategoriaService();
const pool = require('../config/database');

class ProductoService {
    async listar() {
        const [rows] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre 
            FROM producto p
            INNER JOIN categoria_producto c ON p.id_categoria = c.id_categoria
            WHERE p.deleted_at IS NULL
        `);
        return rows;
    }

    async obtenerPorId(id) {
        const [rows] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre 
            FROM producto p
            INNER JOIN categoria_producto c ON p.id_categoria = c.id_categoria
            WHERE p.id_producto = ? AND p.deleted_at IS NULL
        `, [id]);
        return rows[0];
    }

    async crear(data, userId) {
        const {
            id_categoria, sku, nombre, genero = 'unisex', color, talla,
            descripcion, costo_compra = 0, precio_unitario, estado = 'activo'
        } = data;

        const [result] = await pool.query(
            `INSERT INTO producto 
            (id_categoria, sku, nombre, genero, color, talla, descripcion, costo_compra, precio_unitario, estado, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_categoria, sku, nombre, genero, color, talla, descripcion, costo_compra, precio_unitario, estado, userId || null]
        );
        return { id_producto: result.insertId, ...data };
    }

    async actualizar(id, data, userId) {
        const {
            id_categoria, sku, nombre, genero, color, talla,
            descripcion, costo_compra, precio_unitario, estado
        } = data;

        await pool.query(
            `UPDATE producto 
             SET id_categoria = COALESCE(?, id_categoria),
                 sku = COALESCE(?, sku),
                 nombre = COALESCE(?, nombre),
                 genero = COALESCE(?, genero),
                 color = COALESCE(?, color),
                 talla = COALESCE(?, talla),
                 descripcion = COALESCE(?, descripcion),
                 costo_compra = COALESCE(?, costo_compra),
                 precio_unitario = COALESCE(?, precio_unitario),
                 estado = COALESCE(?, estado),
                 updated_by = ?
             WHERE id_producto = ? AND deleted_at IS NULL`,
            [id_categoria, sku, nombre, genero, color, talla, descripcion, costo_compra, precio_unitario, estado, userId || null, id]
        );
        return await this.obtenerPorId(id);
    }

    async eliminar(id, userId) {
        await pool.query(
            `UPDATE producto 
             SET deleted_at = NOW(), deleted_by = ? 
             WHERE id_producto = ? AND deleted_at IS NULL`,
            [userId || null, id]
        );
        return { message: 'Producto eliminado lógicamente' };
    }
}

module.exports = new ProductoService();
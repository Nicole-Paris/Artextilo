const categoriaService = require('./categoria.service');

class CategoriaController {
    async listar(req, res) {
        try {
            const categorias = await categoriaService.listar();
            res.json({ success: true, data: categorias });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async obtenerPorId(req, res) {
        try {
            const categoria = await categoriaService.obtenerPorId(req.params.id);
            if (!categoria) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }
            res.json({ success: true, data: categoria });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async crear(req, res) {
        try {
            const userId = req.usuario?.id_empleado; // Asumiendo que usas JWT o middleware de auth
            const nuevaCategoria = await categoriaService.crear(req.body, userId);
            res.status(201).json({ success: true, message: 'Categoría creada con éxito', data: nuevaCategoria });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async actualizar(req, res) {
        try {
            const userId = req.usuario?.id_empleado;
            const categoriaActualizada = await categoriaService.actualizar(req.params.id, req.body, userId);
            if (!categoriaActualizada) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }
            res.json({ success: true, message: 'Categoría actualizada con éxito', data: categoriaActualizada });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async eliminar(req, res) {
        try {
            const userId = req.usuario?.id_empleado;
            await categoriaService.eliminar(req.params.id, userId);
            res.json({ success: true, message: 'Categoría eliminada con éxito' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new CategoriaController();
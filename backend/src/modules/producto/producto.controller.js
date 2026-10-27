const productoService = require('./producto.service');

class ProductoController {
    async listar(req, res) {
        try {
            const productos = await productoService.listar();
            res.json({ success: true, data: productos });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async obtenerPorId(req, res) {
        try {
            const producto = await productoService.obtenerPorId(req.params.id);
            if (!producto) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }
            res.json({ success: true, data: producto });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async crear(req, res) {
        try {
            const userId = req.usuario?.id_empleado;
            const nuevoProducto = await productoService.crear(req.body, userId);
            res.status(201).json({ success: true, message: 'Producto creado con éxito', data: nuevoProducto });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async actualizar(req, res) {
        try {
            const userId = req.usuario?.id_empleado;
            const productoActualizado = await productoService.actualizar(req.params.id, req.body, userId);
            if (!productoActualizado) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }
            res.json({ success: true, message: 'Producto actualizado con éxito', data: productoActualizado });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async eliminar(req, res) {
        try {
            const userId = req.usuario?.id_empleado;
            await productoService.eliminar(req.params.id, userId);
            res.json({ success: true, message: 'Producto eliminado con éxito' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ProductoController();
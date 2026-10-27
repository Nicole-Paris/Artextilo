const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const productoService = {
  async listar() {
    try {
      const response = await fetch(`${API_URL}/productos`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al listar productos:', error);
      throw error;
    }
  },

  async obtenerPorId(id) {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al obtener el producto con id ${id}:`, error);
      throw error;
    }
  },

  async crear(productoData) {
    try {
      const response = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productoData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  },

  async actualizar(id, productoData) {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productoData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al actualizar el producto con id ${id}:`, error);
      throw error;
    }
  },

  async eliminar(id) {
    try {
      const response = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al eliminar el producto con id ${id}:`, error);
      throw error;
    }
  }
};
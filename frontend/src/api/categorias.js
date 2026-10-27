const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const categoriaService = {
  async listar() {
    try {
      const response = await fetch(`${API_URL}/categorias`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al listar categorías:', error);
      throw error;
    }
  },

  async obtenerPorId(id) {
    try {
      const response = await fetch(`${API_URL}/categorias/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al obtener la categoría con id ${id}:`, error);
      throw error;
    }
  },

  async crear(categoriaData) {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // Descomenta si usas token de autenticación
        },
        body: JSON.stringify(categoriaData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  },

  async actualizar(id, categoriaData) {
    try {
      const response = await fetch(`${API_URL}/categorias/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoriaData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al actualizar la categoría con id ${id}:`, error);
      throw error;
    }
  },

  async eliminar(id) {
    try {
      const response = await fetch(`${API_URL}/categorias/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error al eliminar la categoría con id ${id}:`, error);
      throw error;
    }
  }
};
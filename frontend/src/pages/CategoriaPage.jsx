import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';

export default function CategoriaPage() {
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:4000/api/categorias';

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        setCategorias(data.data);
      }
    } catch (err) {
      console.error('Error al cargar las categorías', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_URL}/${form.id_categoria}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        fetchCategorias();
        resetForm();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error al guardar la categoría');
    }
  };

  const handleEdit = (cat) => {
    setForm(cat);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCategorias();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const resetForm = () => {
    setForm({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Categorías de Productos</h1>
          <p className="text-sm text-muted">Gestiona las clasificaciones del catálogo artesanal</p>
        </div>
      </div>

      {/* Formulario Estilizado */}
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold text-ink flex items-center gap-2">
          <Tag className="h-5 w-5 text-clay" />
          {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej. Guayaberas"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Descripción</label>
            <input
              type="text"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Breve descripción..."
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Estado</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="md:col-span-3 flex justify-end gap-3 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted-strong transition hover:bg-sand"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-clay-dark"
            >
              <Plus className="h-4 w-4" />
              {isEditing ? 'Actualizar Categoría' : 'Guardar Categoría'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla Estilizada */}
      <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-sand/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">ID</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Nombre</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Descripción</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Estado</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {categorias.length === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-muted">
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                categorias.map((cat) => (
                  <tr key={cat.id_categoria} className="transition hover:bg-sand/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">#{cat.id_categoria}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{cat.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{cat.descripcion || 'Sin descripción'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cat.estado === 'activo' ? 'bg-forest/10 text-forest' : 'bg-red-100 text-red-700'
                      }`}>
                        {cat.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(cat)} className="text-clay hover:text-clay-dark mr-3 inline-flex items-center gap-1">
                        <Edit className="h-4 w-4" /> Editar
                      </button>
                      <button onClick={() => handleDelete(cat.id_categoria)} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
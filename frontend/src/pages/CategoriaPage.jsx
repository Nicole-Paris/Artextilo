import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Tag, Search, RefreshCw } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import { categoriasApi } from '../api/categorias.js';

export default function CategoriaPage() {
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await categoriasApi.list(search);
      setCategorias(res.data || []);
    } catch (err) {
      console.error('Error al cargar las categorías:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || null,
        estado: form.estado || 'activo',
      };

      if (isEditing) {
        await categoriasApi.update(form.id_categoria, payload);
        setSuccess('Categoría actualizada con éxito.');
      } else {
        await categoriasApi.create(payload);
        setSuccess('Categoría creada con éxito.');
      }

      await fetchCategorias();
      resetForm();
    } catch (err) {
      setError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat) => {
    setForm({
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      estado: cat.estado,
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      setError('');
      setSuccess('');
      await categoriasApi.remove(id);
      setSuccess('Categoría eliminada con éxito.');
      await fetchCategorias();
    } catch (err) {
      setError(err.message || 'Error al eliminar la categoría.');
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
          />
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchCategorias}
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              <RefreshCw className="h-3 w-3" /> Reintentar
            </button>
          </div>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <span>{success}</span>
        </Alert>
      )}

      {/* Formulario Estilizado */}
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold text-ink flex items-center gap-2">
          <Tag className="h-5 w-5 text-clay" />
          {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre *</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              maxLength={50}
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
              maxLength={150}
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
                disabled={saving}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-sand"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-clay/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Guardando...' : isEditing ? 'Actualizar Categoría' : 'Guardar Categoría'}
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
              {loading && categorias.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-muted">
                    Cargando categorías...
                  </td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-muted">
                    No se encontraron categorías registradas.
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
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-clay hover:underline mr-4 inline-flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id_categoria)}
                        className="text-red-600 hover:underline inline-flex items-center gap-1"
                      >
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
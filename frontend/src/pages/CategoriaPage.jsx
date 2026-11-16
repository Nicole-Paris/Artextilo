import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Search, RefreshCw } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import { categoriasApi } from '../api/categorias.js';

export default function CategoriaPage() {
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
  const [isEditing, setIsEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [estadoTarget, setEstadoTarget] = useState(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState(null);

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
    setFormError('');
  };

  const nameError = !form.nombre.trim() ? 'El nombre de la categoría es obligatorio.' : '';
  const visibleNameError = touched.nombre ? nameError : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ nombre: true });
    if (nameError) {
      return;
    }

    try {
      setSaving(true);
      setFormError('');
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
      setFormError(err.message || 'Error al guardar la categoría.');
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
    setFormOpen(true);
    setTouched({});
    setFormError('');
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    setForm({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
    setIsEditing(false);
    setFormOpen(true);
    setTouched({});
    setFormError('');
    setError('');
    setSuccess('');
  };

  const updateEstado = async (cat, estado) => {
    setUpdatingEstadoId(cat.id_categoria);
    setError('');
    setSuccess('');

    try {
      await categoriasApi.update(cat.id_categoria, {
        nombre: cat.nombre,
        descripcion: cat.descripcion || null,
        estado,
      });
      setSuccess(
        estado === 'activo'
          ? 'Categoría activada con éxito.'
          : 'Categoría desactivada con éxito.',
      );
      await fetchCategorias();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingEstadoId(null);
      setEstadoTarget(null);
    }
  };

  const resetForm = () => {
    setForm({ id_categoria: null, nombre: '', descripcion: '', estado: 'activo' });
    setIsEditing(false);
    setFormOpen(false);
    setTouched({});
    setFormError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Categorías de Productos</h1>
          <p className="text-sm text-muted">Gestiona las clasificaciones del catálogo artesanal</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
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
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Nueva categoría
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error">
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
        <Alert type="success">{success}</Alert>
      )}

      <Modal
        open={formOpen}
        onClose={resetForm}
        title={isEditing ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button variant="secondary" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="categoria-form"
              loading={saving}
              disabled={!form.nombre.trim()}
            >
              {isEditing ? 'Actualizar categoría' : 'Guardar categoría'}
            </Button>
          </>
        }
      >
        <form
          id="categoria-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {formError && (
            <Alert type="error" className="sm:col-span-2">
              {formError}
            </Alert>
          )}
          <Field label="Nombre *" htmlFor="categoria-nombre" error={visibleNameError}>
            <input
              id="categoria-nombre"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              onBlur={() => setTouched((prev) => ({ ...prev, nombre: true }))}
              maxLength={50}
              placeholder="Ej. Guayaberas"
              className={inputClass(visibleNameError)}
            />
          </Field>
          <Field
            label="Descripción"
            htmlFor="categoria-descripcion"
            className="sm:col-span-2"
          >
            <input
              id="categoria-descripcion"
              type="text"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              maxLength={150}
              placeholder="Breve descripción..."
              className={inputClass()}
            />
          </Field>
          <Field label="Estado" htmlFor="categoria-estado">
            <select
              id="categoria-estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className={inputClass()}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Field>
        </form>
      </Modal>

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
                      <select
                        value={cat.estado}
                        aria-label={`Estado de ${cat.nombre}`}
                        disabled={updatingEstadoId === cat.id_categoria}
                        onChange={(event) =>
                          event.target.value === 'inactivo'
                            ? setEstadoTarget(cat)
                            : updateEstado(cat, 'activo')
                        }
                        className={`inline-block align-middle rounded-full border border-transparent px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-60 ${
                          cat.estado === 'activo'
                            ? 'bg-forest/10 text-forest'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-flex items-center justify-end">
                        <IconButton
                          type="button"
                          variant="edit"
                          icon={Pencil}
                          label={`Editar ${cat.nombre}`}
                          onClick={() => handleEdit(cat)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(estadoTarget)}
        title="Desactivar categoría"
        message={
          estadoTarget
            ? `«${estadoTarget.nombre}» dejará de estar activa. Podrás activarla de nuevo cuando quieras.`
            : ''
        }
        confirmLabel="Desactivar"
        loading={Boolean(
          estadoTarget && updatingEstadoId === estadoTarget.id_categoria,
        )}
        onCancel={() => setEstadoTarget(null)}
        onConfirm={() => estadoTarget && updateEstado(estadoTarget, 'inactivo')}
      />
    </div>
  );
}
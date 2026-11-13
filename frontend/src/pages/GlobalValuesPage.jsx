
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Search,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

import Alert from '../components/Alert.jsx';
import { globalValuesApi } from '../api/global-values.js';

export default function GlobalValuesPage() {
  const [values, setValues] = useState([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [form, setForm] = useState({
    id_global_value: null,
    tipo: '',
    nombre: '',
    valor: '',
    descripcion: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchValues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const res = await globalValuesApi.getAll({
        search,
        tipo: tipoFilter,
        archived: showArchived,
      });

      setValues(res.data || []);
    } catch (err) {
      console.error('Error al cargar los valores globales:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [search, tipoFilter, showArchived]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tipo.trim() || !form.nombre.trim() || !form.valor.trim()) {
      setError('Completa los campos obligatorios.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        tipo: form.tipo.trim(),
        nombre: form.nombre.trim(),
        valor: form.valor.trim(),
        descripcion: form.descripcion.trim() || null,
      };

      if (isEditing) {
        await globalValuesApi.update(form.id_global_value, payload);
        setSuccess('Valor global actualizado correctamente.');
      } else {
        await globalValuesApi.create(payload);
        setSuccess('Valor global creado correctamente.');
      }

      resetForm();
      await fetchValues();
    } catch (err) {
      setError(err.message || 'Error al guardar el valor global.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      id_global_value: item.id_global_value,
      tipo: item.tipo,
      nombre: item.nombre,
      valor: item.valor,
      descripcion: item.descripcion || '',
    });

    setIsEditing(true);
    setError('');
    setSuccess('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este valor global?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await globalValuesApi.delete(id);

      setSuccess('Valor global eliminado correctamente.');
      await fetchValues();
    } catch (err) {
      setError(err.message || 'Error al eliminar el valor global.');
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm('¿Deseas restaurar este valor global?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await globalValuesApi.restore(id);

      setSuccess('Valor global restaurado correctamente.');
      await fetchValues();
    } catch (err) {
      setError(err.message || 'Error al restaurar el valor global.');
    }
  };

  const resetForm = () => {
    setForm({
      id_global_value: null,
      tipo: '',
      nombre: '',
      valor: '',
      descripcion: '',
    });

    setIsEditing(false);
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Valores Globales
          </h1>
          <p className="text-sm text-muted">
            Administra las configuraciones y valores generales del sistema.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar valor global..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-4 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
          />
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchValues}
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              <RefreshCw className="h-3 w-3" />
              Reintentar
            </button>
          </div>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <span>{success}</span>
        </Alert>
      )}

      {!showArchived && (
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
            <Settings className="h-5 w-5 text-clay" />
            {isEditing ? 'Editar Valor Global' : 'Nuevo Valor Global'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Tipo *
              </label>
              <input
                type="text"
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                required
                maxLength={45}
                placeholder="Ej. Configuración"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                maxLength={45}
                placeholder="Ej. moneda"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Valor *
              </label>
              <textarea
                name="valor"
                value={form.valor}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Escribe el valor correspondiente..."
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Descripción
              </label>
              <input
                type="text"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                maxLength={150}
                placeholder="Describe para qué sirve este valor..."
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
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
                {saving
                  ? 'Guardando...'
                  : isEditing
                    ? 'Actualizar Valor'
                    : 'Guardar Valor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
          >
            <option value="">Todos los tipos</option>
            {[...new Set(values.map((item) => item.tipo))].map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setShowArchived(!showArchived);
              resetForm();
              setSuccess('');
              setError('');
            }}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-sand"
          >
            {showArchived ? 'Ver activos' : 'Ver eliminados'}
          </button>
        </div>

        <span className="text-sm text-muted">
          {values.length} registros encontrados
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-sand/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  ID
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Tipo
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Nombre
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Valor
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Descripción
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line bg-white">
              {loading && values.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-muted">
                    Cargando valores globales...
                  </td>
                </tr>
              ) : values.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-muted">
                    No se encontraron valores globales registrados.
                  </td>
                </tr>
              ) : (
                values.map((item) => (
                  <tr
                    key={item.id_global_value}
                    className="transition hover:bg-sand/20"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                      #{item.id_global_value}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className="inline-flex rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-medium text-clay">
                        {item.tipo}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-ink">
                      {item.nombre}
                    </td>

                    <td className="max-w-xs break-words px-6 py-4 text-sm text-muted">
                      {item.valor}
                    </td>

                    <td className="px-6 py-4 text-sm text-muted">
                      {item.descripcion || 'Sin descripción'}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {showArchived ? (
                        <button
                          type="button"
                          onClick={() => handleRestore(item.id_global_value)}
                          className="inline-flex items-center gap-1 text-forest hover:underline"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restaurar
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="mr-4 inline-flex items-center gap-1 text-clay hover:underline"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id_global_value)}
                            className="inline-flex items-center gap-1 text-red-600 hover:underline"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </>
                      )}
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
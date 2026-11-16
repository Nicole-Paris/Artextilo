import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Search, RefreshCw, Filter } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import { productosApi } from '../api/productos.js';
import { categoriasApi } from '../api/categorias.js';

const INITIAL_FORM = {
  id_producto: null,
  id_categoria: '',
  sku: '',
  nombre: '',
  genero: 'unisex',
  color: '',
  talla: '',
  descripcion: '',
  costo_compra: 0,
  precio_unitario: '',
  estado: 'activo',
};

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
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
      const res = await categoriasApi.list();
      setCategorias(res.data || []);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {};
      if (search) filters.search = search;
      if (selectedCategoria) filters.id_categoria = selectedCategoria;

      const res = await productosApi.list(filters);
      setProductos(res.data || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategoria]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = ['costo_compra', 'precio_unitario'].includes(name)
      ? value.replace(/\D/g, '')
      : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setFormError('');
  };

  const fieldErrors = {
    id_categoria: form.id_categoria ? '' : 'Selecciona una categoría.',
    nombre: form.nombre.trim() ? '' : 'El nombre del producto es obligatorio.',
    color: form.color.trim() ? '' : 'El color es obligatorio.',
    talla: form.talla.trim() ? '' : 'La talla es obligatoria.',
    precio_unitario: form.precio_unitario !== '' ? '' : 'El precio es obligatorio.',
  };
  const visibleFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([field, message]) => touched[field] && message),
  );
  const formIsValid = Object.values(fieldErrors).every((message) => !message);

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      id_categoria: true,
      nombre: true,
      color: true,
      talla: true,
      precio_unitario: true,
    });
    if (!formIsValid) {
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      setSuccess('');

      const payload = {
        id_categoria: Number(form.id_categoria),
        sku: form.sku?.trim() || null,
        nombre: form.nombre.trim(),
        genero: form.genero || 'unisex',
        color: form.color.trim(),
        talla: form.talla.trim(),
        descripcion: form.descripcion?.trim() || null,
        costo_compra: Number(form.costo_compra) || 0,
        precio_unitario: Number(form.precio_unitario) || 0,
        estado: form.estado || 'activo',
      };

      if (isEditing) {
        await productosApi.update(form.id_producto, payload);
        setSuccess('Producto actualizado con éxito.');
      } else {
        await productosApi.create(payload);
        setSuccess('Producto registrado con éxito.');
      }

      await fetchProductos();
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (prod) => {
    setForm({
      id_producto: prod.id_producto,
      id_categoria: String(prod.id_categoria),
      sku: prod.sku || '',
      nombre: prod.nombre,
      genero: prod.genero,
      color: prod.color,
      talla: prod.talla,
      descripcion: prod.descripcion || '',
      costo_compra: String(prod.costo_compra ?? 0),
      precio_unitario: String(prod.precio_unitario ?? ''),
      estado: prod.estado,
    });
    setIsEditing(true);
    setFormOpen(true);
    setTouched({});
    setFormError('');
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    setForm({ ...INITIAL_FORM });
    setIsEditing(false);
    setFormOpen(true);
    setTouched({});
    setFormError('');
    setError('');
    setSuccess('');
  };

  const updateEstado = async (prod, estado) => {
    try {
      setError('');
      setSuccess('');
      setUpdatingEstadoId(prod.id_producto);
      await productosApi.update(prod.id_producto, {
        id_categoria: Number(prod.id_categoria),
        sku: prod.sku?.trim() || null,
        nombre: prod.nombre.trim(),
        genero: prod.genero || 'unisex',
        color: prod.color.trim(),
        talla: prod.talla.trim(),
        descripcion: prod.descripcion?.trim() || null,
        costo_compra: Number(prod.costo_compra) || 0,
        precio_unitario: Number(prod.precio_unitario) || 0,
        estado,
      });
      setSuccess(estado === 'activo' ? 'Producto activado con éxito.' : 'Producto desactivado con éxito.');
      await fetchProductos();
    } catch (err) {
      setError(err.message || 'Error al actualizar el estado del producto.');
    } finally {
      setUpdatingEstadoId(null);
      setEstadoTarget(null);
    }
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setIsEditing(false);
    setFormOpen(false);
    setTouched({});
    setFormError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Catálogo de Productos</h1>
          <p className="text-sm text-muted">Administra los artículos, prendas y variantes de la tienda</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar prenda o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchProductos}
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
        title={isEditing ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="producto-form"
              loading={saving}
              disabled={!formIsValid}
            >
              {isEditing ? 'Actualizar producto' : 'Guardar producto'}
            </Button>
          </>
        }
      >
        <form
          id="producto-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {formError && (
            <Alert type="error" className="sm:col-span-2">
              {formError}
            </Alert>
          )}
          <Field label="Categoría *" htmlFor="producto-categoria" error={visibleFieldErrors.id_categoria}>
            <select
              id="producto-categoria"
              name="id_categoria"
              value={form.id_categoria}
              onChange={handleChange}
              onBlur={handleBlur}
              className={inputClass(visibleFieldErrors.id_categoria)}
            >
              <option value="">Seleccione categoría...</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre} {cat.estado === 'inactivo' ? '(Inactiva)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU (Opcional)" htmlFor="producto-sku">
            <input
              id="producto-sku"
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              maxLength={30}
              placeholder="Ej. GUA-BLA-M"
              className={inputClass()}
            />
          </Field>
          <Field
            label="Nombre de la prenda *"
            htmlFor="producto-nombre"
            error={visibleFieldErrors.nombre}
            className="sm:col-span-2"
          >
            <input
              id="producto-nombre"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={60}
              placeholder="Ej. Guayabera Presidencial Lino"
              className={inputClass(visibleFieldErrors.nombre)}
            />
          </Field>
          <Field label="Género" htmlFor="producto-genero">
            <select
              id="producto-genero"
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className={`${inputClass()} capitalize`}
            >
              <option value="caballero">Caballero</option>
              <option value="dama">Dama</option>
              <option value="nino">Niño</option>
              <option value="nina">Niña</option>
              <option value="unisex">Unisex</option>
            </select>
          </Field>
          <Field label="Color *" htmlFor="producto-color" error={visibleFieldErrors.color}>
            <input
              id="producto-color"
              type="text"
              name="color"
              value={form.color}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={60}
              placeholder="Ej. Blanco hueso"
              className={inputClass(visibleFieldErrors.color)}
            />
          </Field>
          <Field label="Talla *" htmlFor="producto-talla" error={visibleFieldErrors.talla}>
            <input
              id="producto-talla"
              type="text"
              name="talla"
              value={form.talla}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={20}
              placeholder="Ej. M, G, 38, 40"
              className={inputClass(visibleFieldErrors.talla)}
            />
          </Field>
          <Field label="Estado" htmlFor="producto-estado">
            <select
              id="producto-estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className={inputClass()}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Field>
          <Field label="Costo de compra (MXN)" htmlFor="producto-costo">
            <input
              id="producto-costo"
              type="text"
              inputMode="numeric"
              name="costo_compra"
              value={form.costo_compra}
              onChange={handleChange}
              className={inputClass()}
            />
          </Field>
          <Field
            label="Precio unitario (MXN) *"
            htmlFor="producto-precio"
            error={visibleFieldErrors.precio_unitario}
          >
            <input
              id="producto-precio"
              type="text"
              inputMode="numeric"
              name="precio_unitario"
              value={form.precio_unitario}
              onChange={handleChange}
              onBlur={handleBlur}
              className={inputClass(visibleFieldErrors.precio_unitario)}
            />
          </Field>
          <Field
            label="Descripción / Detalles"
            htmlFor="producto-descripcion"
            className="sm:col-span-2"
          >
            <input
              id="producto-descripcion"
              type="text"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              maxLength={150}
              placeholder="Detalles sobre bordado, tela o corte..."
              className={inputClass()}
            />
          </Field>
        </form>
      </Modal>

      <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-sand/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">SKU</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Prenda</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Categoría</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Detalle (Género / Color / Talla)</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Precio</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Estado</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {loading && productos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                    Cargando productos...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                productos.map((prod) => (
                  <tr key={prod.id_producto} className="transition hover:bg-sand/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted">
                      {prod.sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">
                      {prod.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {prod.categoria_nombre || 'Sin categoría'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted capitalize">
                      {prod.genero} • {prod.color} • Talla {prod.talla}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-forest">
                      ${Number(prod.precio_unitario).toLocaleString('es-MX')} MXN
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={prod.estado}
                        aria-label={`Estado de ${prod.nombre}`}
                        disabled={updatingEstadoId === prod.id_producto}
                        onChange={(e) => {
                          if (e.target.value === 'inactivo') {
                            setEstadoTarget(prod);
                          } else {
                            updateEstado(prod, 'activo');
                          }
                        }}
                        className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-50 ${
                          prod.estado === 'activo'
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
                          label={`Editar ${prod.nombre}`}
                          onClick={() => handleEdit(prod)}
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
        title="Desactivar producto"
        message={
          estadoTarget
            ? `«${estadoTarget.nombre}» dejará de estar activo. Podrás activarlo de nuevo cuando quieras.`
            : ''
        }
        confirmLabel="Desactivar"
        loading={Boolean(
          estadoTarget && updatingEstadoId === estadoTarget.id_producto,
        )}
        onCancel={() => setEstadoTarget(null)}
        onConfirm={() => estadoTarget && updateEstado(estadoTarget, 'inactivo')}
      />
    </div>
  );
}
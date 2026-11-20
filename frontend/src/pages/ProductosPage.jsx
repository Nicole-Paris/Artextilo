import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Search, RefreshCw, Filter, Package, Tag } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import { productosApi } from '../api/productos.js';
import { categoriasApi } from '../api/categorias.js';
import { cn } from '../lib/cn.js';

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

const INITIAL_CATEGORY_FORM = {
  id_categoria: null,
  nombre: '',
  descripcion: '',
  estado: 'activo',
};

export default function ProductosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categorias' ? 'categorias' : 'productos';

  // --- Estado de Productos ---
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

  // --- Estado de Categorías ---
  const [categoriasList, setCategoriasList] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryForm, setCategoryForm] = useState(INITIAL_CATEGORY_FORM);
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState({});
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryEstadoTarget, setCategoryEstadoTarget] = useState(null);
  const [updatingCategoryEstadoId, setUpdatingCategoryEstadoId] = useState(null);

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'categorias') {
      next.set('tab', 'categorias');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
    setError('');
    setFormError('');
    setCategoryFormError('');
  };

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await categoriasApi.list();
      setCategorias(res.data || []);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  }, []);

  const fetchCategoriasList = useCallback(async () => {
    try {
      const res = await categoriasApi.list(categorySearch);
      setCategoriasList(res.data || []);
    } catch (err) {
      console.error('Error al cargar listado de categorías:', err);
    }
  }, [categorySearch]);

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
    fetchCategoriasList();
  }, [fetchCategoriasList]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  // --- Handlers de Productos ---
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

  // --- Handlers de Categorías ---
  const handleCategoryChange = (e) => {
    setCategoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setCategoryFormError('');
  };

  const categoryNameError = !categoryForm.nombre.trim() ? 'El nombre de la categoría es obligatorio.' : '';
  const visibleCategoryNameError = categoryTouched.nombre ? categoryNameError : '';

  const handleNewCategory = () => {
    setCategoryForm({ ...INITIAL_CATEGORY_FORM });
    setIsCategoryEditing(false);
    setCategoryFormOpen(true);
    setCategoryTouched({});
    setCategoryFormError('');
    setError('');
    setSuccess('');
  };

  const handleEditCategory = (cat) => {
    setCategoryForm({
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      estado: cat.estado,
    });
    setIsCategoryEditing(true);
    setCategoryFormOpen(true);
    setCategoryTouched({});
    setCategoryFormError('');
    setError('');
    setSuccess('');
  };

  const resetCategoryForm = () => {
    setCategoryForm({ ...INITIAL_CATEGORY_FORM });
    setIsCategoryEditing(false);
    setCategoryFormOpen(false);
    setCategoryTouched({});
    setCategoryFormError('');
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setCategoryTouched({ nombre: true });
    if (categoryNameError) return;

    try {
      setCategorySaving(true);
      setCategoryFormError('');
      setSuccess('');

      const payload = {
        nombre: categoryForm.nombre.trim(),
        descripcion: categoryForm.descripcion?.trim() || null,
        estado: categoryForm.estado || 'activo',
      };

      if (isCategoryEditing) {
        await categoriasApi.update(categoryForm.id_categoria, payload);
        setSuccess('Categoría actualizada con éxito.');
      } else {
        await categoriasApi.create(payload);
        setSuccess('Categoría creada con éxito.');
      }

      await Promise.all([fetchCategoriasList(), fetchCategorias(), fetchProductos()]);
      resetCategoryForm();
    } catch (err) {
      setCategoryFormError(err.message || 'Error al guardar la categoría.');
    } finally {
      setCategorySaving(false);
    }
  };

  const updateCategoryEstado = async (cat, estado) => {
    setUpdatingCategoryEstadoId(cat.id_categoria);
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
      await Promise.all([fetchCategoriasList(), fetchCategorias(), fetchProductos()]);
    } catch (err) {
      setError(err.message || 'Error al cambiar estado de la categoría.');
    } finally {
      setUpdatingCategoryEstadoId(null);
      setCategoryEstadoTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pestañas de navegación interna */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setTab('productos')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
            activeTab === 'productos'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          <Package className="h-4 w-4" />
          <span>Catálogo de Productos</span>
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted">
            {productos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('categorias')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
            activeTab === 'categorias'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          <Tag className="h-4 w-4" />
          <span>Categorías</span>
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted">
            {categoriasList.length}
          </span>
        </button>
      </div>

      {/* SECCIÓN 1: PRODUCTOS */}
      {activeTab === 'productos' && (
        <>
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

          {success && <Alert type="success">{success}</Alert>}

          {/* Modal de Producto */}
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
            <form id="producto-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="SKU (opcional)" htmlFor="producto-sku">
                <input
                  id="producto-sku"
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  maxLength={50}
                  placeholder="Ej. GUA-L-AZU-01"
                  className={inputClass()}
                />
              </Field>

              <Field label="Nombre de la prenda *" htmlFor="producto-nombre" error={visibleFieldErrors.nombre}>
                <input
                  id="producto-nombre"
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={100}
                  placeholder="Ej. Guayabera de lino manga larga"
                  className={inputClass(visibleFieldErrors.nombre)}
                />
              </Field>

              <Field label="Género" htmlFor="producto-genero">
                <select
                  id="producto-genero"
                  name="genero"
                  value={form.genero}
                  onChange={handleChange}
                  className={inputClass()}
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
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
                  maxLength={50}
                  placeholder="Ej. Azul marino"
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
                  placeholder="Ej. M, G, 38, Única"
                  className={inputClass(visibleFieldErrors.talla)}
                />
              </Field>

              <Field label="Precio unitario ($ MXN) *" htmlFor="producto-precio-unitario" error={visibleFieldErrors.precio_unitario}>
                <input
                  id="producto-precio-unitario"
                  type="text"
                  inputMode="numeric"
                  name="precio_unitario"
                  value={form.precio_unitario}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Ej. 850"
                  className={inputClass(visibleFieldErrors.precio_unitario)}
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

              <Field label="Descripción adicional" htmlFor="producto-descripcion" className="sm:col-span-2">
                <input
                  id="producto-descripcion"
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  maxLength={255}
                  placeholder="Detalles sobre tela, bordado o cuidados..."
                  className={inputClass()}
                />
              </Field>
            </form>
          </Modal>

          {/* Tabla de Productos */}
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
        </>
      )}

      {/* SECCIÓN 2: CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Categorías de Productos</h1>
              <p className="text-sm text-muted">Gestiona las clasificaciones y familias del catálogo artesanal</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
                />
              </div>
              <Button onClick={handleNewCategory}>
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
                  onClick={fetchCategoriasList}
                  className="inline-flex items-center gap-1 font-semibold underline"
                >
                  <RefreshCw className="h-3 w-3" /> Reintentar
                </button>
              </div>
            </Alert>
          )}

          {success && <Alert type="success">{success}</Alert>}

          {/* Modal de Categoría */}
          <Modal
            open={categoryFormOpen}
            onClose={resetCategoryForm}
            title={isCategoryEditing ? 'Editar categoría' : 'Nueva categoría'}
            footer={
              <>
                <Button variant="secondary" onClick={resetCategoryForm} disabled={categorySaving}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="categoria-form"
                  loading={categorySaving}
                  disabled={!categoryForm.nombre.trim()}
                >
                  {isCategoryEditing ? 'Actualizar categoría' : 'Guardar categoría'}
                </Button>
              </>
            }
          >
            <form
              id="categoria-form"
              onSubmit={handleCategorySubmit}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {categoryFormError && (
                <Alert type="error" className="sm:col-span-2">
                  {categoryFormError}
                </Alert>
              )}
              <Field label="Nombre *" htmlFor="categoria-nombre" error={visibleCategoryNameError}>
                <input
                  id="categoria-nombre"
                  type="text"
                  name="nombre"
                  value={categoryForm.nombre}
                  onChange={handleCategoryChange}
                  onBlur={() => setCategoryTouched((prev) => ({ ...prev, nombre: true }))}
                  maxLength={50}
                  placeholder="Ej. Guayaberas"
                  className={inputClass(visibleCategoryNameError)}
                />
              </Field>
              <Field label="Estado" htmlFor="categoria-estado">
                <select
                  id="categoria-estado"
                  name="estado"
                  value={categoryForm.estado}
                  onChange={handleCategoryChange}
                  className={inputClass()}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
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
                  value={categoryForm.descripcion}
                  onChange={handleCategoryChange}
                  maxLength={150}
                  placeholder="Breve descripción..."
                  className={inputClass()}
                />
              </Field>
            </form>
          </Modal>

          {/* Tabla de Categorías */}
          <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-sand/50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">ID</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Nombre</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Descripción</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Productos</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Estado</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {categoriasList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-sm text-muted">
                        No se encontraron categorías registradas.
                      </td>
                    </tr>
                  ) : (
                    categoriasList.map((cat) => {
                      const countProds = productos.filter(
                        (p) => Number(p.id_categoria) === Number(cat.id_categoria),
                      ).length;
                      return (
                        <tr key={cat.id_categoria} className="transition hover:bg-sand/20">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">#{cat.id_categoria}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{cat.nombre}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{cat.descripcion || 'Sin descripción'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-ink">
                              <Package className="h-3 w-3 text-muted" />
                              {countProds} {countProds === 1 ? 'prenda' : 'prendas'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={cat.estado}
                              aria-label={`Estado de ${cat.nombre}`}
                              disabled={updatingCategoryEstadoId === cat.id_categoria}
                              onChange={(event) =>
                                event.target.value === 'inactivo'
                                  ? setCategoryEstadoTarget(cat)
                                  : updateCategoryEstado(cat, 'activo')
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
                                onClick={() => handleEditCategory(cat)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <ConfirmDialog
            open={Boolean(categoryEstadoTarget)}
            title="Desactivar categoría"
            message={
              categoryEstadoTarget
                ? `«${categoryEstadoTarget.nombre}» dejará de estar activa. Podrás activarla de nuevo cuando quieras.`
                : ''
            }
            confirmLabel="Desactivar"
            loading={Boolean(
              categoryEstadoTarget && updatingCategoryEstadoId === categoryEstadoTarget.id_categoria,
            )}
            onCancel={() => setCategoryEstadoTarget(null)}
            onConfirm={() => categoryEstadoTarget && updateCategoryEstado(categoryEstadoTarget, 'inactivo')}
          />
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Package, Search, RefreshCw, Filter } from 'lucide-react';
import Alert from '../components/Alert.jsx';
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
  precio_unitario: 0,
  estado: 'activo',
};

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.id_categoria) {
      setError('Por favor selecciona una categoría.');
      return;
    }
    if (!form.nombre.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!form.color.trim()) {
      setError('El color es obligatorio.');
      return;
    }
    if (!form.talla.trim()) {
      setError('La talla es obligatoria.');
      return;
    }
    if (Number(form.precio_unitario) < 0) {
      setError('El precio unitario no puede ser negativo.');
      return;
    }

    try {
      setSaving(true);
      setError('');
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
      setError(err.message || 'Error al guardar el producto.');
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
      costo_compra: prod.costo_compra,
      precio_unitario: prod.precio_unitario,
      estado: prod.estado,
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      setError('');
      setSuccess('');
      await productosApi.remove(id);
      setSuccess('Producto eliminado con éxito.');
      await fetchProductos();
    } catch (err) {
      setError(err.message || 'Error al eliminar el producto.');
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Catálogo de Productos</h1>
          <p className="text-sm text-muted">Administra los artículos, prendas y variantes de la tienda</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
      </div>

      {error && (
        <Alert variant="danger">
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
        <Alert variant="success">
          <span>{success}</span>
        </Alert>
      )}

      {/* Formulario de Producto */}
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold text-ink flex items-center gap-2">
          <Package className="h-5 w-5 text-clay" />
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Categoría *
            </label>
            <select
              name="id_categoria"
              value={form.id_categoria}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Seleccione categoría...</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre} {cat.estado === 'inactivo' ? '(Inactiva)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              SKU (Opcional)
            </label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="Ej. GUA-BLA-M"
              maxLength={30}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Nombre de la prenda *
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              maxLength={60}
              placeholder="Ej. Guayabera Presidencial Lino"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Género *
            </label>
            <select
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay capitalize"
            >
              <option value="caballero">Caballero</option>
              <option value="dama">Dama</option>
              <option value="nino">Niño</option>
              <option value="nina">Niña</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Color *
            </label>
            <input
              type="text"
              name="color"
              value={form.color}
              onChange={handleChange}
              required
              maxLength={60}
              placeholder="Ej. Blanco hueso"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Talla *
            </label>
            <input
              type="text"
              name="talla"
              value={form.talla}
              onChange={handleChange}
              required
              maxLength={20}
              placeholder="Ej. M, G, 38, 40"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Estado
            </label>
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Costo de Compra (MXN)
            </label>
            <input
              type="number"
              name="costo_compra"
              value={form.costo_compra}
              onChange={handleChange}
              min="0"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Precio Unitario (MXN) *
            </label>
            <input
              type="number"
              name="precio_unitario"
              value={form.precio_unitario}
              onChange={handleChange}
              required
              min="0"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Descripción / Detalles
            </label>
            <input
              type="text"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              maxLength={150}
              placeholder="Detalles sobre bordado, tela o corte..."
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
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
              {saving ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>

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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        prod.estado === 'activo' ? 'bg-forest/10 text-forest' : 'bg-red-100 text-red-700'
                      }`}>
                        {prod.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="text-clay hover:underline mr-4 inline-flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id_producto)}
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
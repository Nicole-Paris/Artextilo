import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({
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
    estado: 'activo'
  });
  const [isEditing, setIsEditing] = useState(false);

  const API_URL = 'http://localhost:4000/api/productos';
  const API_CAT_URL = 'http://localhost:4000/api/categorias';

  const fetchData = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        fetch(API_URL),
        fetch(API_CAT_URL)
      ]);
      const dataProd = await resProd.json();
      const dataCat = await resCat.json();
      
      if (dataProd.success) setProductos(dataProd.data);
      if (dataCat.success) setCategorias(dataCat.data);
    } catch (err) {
      console.error('Error al cargar datos', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_URL}/${form.id_producto}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
        resetForm();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error al guardar el producto');
    }
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const resetForm = () => {
    setForm({
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
      estado: 'activo'
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Catálogo de Productos</h1>
          <p className="text-sm text-muted">Administra los artículos, prendas y variantes de la tienda</p>
        </div>
      </div>

      {/* Formulario Estilizado */}
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold text-ink flex items-center gap-2">
          <Package className="h-5 w-5 text-clay" />
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Categoría</label>
            <select
              name="id_categoria"
              value={form.id_categoria}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Seleccione...</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="Código único"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Nombre del producto"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Género</label>
            <select
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="dama">Dama</option>
              <option value="caballero">Caballero</option>
              <option value="nino">Niño</option>
              <option value="nina">Niña</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Color</label>
            <input
              type="text"
              name="color"
              value={form.color}
              onChange={handleChange}
              required
              placeholder="Ej. Azul / Blanco"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Talla</label>
            <input
              type="text"
              name="talla"
              value={form.talla}
              onChange={handleChange}
              required
              placeholder="Ej. M / G / 32"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Costo Compra</label>
            <input
              type="number"
              name="costo_compra"
              value={form.costo_compra}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Precio Unitario</label>
            <input
              type="number"
              name="precio_unitario"
              value={form.precio_unitario}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
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
              {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">SKU</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Nombre</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Categoría</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Género / Color / Talla</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Precio</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-muted">
                    No hay productos registrados.
                  </td>
                </tr>
              ) : (
                productos.map((prod) => (
                  <tr key={prod.id_producto} className="transition hover:bg-sand/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted">{prod.sku || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{prod.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{prod.categoria_nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted capitalize">{`${prod.genero} / ${prod.color} / ${prod.talla}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-forest">${prod.precio_unitario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(prod)} className="text-clay hover:text-clay-dark mr-3 inline-flex items-center gap-1">
                        <Edit className="h-4 w-4" /> Editar
                      </button>
                      <button onClick={() => handleDelete(prod.id_producto)} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1">
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
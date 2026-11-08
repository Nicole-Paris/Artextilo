import { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import { inventarioApi } from '../api/inventario.js';
import { productosApi } from '../api/productos.js';
import { sucursalesApi } from '../api/sucursales.js';
import { categoriasApi } from '../api/categorias.js';

const MOTIVOS_ENTRADA = [
  'Recepción de taller / maquila',
  'Compra de mercancía',
  'Ajuste por conteo físico',
  'Devolución de cliente',
];

const MOTIVOS_SALIDA = [
  'Venta directa mostrador',
  'Ajuste por conteo físico',
  'Prenda dañada / merma',
  'Traspaso a otra sucursal',
  'Muestra comercial',
];

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState('existencias'); // 'existencias' | 'movimientos'

  // Data
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [stats, setStats] = useState({
    total_productos_asignados: 0,
    total_registros_inventario: 0,
    total_piezas_stock: 0,
    total_bajo_stock: 0,
    total_agotados: 0,
  });

  // Catalogs for filters & forms
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Filters
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
  const [selectedItemForMovimiento, setSelectedItemForMovimiento] = useState(null);
  const [formMovimiento, setFormMovimiento] = useState({
    id_inventario: '',
    tipo: 'entrada',
    cantidad: 1,
    motivo: 'Recepción de taller / maquila',
  });
  const [savingMovimiento, setSavingMovimiento] = useState(false);

  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [formAsignar, setFormAsignar] = useState({
    id_producto: '',
    id_sucursal: '',
    stock_minimo: 5,
    stock_inicial: 0,
  });
  const [savingAsignar, setSavingAsignar] = useState(false);

  const [modalMinimoOpen, setModalMinimoOpen] = useState(false);
  const [selectedItemForMinimo, setSelectedItemForMinimo] = useState(null);
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState(5);
  const [savingMinimo, setSavingMinimo] = useState(false);

  // Load catalogs once
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [sucRes, prodRes, catRes] = await Promise.all([
          sucursalesApi.list(),
          productosApi.list(),
          categoriasApi.list(),
        ]);
        setSucursales(sucRes.data || []);
        setProductos(prodRes.data || []);
        setCategorias(catRes.data || []);
      } catch (err) {
        console.error('Error al cargar catálogos:', err);
      }
    }
    loadCatalogs();
  }, []);

  // Load stats & inventario
  const fetchInventario = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {};
      if (selectedSucursal) filters.id_sucursal = selectedSucursal;
      if (selectedCategoria) filters.id_categoria = selectedCategoria;
      if (search) filters.search = search;
      if (soloBajoStock) filters.bajo_stock = true;

      const [invRes, statsRes] = await Promise.all([
        inventarioApi.list(filters),
        inventarioApi.getStats(selectedSucursal || null),
      ]);

      setInventario(invRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [selectedSucursal, selectedCategoria, search, soloBajoStock]);

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoadingMovimientos(true);
      const filters = {};
      if (selectedSucursal) filters.id_sucursal = selectedSucursal;
      if (filtroTipoMovimiento) filters.tipo = filtroTipoMovimiento;
      if (search) filters.search = search;

      const res = await inventarioApi.listMovimientos(filters);
      setMovimientos(res.data || []);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    } finally {
      setLoadingMovimientos(false);
    }
  }, [selectedSucursal, filtroTipoMovimiento, search]);

  useEffect(() => {
    if (activeTab === 'existencias') {
      fetchInventario();
    } else {
      fetchMovimientos();
    }
  }, [activeTab, fetchInventario, fetchMovimientos]);

  // Open Movement modal for a specific row
  const handleOpenMovimiento = (item, defaultTipo = 'entrada') => {
    setSelectedItemForMovimiento(item);
    setFormMovimiento({
      id_inventario: item.id_inventario,
      tipo: defaultTipo,
      cantidad: 1,
      motivo: defaultTipo === 'entrada' ? MOTIVOS_ENTRADA[0] : MOTIVOS_SALIDA[0],
    });
    setModalMovimientoOpen(true);
  };

  const handleSaveMovimiento = async (e) => {
    e.preventDefault();
    if (!formMovimiento.id_inventario) {
      setError('Seleccione un producto del inventario.');
      return;
    }
    if (Number(formMovimiento.cantidad) <= 0) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }
    if (!formMovimiento.motivo.trim()) {
      setError('El motivo del movimiento es obligatorio.');
      return;
    }

    try {
      setSavingMovimiento(true);
      setError('');
      setSuccess('');

      await inventarioApi.registrarMovimiento({
        id_inventario: Number(formMovimiento.id_inventario),
        tipo: formMovimiento.tipo,
        cantidad: Number(formMovimiento.cantidad),
        motivo: formMovimiento.motivo.trim(),
      });

      setSuccess(
        `${formMovimiento.tipo === 'entrada' ? 'Entrada' : 'Salida'} de mercancía registrada exitosamente.`,
      );
      setModalMovimientoOpen(false);
      fetchInventario();
      if (activeTab === 'movimientos') fetchMovimientos();
    } catch (err) {
      setError(err.message || 'Error al registrar movimiento.');
    } finally {
      setSavingMovimiento(false);
    }
  };

  // Open Asignar modal
  const handleOpenAsignar = () => {
    setFormAsignar({
      id_producto: '',
      id_sucursal: selectedSucursal || (sucursales[0]?.id_sucursal ?? ''),
      stock_minimo: 5,
      stock_inicial: 0,
    });
    setModalAsignarOpen(true);
  };

  const handleSaveAsignar = async (e) => {
    e.preventDefault();
    if (!formAsignar.id_producto) {
      setError('Por favor selecciona una prenda.');
      return;
    }
    if (!formAsignar.id_sucursal) {
      setError('Por favor selecciona una sucursal.');
      return;
    }

    try {
      setSavingAsignar(true);
      setError('');
      setSuccess('');

      await inventarioApi.create({
        id_producto: Number(formAsignar.id_producto),
        id_sucursal: Number(formAsignar.id_sucursal),
        stock_minimo: Number(formAsignar.stock_minimo) || 0,
        stock_inicial: Number(formAsignar.stock_inicial) || 0,
      });

      setSuccess('Prenda asignada al inventario de la sucursal correctamente.');
      setModalAsignarOpen(false);
      fetchInventario();
    } catch (err) {
      setError(err.message || 'Error al asignar prenda al inventario.');
    } finally {
      setSavingAsignar(false);
    }
  };

  // Adjust Stock Minimo modal
  const handleOpenMinimo = (item) => {
    setSelectedItemForMinimo(item);
    setNuevoStockMinimo(item.stock_minimo);
    setModalMinimoOpen(true);
  };

  const handleSaveMinimo = async (e) => {
    e.preventDefault();
    try {
      setSavingMinimo(true);
      setError('');
      setSuccess('');

      await inventarioApi.updateStockMinimo(selectedItemForMinimo.id_inventario, {
        stock_minimo: Number(nuevoStockMinimo),
      });

      setSuccess('Stock mínimo actualizado correctamente.');
      setModalMinimoOpen(false);
      fetchInventario();
    } catch (err) {
      setError(err.message || 'Error al actualizar stock mínimo.');
    } finally {
      setSavingMinimo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Control de Inventario y Movimientos
          </h1>
          <p className="text-sm text-muted">
            Existencias en tiempo real por sucursal, alertas de stock y trazabilidad de prendas
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="secondary"
            onClick={() => handleOpenMovimiento(inventario[0] || {}, 'entrada')}
            disabled={inventario.length === 0}
            className="text-xs sm:text-sm"
          >
            <ArrowUpRight className="h-4 w-4 text-forest" />
            Registrar Movimiento
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenAsignar}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            Asignar Prenda a Sucursal
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="danger">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchInventario}
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              <RefreshCw className="h-3 w-3" /> Reintentar
            </button>
          </div>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{success}</span>
          </div>
        </Alert>
      )}

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-ink">
              <Boxes className="h-5 w-5 text-clay" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Piezas en Stock</p>
              <p className="text-2xl font-bold text-ink">
                {stats.total_piezas_stock?.toLocaleString('es-MX') ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-ink">
              <Package className="h-5 w-5 text-forest" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Prendas Asignadas</p>
              <p className="text-2xl font-bold text-ink">
                {stats.total_productos_asignados ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Bajo Stock</p>
              <p className="text-2xl font-bold text-amber-700">
                {stats.total_bajo_stock ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Agotados</p>
              <p className="text-2xl font-bold text-red-700">
                {stats.total_agotados ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas (Tabs) */}
      <div className="flex items-center justify-between border-b border-line">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('existencias')}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === 'existencias'
                ? 'border-b-2 border-clay text-clay'
                : 'text-muted hover:text-ink'
            }`}
          >
            Existencias por Sucursal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movimientos')}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === 'movimientos'
                ? 'border-b-2 border-clay text-clay'
                : 'text-muted hover:text-ink'
            }`}
          >
            Historial de Movimientos
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por prenda, SKU, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
          />
        </div>

        <div>
          <select
            value={selectedSucursal}
            onChange={(e) => setSelectedSucursal(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((suc) => (
              <option key={suc.id_sucursal} value={suc.id_sucursal}>
                {suc.nombre} ({suc.ciudad || 'Local'})
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'existencias' ? (
          <>
            <div>
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={soloBajoStock}
                  onChange={(e) => setSoloBajoStock(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-clay focus:ring-clay"
                />
                <span className="font-medium text-amber-700">Ver solo alertas (Bajo stock / Agotado)</span>
              </label>
            </div>
          </>
        ) : (
          <div>
            <select
              value={filtroTipoMovimiento}
              onChange={(e) => setFiltroTipoMovimiento(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Todos los tipos</option>
              <option value="entrada">Solo Entradas (+)</option>
              <option value="salida">Solo Salidas (-)</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Tabla de Existencias */}
      {activeTab === 'existencias' && (
        <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-sand/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Prenda & SKU
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Sucursal
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Color & Talla
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Precio Venta
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    Mínimo
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Acciones de Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {loading && inventario.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                      Cargando existencias de inventario...
                    </td>
                  </tr>
                ) : inventario.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                      No se encontraron registros de inventario con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  inventario.map((item) => (
                    <tr key={item.id_inventario} className="transition hover:bg-sand/20">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-ink">{item.producto_nombre}</div>
                        <div className="font-mono text-xs text-muted">
                          SKU: {item.producto_sku || 'N/A'} • {item.categoria_nombre || 'Sin categoría'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Store className="h-4 w-4 text-muted" />
                          {item.sucursal_nombre}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted capitalize">
                        {item.producto_color} • Talla {item.producto_talla}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">
                        ${Number(item.producto_precio).toLocaleString('es-MX')} MXN
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-muted">
                        <button
                          type="button"
                          onClick={() => handleOpenMinimo(item)}
                          title="Clic para cambiar stock mínimo"
                          className="rounded-lg border border-line px-2 py-0.5 text-xs font-semibold hover:bg-sand"
                        >
                          {item.stock_minimo} pzas
                        </button>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.estado_stock === 'agotado'
                              ? 'bg-red-100 text-red-800'
                              : item.estado_stock === 'bajo_stock'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-forest/10 text-forest'
                          }`}
                        >
                          {item.stock_actual} pzas
                          {item.estado_stock === 'agotado' && ' (Agotado)'}
                          {item.estado_stock === 'bajo_stock' && ' (Bajo)'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenMovimiento(item, 'entrada')}
                            className="inline-flex items-center gap-1 rounded-lg bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest/20"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" /> Entrada
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMovimiento(item, 'salida')}
                            disabled={item.stock_actual <= 0}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDownRight className="h-3.5 w-3.5" /> Salida
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Historial de Movimientos */}
      {activeTab === 'movimientos' && (
        <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-sand/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Tipo
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Prenda
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Sucursal
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    Cantidad
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Motivo
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Registrado por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {loadingMovimientos && movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                      Cargando historial de movimientos...
                    </td>
                  </tr>
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-muted">
                      No hay movimientos registrados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((mov) => (
                    <tr key={mov.id_movimiento_inventario} className="transition hover:bg-sand/20">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        <div className="flex items-center gap-1 font-mono text-xs text-ink">
                          <Clock className="h-3.5 w-3.5 text-muted" />
                          {new Date(mov.fecha).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                            mov.tipo === 'entrada'
                              ? 'bg-forest/10 text-forest'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {mov.tipo === 'entrada' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {mov.tipo}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-ink text-sm">{mov.producto_nombre}</div>
                        <div className="text-xs text-muted capitalize">
                          {mov.producto_color} • Talla {mov.producto_talla}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {mov.sucursal_nombre}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`font-mono text-sm font-bold ${
                            mov.tipo === 'entrada' ? 'text-forest' : 'text-red-600'
                          }`}
                        >
                          {mov.tipo === 'entrada' ? `+${mov.cantidad}` : `-${mov.cantidad}`}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-ink max-w-xs truncate">
                        {mov.motivo}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {mov.empleado_nombre || 'Sistema'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR MOVIMIENTO (Entrada / Salida) */}
      <Modal
        open={modalMovimientoOpen}
        onClose={() => setModalMovimientoOpen(false)}
        title="Registrar Movimiento de Inventario"
        description="Ajuste de existencias por recepción, merma o conteo físico"
      >
        <form onSubmit={handleSaveMovimiento} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Prenda & Sucursal *
            </label>
            <select
              value={formMovimiento.id_inventario}
              onChange={(e) =>
                setFormMovimiento((prev) => ({ ...prev, id_inventario: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Seleccione prenda...</option>
              {inventario.map((inv) => (
                <option key={inv.id_inventario} value={inv.id_inventario}>
                  {inv.producto_nombre} ({inv.producto_color} - Talla {inv.producto_talla}) — {inv.sucursal_nombre} [Actual: {inv.stock_actual} pzas]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Tipo de Movimiento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormMovimiento((prev) => ({
                    ...prev,
                    tipo: 'entrada',
                    motivo: MOTIVOS_ENTRADA[0],
                  }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  formMovimiento.tipo === 'entrada'
                    ? 'bg-forest text-white shadow-sm'
                    : 'border border-line bg-white text-muted hover:bg-sand'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormMovimiento((prev) => ({
                    ...prev,
                    tipo: 'salida',
                    motivo: MOTIVOS_SALIDA[0],
                  }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  formMovimiento.tipo === 'salida'
                    ? 'bg-danger text-white shadow-sm'
                    : 'border border-line bg-white text-muted hover:bg-sand'
                }`}
              >
                <ArrowDownRight className="h-4 w-4" /> Salida (-)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Cantidad de piezas *
            </label>
            <input
              type="number"
              min="1"
              value={formMovimiento.cantidad}
              onChange={(e) =>
                setFormMovimiento((prev) => ({ ...prev, cantidad: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Motivo o Justificación *
            </label>
            <input
              type="text"
              value={formMovimiento.motivo}
              onChange={(e) =>
                setFormMovimiento((prev) => ({ ...prev, motivo: e.target.value }))
              }
              required
              maxLength={100}
              placeholder="Ej. Recepción de maquila..."
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay mb-2"
            />
            {/* Botones de presets rápidos */}
            <div className="flex flex-wrap gap-1.5">
              {(formMovimiento.tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setFormMovimiento((prev) => ({ ...prev, motivo: preset }))
                    }
                    className="rounded-lg bg-sand/60 px-2 py-1 text-xs text-muted-strong hover:bg-sand"
                  >
                    {preset}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setModalMovimientoOpen(false)}
              disabled={savingMovimiento}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingMovimiento}
            >
              Confirmar Movimiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ASIGNAR PRENDA A SUCURSAL */}
      <Modal
        open={modalAsignarOpen}
        onClose={() => setModalAsignarOpen(false)}
        title="Asignar Prenda a Sucursal"
        description="Da de alta un producto del catálogo general en el inventario de una sucursal"
      >
        <form onSubmit={handleSaveAsignar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Prenda del Catálogo *
            </label>
            <select
              value={formAsignar.id_producto}
              onChange={(e) =>
                setFormAsignar((prev) => ({ ...prev, id_producto: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Seleccione una prenda...</option>
              {productos.map((prod) => (
                <option key={prod.id_producto} value={prod.id_producto}>
                  {prod.nombre} ({prod.color} - Talla {prod.talla}) [SKU: {prod.sku || 'N/A'}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Sucursal Destino *
            </label>
            <select
              value={formAsignar.id_sucursal}
              onChange={(e) =>
                setFormAsignar((prev) => ({ ...prev, id_sucursal: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            >
              <option value="">Seleccione sucursal...</option>
              {sucursales.map((suc) => (
                <option key={suc.id_sucursal} value={suc.id_sucursal}>
                  {suc.nombre} ({suc.ciudad || 'Local'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                value={formAsignar.stock_minimo}
                onChange={(e) =>
                  setFormAsignar((prev) => ({ ...prev, stock_minimo: e.target.value }))
                }
                required
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
              <p className="mt-1 text-xs text-muted">Avisar si quedan estas piezas o menos</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Stock Inicial Físico
              </label>
              <input
                type="number"
                min="0"
                value={formAsignar.stock_inicial}
                onChange={(e) =>
                  setFormAsignar((prev) => ({ ...prev, stock_inicial: e.target.value }))
                }
                required
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              />
              <p className="mt-1 text-xs text-muted">Piezas disponibles actualmente en tienda</p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setModalAsignarOpen(false)}
              disabled={savingAsignar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingAsignar}
            >
              Asignar a Sucursal
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: AJUSTAR STOCK MÍNIMO */}
      <Modal
        open={modalMinimoOpen}
        onClose={() => setModalMinimoOpen(false)}
        title="Ajustar Alerta de Stock Mínimo"
        description={
          selectedItemForMinimo
            ? `${selectedItemForMinimo.producto_nombre} (${selectedItemForMinimo.producto_color} Talla ${selectedItemForMinimo.producto_talla}) en ${selectedItemForMinimo.sucursal_nombre}`
            : ''
        }
      >
        <form onSubmit={handleSaveMinimo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Nuevo Stock Mínimo (Piezas)
            </label>
            <input
              type="number"
              min="0"
              value={nuevoStockMinimo}
              onChange={(e) => setNuevoStockMinimo(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-clay focus:ring-1 focus:ring-clay"
            />
            <p className="mt-1.5 text-xs text-muted">
              Cuando las existencias sean menores o iguales a este número, se marcará como alerta de reorden.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setModalMinimoOpen(false)}
              disabled={savingMinimo}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingMinimo}
            >
              Guardar Stock Mínimo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


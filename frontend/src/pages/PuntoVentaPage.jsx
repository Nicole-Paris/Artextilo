import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Minus,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import { cajaApi } from '../api/caja.js';
import { categoriasApi } from '../api/categorias.js';
import { empleadosApi } from '../api/empleados.js';
import { globalValuesApi } from '../api/global-values.js';
import { inventarioApi } from '../api/inventario.js';
import { pedidosApi } from '../api/pedidos.js';
import { cn } from '../lib/cn.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const FAST_CASH_BILLS = [50, 100, 200, 500, 1000];

export default function PuntoVentaPage() {
  const navigate = useNavigate();

  // Empleado y Sucursal de la sesión activa
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem('artextilo_empleado');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const idEmpleado = session?.id_empleado ? Number(session.id_empleado) : null;
  const idSucursal = session?.id_sucursal ? Number(session.id_sucursal) : null;

  // Estado de caja
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [checkingCaja, setCheckingCaja] = useState(true);
  const [modalAbrirCaja, setModalAbrirCaja] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('500');
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [errorCaja, setErrorCaja] = useState('');

  // Inventario y Catálogos
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('');

  // Parámetros de mayoreo
  const [reglasMayoreo, setReglasMayoreo] = useState({
    minimoPiezas: 12,
    porcentaje: 10,
  });

  // Carrito / Ticket de venta
  const [cart, setCart] = useState([]);

  // Descuento manual
  const [aplicarDescuentoManual, setAplicarDescuentoManual] = useState(false);
  const [descuentoManualMonto, setDescuentoManualMonto] = useState('');
  const [descuentoManualMotivo, setDescuentoManualMotivo] = useState('');
  const [descuentoAutorizaId, setDescuentoAutorizaId] = useState('');

  // Modal de Cobro
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  const [saleError, setSaleError] = useState('');

  // Modal de Ticket Exitoso
  const [ticketVenta, setTicketVenta] = useState(null);
  const [modalTicket, setModalTicket] = useState(false);

  // Escuchar cambios de sucursal en el header
  useEffect(() => {
    function handleStorageChange() {
      try {
        const raw = localStorage.getItem('artextilo_empleado');
        if (raw) setSession(JSON.parse(raw));
      } catch {}
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Verificar caja abierta del empleado activo
  const checkCaja = useCallback(async () => {
    if (!idEmpleado) {
      setCajaAbierta(null);
      setCheckingCaja(false);
      return;
    }
    setCheckingCaja(true);
    try {
      const res = await cajaApi.abierta(idEmpleado);
      setCajaAbierta(res.data || null);
    } catch {
      setCajaAbierta(null);
    } finally {
      setCheckingCaja(false);
    }
  }, [idEmpleado]);

  useEffect(() => {
    checkCaja();
  }, [checkCaja]);

  // Cargar inventario de la sucursal activa
  const loadInventario = useCallback(async () => {
    if (!idSucursal) {
      setInventario([]);
      setLoadingInventario(false);
      return;
    }
    setLoadingInventario(true);
    try {
      const [invRes, catRes, gvRes, empRes] = await Promise.all([
        inventarioApi.list({ id_sucursal: idSucursal, limite: 250 }),
        categoriasApi.list(),
        globalValuesApi.getAll().catch(() => ({ data: [] })),
        empleadosApi.list().catch(() => ({ data: [] })),
      ]);

      setInventario(invRes.data || []);
      setCategorias(catRes.data || []);
      setEmpleados((empRes.data || []).filter((e) => e.estado === 'activo'));

      const gvList = gvRes.data || [];
      const gvMin = gvList.find((v) => v.nombre === 'mayoreo_minimo_piezas');
      const gvPct = gvList.find((v) => v.nombre === 'descuento_mayoreo_porcentaje');
      setReglasMayoreo({
        minimoPiezas: gvMin ? Number(gvMin.valor) : 12,
        porcentaje: gvPct ? Number(gvPct.valor) : 10,
      });
    } catch (err) {
      console.error('Error cargando inventario POS:', err);
    } finally {
      setLoadingInventario(false);
    }
  }, [idSucursal]);

  useEffect(() => {
    loadInventario();
  }, [loadInventario]);

  // Abrir caja directamente desde POS
  async function handleAbrirCaja(e) {
    e.preventDefault();
    setErrorCaja('');
    const fondo = Number(fondoInicial);
    if (Number.isNaN(fondo) || fondo < 0) {
      setErrorCaja('Ingresa un fondo inicial válido (mayor o igual a cero).');
      return;
    }
    setAbriendoCaja(true);
    try {
      await cajaApi.abrir({
        id_empleado: idEmpleado,
        id_sucursal: idSucursal,
        fondo_inicial: fondo,
      });
      setModalAbrirCaja(false);
      await checkCaja();
    } catch (err) {
      setErrorCaja(err.message || 'Error al abrir la caja');
    } finally {
      setAbriendoCaja(false);
    }
  }

  // Filtrado de productos en inventario
  const productosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inventario.filter((item) => {
      if (categoriaSel && String(item.id_categoria) !== String(categoriaSel)) {
        return false;
      }
      if (!term) return true;
      const nombre = String(item.producto_nombre || '').toLowerCase();
      const sku = String(item.producto_sku || '').toLowerCase();
      const color = String(item.producto_color || '').toLowerCase();
      const talla = String(item.producto_talla || '').toLowerCase();
      return (
        nombre.includes(term) ||
        sku.includes(term) ||
        color.includes(term) ||
        talla.includes(term)
      );
    });
  }, [inventario, search, categoriaSel]);

  // Agregar producto al carrito
  function addToCart(producto) {
    if (Number(producto.stock_actual) <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id_producto === producto.id_producto);
      if (existing) {
        if (existing.cantidad >= Number(producto.stock_actual)) {
          return prev; // No exceder stock
        }
        return prev.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          id_inventario: producto.id_inventario,
          nombre: producto.producto_nombre,
          sku: producto.producto_sku,
          color: producto.producto_color,
          talla: producto.producto_talla,
          precio: Number(producto.producto_precio),
          stock_actual: Number(producto.stock_actual),
          cantidad: 1,
        },
      ];
    });
  }

  function updateQuantity(id_producto, newQty) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id_producto !== id_producto) return item;
          const clamped = Math.max(0, Math.min(newQty, item.stock_actual));
          return { ...item, cantidad: clamped };
        })
        .filter((item) => item.cantidad > 0),
    );
  }

  function removeFromCart(id_producto) {
    setCart((prev) => prev.filter((item) => item.id_producto !== id_producto));
  }

  function clearCart() {
    setCart([]);
    setAplicarDescuentoManual(false);
    setDescuentoManualMonto('');
    setDescuentoManualMotivo('');
  }

  // Cálculos de totales
  const totalPiezas = useMemo(
    () => cart.reduce((acc, item) => acc + item.cantidad, 0),
    [cart],
  );

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.cantidad * item.precio, 0),
    [cart],
  );

  const esMayoreo = totalPiezas >= reglasMayoreo.minimoPiezas;

  const descuentoCalculado = useMemo(() => {
    if (aplicarDescuentoManual && Number(descuentoManualMonto) > 0) {
      return Math.min(Number(descuentoManualMonto), subtotal);
    }
    if (esMayoreo) {
      return Math.round((subtotal * reglasMayoreo.porcentaje) / 100);
    }
    return 0;
  }, [
    subtotal,
    esMayoreo,
    reglasMayoreo.porcentaje,
    aplicarDescuentoManual,
    descuentoManualMonto,
  ]);

  const total = Math.max(0, subtotal - descuentoCalculado);

  // Abrir modal de cobro
  function abrirCobro() {
    if (cart.length === 0 || !cajaAbierta) return;
    setMontoRecibido(String(total));
    setReferenciaPago('');
    setMetodoPago('efectivo');
    setSaleError('');
    setModalCobro(true);
  }

  // Cálculo de cambio en efectivo
  const numRecibido = Number(montoRecibido) || 0;
  const cambio = metodoPago === 'efectivo' ? Math.max(0, numRecibido - total) : 0;
  const saldoFaltante = metodoPago === 'efectivo' ? Math.max(0, total - numRecibido) : 0;

  // Confirmar y registrar venta
  async function handleFinalizarVenta(e) {
    e.preventDefault();
    setSaleError('');

    if (cart.length === 0) {
      setSaleError('El ticket está vacío.');
      return;
    }

    if (!cajaAbierta) {
      setSaleError('No hay una caja abierta para registrar esta venta.');
      return;
    }

    if (metodoPago === 'efectivo' && numRecibido < total) {
      setSaleError(`El monto recibido es insuficiente. Faltan ${formatMoney(saldoFaltante)}.`);
      return;
    }

    if (metodoPago === 'transferencia' && !referenciaPago.trim()) {
      setSaleError('La referencia es obligatoria para pagos por transferencia.');
      return;
    }

    setProcessingSale(true);

    try {
      const payload = {
        es_venta_directa: true,
        id_cliente: null,
        id_empleado: idEmpleado,
        id_sucursal: idSucursal,
        origen: 'presencial',
        condicion_pago: 'contado',
        forma_entrega: 'en_local',
        costo_envio: 0,
        descuento_tipo: aplicarDescuentoManual
          ? 'manual'
          : esMayoreo
            ? 'mayoreo'
            : 'ninguno',
        descuento_monto: descuentoCalculado,
        descuento_motivo: aplicarDescuentoManual ? descuentoManualMotivo.trim() : null,
        id_descuento_autoriza: aplicarDescuentoManual
          ? Number(descuentoAutorizaId || idEmpleado)
          : null,
        productos: cart.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
        })),
        pago_inicial: {
          monto: total,
          metodo_pago: metodoPago,
          referencia: referenciaPago.trim() || null,
          id_empleado: idEmpleado,
        },
      };

      const res = await pedidosApi.create(payload);
      const pedidoCreado = res.data;

      // Armar ticket con datos enriquecidos para imprimir
      const ticketInfo = {
        ...pedidoCreado,
        articulos: [...cart],
        subtotal,
        descuento: descuentoCalculado,
        total,
        metodoPago,
        montoRecibido: metodoPago === 'efectivo' ? numRecibido : total,
        cambio,
        clienteNombre: 'Público en general',
        cajeroNombre: `${session?.nombre || ''} ${session?.apellido_paterno || ''}`.trim() || 'Cajero en turno',
        sucursalNombre: session?.sucursal || 'Sucursal Centro',
        fecha: new Date(),
      };

      setTicketVenta(ticketInfo);
      setModalCobro(false);
      clearCart();
      setModalTicket(true);

      // Recargar inventario para actualizar stocks
      loadInventario();
    } catch (err) {
      setSaleError(err.message || 'Error al procesar la venta');
    } finally {
      setProcessingSale(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra superior de Estado y Turno */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/10 text-forest">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              Punto de Venta
            </h1>
            <p className="text-xs text-muted">
              Ventas directas de mostrador y cobro inmediato · {session?.sucursal || 'Sin sucursal asignada'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {checkingCaja ? (
            <span className="text-xs text-muted animate-pulse">
              Verificando caja…
            </span>
          ) : cajaAbierta ? (
            <div className="flex items-center gap-2 rounded-xl bg-forest/10 px-3 py-1.5 text-xs font-semibold text-forest">
              <CheckCircle2 className="h-4 w-4" />
              <span>Caja abierta (Corte #{cajaAbierta.id_corte_caja})</span>
              <Link
                to="/caja"
                className="ml-1 underline opacity-80 hover:opacity-100"
              >
                Ver caja
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">
              <AlertCircle className="h-4 w-4" />
              <span>Caja cerrada en este turno</span>
              <Button
                size="sm"
                variant="primary"
                className="h-7 text-xs bg-danger hover:bg-danger-strong border-none text-white px-2.5"
                onClick={() => setModalAbrirCaja(true)}
              >
                Abrir caja
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              checkCaja();
              loadInventario();
            }}
            title="Recargar inventario y estado de caja"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerta si la caja está cerrada */}
      {!checkingCaja && !cajaAbierta && (
        <Alert variant="warning">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink">
                Se requiere turno de caja abierto para registrar ventas
              </p>
              <p className="text-xs text-muted mt-0.5">
                Por control interno, no se pueden realizar ventas en mostrador sin que el cajero tenga una caja activa donde ingresar los cobros.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalAbrirCaja(true)}
              className="shrink-0"
            >
              <Wallet className="mr-1.5 h-4 w-4" />
              Abrir caja de turno
            </Button>
          </div>
        </Alert>
      )}

      {/* Grid Principal: Catálogo a la izquierda, Ticket a la derecha */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Catálogo de Productos (7 columnas en desktop) */}
        <section className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Barra de búsqueda y categorías */}
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-soft space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por prenda, modelo, código SKU o color…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(inputClass(), 'pl-10')}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Chips de Categorías */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCategoriaSel('')}
                className={cn(
                  'rounded-xl px-3 py-1.5 font-semibold transition whitespace-nowrap',
                  categoriaSel === ''
                    ? 'bg-clay text-white shadow-sm'
                    : 'bg-sand/80 text-muted hover:bg-sand hover:text-ink',
                )}
              >
                Todas las prendas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id_categoria}
                  type="button"
                  onClick={() =>
                    setCategoriaSel(
                      String(cat.id_categoria) === String(categoriaSel)
                        ? ''
                        : String(cat.id_categoria),
                    )
                  }
                  className={cn(
                    'rounded-xl px-3 py-1.5 font-semibold transition whitespace-nowrap',
                    String(categoriaSel) === String(cat.id_categoria)
                      ? 'bg-clay text-white shadow-sm'
                      : 'bg-sand/80 text-muted hover:bg-sand hover:text-ink',
                  )}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Productos */}
          {loadingInventario ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl bg-sand/80 border border-line"
                />
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-muted">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted/40 mb-2" />
              <p className="font-semibold text-ink">No hay productos disponibles</p>
              <p className="text-xs text-muted mt-1">
                {inventario.length === 0
                  ? 'No hay stock asignado a esta sucursal en el módulo de Inventario.'
                  : 'Ningún producto coincide con el filtro de búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {productosFiltrados.map((item) => {
                const stockNum = Number(item.stock_actual);
                const enCarrito = cart.find((c) => c.id_producto === item.id_producto);
                const cantEnCarrito = enCarrito ? enCarrito.cantidad : 0;
                const sinStock = stockNum <= 0;
                const sinMasStock = cantEnCarrito >= stockNum;

                return (
                  <button
                    key={item.id_inventario}
                    type="button"
                    disabled={sinStock || sinMasStock}
                    onClick={() => addToCart(item)}
                    className={cn(
                      'group relative flex flex-col justify-between rounded-2xl border text-left p-3.5 transition shadow-sm',
                      sinStock
                        ? 'border-line/60 bg-sand/30 opacity-60 cursor-not-allowed'
                        : sinMasStock
                          ? 'border-clay/40 bg-sand/50 cursor-not-allowed'
                          : 'border-line bg-paper hover:border-clay hover:shadow-md cursor-pointer active:scale-[0.98]',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-muted">
                        <span className="font-mono">{item.producto_sku || 'S/N'}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-bold text-[10px]',
                            sinStock
                              ? 'bg-danger/10 text-danger'
                              : stockNum <= 3
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-forest/10 text-forest',
                          )}
                        >
                          {sinStock ? 'Agotado' : `${stockNum} disp.`}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-ink mt-1.5 line-clamp-2 group-hover:text-clay">
                        {item.producto_nombre}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.producto_color && (
                          <span className="rounded bg-sand px-1.5 py-0.5 text-[10px] text-muted font-medium">
                            {item.producto_color}
                          </span>
                        )}
                        {item.producto_talla && (
                          <span className="rounded bg-sand px-1.5 py-0.5 text-[10px] text-muted font-bold">
                            Talla {item.producto_talla}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/60">
                      <span className="font-display font-bold text-base text-ink">
                        {formatMoney(item.producto_precio)}
                      </span>

                      {cantEnCarrito > 0 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clay text-white text-xs font-bold shadow-sm">
                          {cantEnCarrito}
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand text-ink group-hover:bg-clay group-hover:text-white transition">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Ticket de Venta / Carrito (5 columnas en desktop) */}
        <section className="lg:col-span-5 xl:col-span-4 sticky top-4">
          <div className="rounded-2xl border border-line bg-paper shadow-soft overflow-hidden">
            {/* Header del Ticket */}
            <div className="border-b border-line p-4 bg-sand/30 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-clay" />
                  Ticket de Venta
                </h2>
                <p className="text-xs text-muted">
                  {totalPiezas} {totalPiezas === 1 ? 'prenda' : 'prendas'} en total
                </p>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold text-danger hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            {/* Modalidad de venta */}
            <div className="border-b border-line px-4 py-2 bg-sand/30 flex items-center justify-between text-xs">
              <span className="text-muted">Modalidad de venta</span>
              <span className="font-semibold text-ink">Mostrador · Público en general</span>
            </div>

            {/* Lista de Artículos en el Carrito */}
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <ShoppingBag className="mx-auto h-8 w-8 text-muted/30 mb-2" />
                  <p className="text-xs font-semibold text-ink">El ticket está vacío</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Toca las prendas del catálogo para agregarlas.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id_producto}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line/80 bg-paper p-2 text-xs shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-muted">
                        {item.color} · Talla {item.talla} · {formatMoney(item.precio)}
                      </p>
                    </div>

                    {/* Stepper de cantidad */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id_producto, item.cantidad - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-sand hover:bg-line text-ink"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="w-6 text-center font-bold text-xs">
                        {item.cantidad}
                      </span>

                      <button
                        type="button"
                        disabled={item.cantidad >= item.stock_actual}
                        onClick={() => updateQuantity(item.id_producto, item.cantidad + 1)}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-lg border border-line',
                          item.cantidad >= item.stock_actual
                            ? 'bg-sand/40 opacity-40 cursor-not-allowed text-muted'
                            : 'bg-sand hover:bg-line text-ink',
                        )}
                        title={
                          item.cantidad >= item.stock_actual
                            ? `Stock máximo disponible (${item.stock_actual})`
                            : 'Agregar otra pieza'
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id_producto)}
                        className="ml-1 p-1 text-muted hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="w-16 text-right font-bold text-ink shrink-0">
                      {formatMoney(item.cantidad * item.precio)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notificación de mayoreo */}
            {esMayoreo && !aplicarDescuentoManual && (
              <div className="mx-3 my-1 rounded-xl bg-forest/10 border border-forest/20 p-2 flex items-center gap-2 text-xs text-forest font-semibold">
                <Percent className="h-4 w-4 shrink-0" />
                <span>¡Mayoreo aplicado! ({reglasMayoreo.porcentaje}% de descuento por {totalPiezas} piezas)</span>
              </div>
            )}

            {/* Descuento manual */}
            <div className="border-t border-line px-4 py-2.5 bg-sand/20">
              <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aplicarDescuentoManual}
                  onChange={(e) => setAplicarDescuentoManual(e.target.checked)}
                  className="rounded border-line text-clay focus:ring-clay"
                />
                <span>¿Aplicar descuento personalizado?</span>
              </label>

              {aplicarDescuentoManual && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted">Monto a descontar ($):</span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={descuentoManualMonto}
                      onChange={(e) => setDescuentoManualMonto(e.target.value)}
                      placeholder="0.00"
                      className={cn(inputClass(), 'h-8 text-xs mt-0.5')}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted">Motivo del descuento:</span>
                    <input
                      type="text"
                      value={descuentoManualMotivo}
                      onChange={(e) => setDescuentoManualMotivo(e.target.value)}
                      placeholder="Ej. Promoción especial"
                      className={cn(inputClass(), 'h-8 text-xs mt-0.5')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resumen de Totales y Botón de Cobro */}
            <div className="border-t border-line p-4 bg-sand/40 space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>

              {descuentoCalculado > 0 && (
                <div className="flex justify-between text-xs font-semibold text-danger">
                  <span>Descuento</span>
                  <span>-{formatMoney(descuentoCalculado)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-line font-display text-ink">
                <span className="text-sm font-bold">TOTAL</span>
                <span className="text-2xl font-black text-clay">
                  {formatMoney(total)}
                </span>
              </div>

              <Button
                size="lg"
                variant="primary"
                disabled={cart.length === 0 || !cajaAbierta}
                onClick={abrirCobro}
                className="w-full mt-2 h-12 text-base font-bold shadow-md"
              >
                Cobrar {formatMoney(total)}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal para Abrir Caja desde Punto de Venta */}
      <Modal
        open={modalAbrirCaja}
        onClose={() => !abriendoCaja && setModalAbrirCaja(false)}
        title="Abrir turno de caja"
        description="Ingresa el fondo inicial en efectivo para comenzar a registrar ventas."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalAbrirCaja(false)}
              disabled={abriendoCaja}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="form-abrir-caja-pos"
              loading={abriendoCaja}
            >
              Confirmar y Abrir Caja
            </Button>
          </>
        }
      >
        <form id="form-abrir-caja-pos" onSubmit={handleAbrirCaja} className="space-y-4">
          {errorCaja && <Alert variant="danger">{errorCaja}</Alert>}

          <div className="rounded-xl bg-sand/60 p-3 text-xs space-y-1">
            <p>
              <strong>Cajero:</strong> {session?.nombre} {session?.apellido_paterno}
            </p>
            <p>
              <strong>Sucursal:</strong> {session?.sucursal || 'Sucursal Centro'}
            </p>
          </div>

          <Field label="Fondo inicial en caja (Efectivo)" htmlFor="pos-fondo-inicial" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted">$</span>
              <input
                id="pos-fondo-inicial"
                type="number"
                min="0"
                step="any"
                className={cn(inputClass(), 'pl-7 font-bold text-lg')}
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                placeholder="500"
                required
                autoFocus
              />
            </div>
          </Field>
        </form>
      </Modal>

      {/* Modal de Cobro */}
      <Modal
        open={modalCobro}
        onClose={() => !processingSale && setModalCobro(false)}
        title="Cobrar Venta"
        description="Selecciona la forma de pago para liquidar y entregar la venta al instante."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalCobro(false)}
              disabled={processingSale}
            >
              Regresar al ticket
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="form-cobro-pos"
              loading={processingSale}
              disabled={metodoPago === 'efectivo' && numRecibido < total}
            >
              Confirmar Venta y Emitir Ticket
            </Button>
          </>
        }
      >
        <form id="form-cobro-pos" onSubmit={handleFinalizarVenta} className="space-y-4">
          {saleError && <Alert variant="danger">{saleError}</Alert>}

          {/* Gran Total */}
          <div className="rounded-2xl bg-sand/60 border border-line p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-muted font-bold">
              Total a Pagar
            </span>
            <p className="font-display text-3xl font-black text-clay mt-0.5">
              {formatMoney(total)}
            </p>
            <p className="text-xs text-muted mt-1">
              {totalPiezas} {totalPiezas === 1 ? 'pieza' : 'piezas'} · Venta a Público en general
            </p>
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo' },
                { id: 'tarjeta', label: 'Tarjeta' },
                { id: 'transferencia', label: 'Transferencia' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMetodoPago(m.id);
                    if (m.id !== 'efectivo') setMontoRecibido(String(total));
                  }}
                  className={cn(
                    'rounded-xl border py-2.5 text-xs font-bold transition text-center',
                    metodoPago === m.id
                      ? 'border-clay bg-clay text-white shadow-sm'
                      : 'border-line bg-sand/40 text-muted hover:bg-sand hover:text-ink',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desglose según método */}
          {metodoPago === 'efectivo' ? (
            <div className="space-y-3 pt-2">
              <Field label="Monto recibido en efectivo" htmlFor="monto-recibido" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted">$</span>
                  <input
                    id="monto-recibido"
                    type="number"
                    min="0"
                    step="any"
                    className={cn(inputClass(), 'pl-7 text-xl font-bold')}
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </Field>

              {/* Botones de billetes rápidos */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMontoRecibido(String(total))}
                  className="rounded-lg border border-line bg-sand px-2.5 py-1 text-xs font-semibold hover:bg-line text-ink"
                >
                  Exacto (${total})
                </button>
                {FAST_CASH_BILLS.filter((b) => b >= total || b === 50).map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setMontoRecibido(String(bill))}
                    className="rounded-lg border border-line bg-sand px-2.5 py-1 text-xs font-semibold hover:bg-line text-ink"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Cálculo de cambio */}
              <div
                className={cn(
                  'rounded-xl p-3 border flex items-center justify-between',
                  saldoFaltante > 0
                    ? 'bg-danger/10 border-danger/20 text-danger'
                    : 'bg-forest/10 border-forest/20 text-forest',
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">
                  {saldoFaltante > 0 ? 'Falta por cubrir:' : 'Cambio a entregar:'}
                </span>
                <span className="text-xl font-black">
                  {saldoFaltante > 0
                    ? formatMoney(saldoFaltante)
                    : formatMoney(cambio)}
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Field
                label={
                  metodoPago === 'transferencia'
                    ? 'Número de referencia / rastreo (Obligatorio)'
                    : 'Referencia / últimos 4 dígitos (Opcional)'
                }
                htmlFor="referencia-pago"
                required={metodoPago === 'transferencia'}
              >
                <input
                  id="referencia-pago"
                  type="text"
                  className={inputClass()}
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder={
                    metodoPago === 'transferencia'
                      ? 'Ej. 0987654321'
                      : 'Ej. 1234'
                  }
                  required={metodoPago === 'transferencia'}
                />
              </Field>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal de Ticket de Venta / Comprobante */}
      <Modal
        open={modalTicket}
        onClose={() => setModalTicket(false)}
        title="Comprobante de Venta"
        description="Venta completada y stock descontado satisfactoriamente."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setModalTicket(false);
                clearCart();
              }}
            >
              Cerrar y Nueva Venta
            </Button>
            <Button
              variant="primary"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </Button>
          </>
        }
      >
        {ticketVenta && (
          <div
            id="pos-ticket-print"
            className="rounded-2xl border border-line bg-paper p-6 font-mono text-xs shadow-sm max-w-sm mx-auto space-y-4 print:border-none print:shadow-none print:p-0"
          >
            {/* Cabecera */}
            <div className="text-center space-y-1">
              <p className="font-display font-extrabold text-base tracking-wider text-ink uppercase">
                ARTEXTILO
              </p>
              <p className="text-[10px] text-muted tracking-widest uppercase">
                Hilando con amor
              </p>
              <p className="text-[11px] font-semibold text-ink mt-1">
                {ticketVenta.sucursalNombre}
              </p>
              <p className="text-[10px] text-muted">
                {formatDateTime(ticketVenta.fecha)}
              </p>
              <p className="text-xs font-bold text-ink mt-1">
                FOLIO: {ticketVenta.folio}
              </p>
            </div>

            <div className="border-t border-dashed border-line my-2" />

            {/* Datos de cliente y cajero */}
            <div className="text-[11px] space-y-0.5">
              <p>
                <span className="text-muted">Cajero:</span> {ticketVenta.cajeroNombre}
              </p>
              <p>
                <span className="text-muted">Cliente:</span> {ticketVenta.clienteNombre}
              </p>
            </div>

            <div className="border-t border-dashed border-line my-2" />

            {/* Tabla de artículos */}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="text-left py-1 font-semibold">Cant.</th>
                  <th className="text-left py-1 font-semibold">Descripción</th>
                  <th className="text-right py-1 font-semibold">P.U.</th>
                  <th className="text-right py-1 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {ticketVenta.articulos.map((art, idx) => (
                  <tr key={idx}>
                    <td className="py-1 font-bold">{art.cantidad}</td>
                    <td className="py-1">
                      {art.nombre} ({art.talla}/{art.color})
                    </td>
                    <td className="py-1 text-right">{formatMoney(art.precio)}</td>
                    <td className="py-1 text-right font-bold">
                      {formatMoney(art.cantidad * art.precio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-line my-2" />

            {/* Totales */}
            <div className="space-y-1 text-right text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal:</span>
                <span>{formatMoney(ticketVenta.subtotal)}</span>
              </div>
              {ticketVenta.descuento > 0 && (
                <div className="flex justify-between font-semibold text-danger">
                  <span>Descuento:</span>
                  <span>-{formatMoney(ticketVenta.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-ink pt-1 border-t border-line">
                <span>TOTAL:</span>
                <span>{formatMoney(ticketVenta.total)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-line my-2" />

            {/* Forma de pago */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted">Método de pago:</span>
                <span className="font-bold capitalize">{ticketVenta.metodoPago}</span>
              </div>
              {ticketVenta.metodoPago === 'efectivo' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Pago con:</span>
                    <span>{formatMoney(ticketVenta.montoRecibido)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-muted">Cambio:</span>
                    <span>{formatMoney(ticketVenta.cambio)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center pt-3 border-t border-dashed border-line text-[10px] text-muted">
              <p>¡Gracias por su compra!</p>
              <p className="mt-0.5">Conserve este ticket para cualquier cambio o aclaración.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

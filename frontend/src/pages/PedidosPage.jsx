import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Wallet,
  UserPlus,
  User,
  Package,
} from 'lucide-react';
import DevolucionesPage from './DevolucionesPage.jsx';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { cajaApi } from '../api/caja.js';
import { clientesApi } from '../api/clientes.js';
import { empleadosApi } from '../api/empleados.js';
import { inventarioApi } from '../api/inventario.js';
import { pedidosApi } from '../api/pedidos.js';
import { sucursalesApi } from '../api/sucursales.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';
import { formatDateTime, formatMoney } from '../lib/format.js';
import { isCashier, isSupervisorOrAdmin } from '../lib/roles.js';

const MAYOREO_MINIMO = 12;
const MAYOREO_PORCENTAJE = 10;
const ANTICIPO_PORCENTAJE = 50;

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const ESTADOS_PAGO = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'liquidado', label: 'Liquidado' },
];

function getEstadosPosibles(pedido) {
  if (!pedido || ['cancelado', 'entregado'].includes(pedido.estado)) {
    return [];
  }

  const totalPagado = Number(pedido.total_pagado || 0);
  const anticipoRequerido = Number(pedido.anticipo_requerido || 0);
  const saldoPendiente = Number(
    pedido.saldo_pendiente ?? (Number(pedido.total || 0) - totalPagado),
  );

  const tieneAnticipo = totalPagado >= anticipoRequerido;
  const estaLiquidado = saldoPendiente <= 0;

  const posibles = [];

  if (pedido.estado === 'pendiente') {
    if (tieneAnticipo) {
      posibles.push({ value: 'en_proceso', label: 'En proceso' });
      posibles.push({ value: 'terminado', label: 'Terminado' });
    }
    if (estaLiquidado) {
      posibles.push({ value: 'entregado', label: 'Entregado' });
    }
  } else if (pedido.estado === 'en_proceso') {
    posibles.push({ value: 'terminado', label: 'Terminado' });
    if (estaLiquidado) {
      posibles.push({ value: 'entregado', label: 'Entregado' });
    }
  } else if (pedido.estado === 'terminado') {
    if (estaLiquidado) {
      posibles.push({ value: 'entregado', label: 'Entregado' });
    }
  }

  return posibles;
}

const ORIGENES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
];

const FORMAS_ENTREGA = [
  { value: 'en_local', label: 'En local' },
  { value: 'a_domicilio', label: 'A domicilio' },
  { value: 'por_paqueteria', label: 'Por paquetería' },
];

const EMPTY_FORM = {
  id_cliente: '',
  cliente_texto: '',
  id_empleado: '',
  id_sucursal: '',
  origen: 'presencial',
  condicion_pago: 'contado',
  forma_entrega: 'en_local',
  direccion_entrega: '',
  costo_envio: 0,
  fecha_entrega_prometida: '',
  descuento_tipo: 'ninguno',
  descuento_monto: 0,
  descuento_motivo: '',
  id_descuento_autoriza: '',
  observaciones: '',
  productos: [],
  servicios: [],
  pago_inicial: {
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    id_empleado: '',
  },
};

function formatClienteOption(cliente) {
  const fullName = [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();
  return cliente.telefono ? `${fullName} · ${cliente.telefono}` : fullName;
}

function formatProductoOption(item) {
  const variants = [item.producto_color, item.producto_talla].filter(Boolean).join(' · ');
  const stockInfo =
    Number(item.stock_actual) > 0
      ? `stock ${item.stock_actual}`
      : 'sin stock (por encargo)';
  return variants
    ? `${item.producto_nombre} · ${variants} · ${stockInfo}`
    : `${item.producto_nombre} · ${stockInfo}`;
}

function estadoLabel(estado) {
  return ESTADOS.find((item) => item.value === estado)?.label ?? estado;
}

function pagoLabel(estado) {
  return ESTADOS_PAGO.find((item) => item.value === estado)?.label ?? estado;
}

function EstadoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-amber-100 text-amber-800',
    en_proceso: 'bg-sky-100 text-sky-800',
    terminado: 'bg-violet-100 text-violet-800',
    entregado: 'bg-forest/10 text-forest',
    cancelado: 'bg-danger/10 text-danger-strong',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        styles[estado] ?? 'bg-sand text-muted-strong',
      )}
    >
      {estadoLabel(estado)}
    </span>
  );
}

function PagoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-danger/10 text-danger-strong',
    parcial: 'bg-amber-100 text-amber-800',
    liquidado: 'bg-forest/10 text-forest',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        styles[estado] ?? 'bg-sand text-muted-strong',
      )}
    >
      {pagoLabel(estado)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-clay">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}

function TotalsPanel({ totals }) {
  return (
    <div className="rounded-2xl border border-line bg-sand/60 p-4">
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Subtotal productos</dt>
          <dd className="font-semibold text-ink">{formatMoney(totals.subtotalProductos)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Subtotal servicios</dt>
          <dd className="font-semibold text-ink">{formatMoney(totals.subtotalServicios)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">
            Descuento{' '}
            {totals.descuentoTipo === 'mayoreo'
              ? '(Mayoreo 10%)'
              : totals.descuentoTipo === 'manual'
                ? '(Personalizado)'
                : ''}
          </dt>
          <dd className="font-semibold text-danger">-{formatMoney(totals.descuento)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Costo de envío</dt>
          <dd className="font-semibold text-ink">{formatMoney(totals.costoEnvio)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="font-display text-xl font-semibold text-ink">
            {formatMoney(totals.total)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Anticipo requerido (50%)</dt>
          <dd className="font-semibold text-ink">{formatMoney(totals.anticipo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Saldo después del pago inicial</dt>
          <dd className="font-semibold text-ink">{formatMoney(totals.saldoDespues)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const empleadoActual = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('artextilo_empleado') || '{}');
    } catch {
      return {};
    }
  }, []);

  const canDevoluciones = isSupervisorOrAdmin(empleadoActual);
  const rawTab = searchParams.get('tab') === 'devoluciones' ? 'devoluciones' : 'pedidos';
  const activeTab = canDevoluciones && rawTab === 'devoluciones' ? 'devoluciones' : 'pedidos';

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'devoluciones') {
      next.set('tab', 'devoluciones');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    en_proceso: 0,
    terminados: 0,
    entregados: 0,
    cancelados: 0,
    total_ventas: 0,
    saldo_por_cobrar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPago, setFiltroPago] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [checkingCaja, setCheckingCaja] = useState(false);
  const [createPagoTouched, setCreatePagoTouched] = useState({});
  const [aplicarDescuentoManual, setAplicarDescuentoManual] = useState(false);

  // Búsqueda y selección interactiva de cliente
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);

  // Búsqueda interactiva de productos por fila
  const [activeProductoDropdown, setActiveProductoDropdown] = useState(null);

  // Registro rápido de cliente desde nuevo pedido
  const [quickClienteModalOpen, setQuickClienteModalOpen] = useState(false);
  const [quickClienteForm, setQuickClienteForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    telefono: '',
    direccion: '',
    correo: '',
    es_frecuente: false,
  });
  const [quickClienteLoading, setQuickClienteLoading] = useState(false);
  const [quickClienteError, setQuickClienteError] = useState('');

  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pagoTarget, setPagoTarget] = useState(null);
  const [pagoCaja, setPagoCaja] = useState(null);
  const [pagoForm, setPagoForm] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    id_empleado: '',
    concepto_pago: 'anticipo',
  });
  const [pagoTouched, setPagoTouched] = useState({});
  const [pagoConceptoTouched, setPagoConceptoTouched] = useState(false);
  const [savingPago, setSavingPago] = useState(false);

  const [estadoTarget, setEstadoTarget] = useState(null);
  const [estadoForm, setEstadoForm] = useState({
    estado: '',
    id_empleado_entrega: '',
    observaciones: '',
  });
  const [savingEstado, setSavingEstado] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState({
    motivo: '',
    monto_devolucion: 0,
    metodo_devolucion: 'efectivo',
    id_empleado_autoriza: '',
    id_empleado_cancela: '',
  });
  const [savingCancel, setSavingCancel] = useState(false);

  const resolveDefaultContext = useCallback(() => {
    let sessionEmpleado = null;
    try {
      const raw = localStorage.getItem('artextilo_empleado');
      if (raw) sessionEmpleado = JSON.parse(raw);
    } catch {}

    const empleado =
      (sessionEmpleado?.id_empleado &&
        empleados.find((item) => Number(item.id_empleado) === Number(sessionEmpleado.id_empleado))) ||
      sessionEmpleado ||
      empleados.find((item) => isCashier(item)) ||
      empleados[0];

    const idEmpleado = empleado?.id_empleado ? String(empleado.id_empleado) : '';
    const idSucursal = empleado?.id_sucursal
      ? String(empleado.id_sucursal)
      : sucursales[0]?.id_sucursal
        ? String(sucursales[0].id_sucursal)
        : '';

    return { idEmpleado, idSucursal };
  }, [empleados, sucursales]);

  const matchClienteFromText = useCallback(
    (texto) => {
      const normalized = texto.trim().toLowerCase();
      if (!normalized) return null;

      return (
        clientes.find((cliente) => {
          const etiqueta = formatClienteOption(cliente).toLowerCase();
          const nombreCompleto = [
            cliente.nombre,
            cliente.apellido_paterno,
            cliente.apellido_materno,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          const telefono = String(cliente.telefono || '').toLowerCase();

          return (
            etiqueta === normalized ||
            nombreCompleto === normalized ||
            (telefono && telefono === normalized)
          );
        }) ?? null
      );
    },
    [clientes],
  );

  const productosDisponibles = useMemo(
    () =>
      inventario.filter(
        (item) => !item.producto_estado || item.producto_estado === 'activo',
      ),
    [inventario],
  );

  const matchProductoFromText = useCallback(
    (texto) => {
      const normalized = texto.trim().toLowerCase();
      if (!normalized) return null;

      return (
        productosDisponibles.find((item) => {
          const etiqueta = formatProductoOption(item).toLowerCase();
          const nombre = String(item.producto_nombre || '').toLowerCase();
          const sku = String(item.producto_sku || '').toLowerCase();
          return etiqueta === normalized || nombre === normalized || (sku && sku === normalized);
        }) ?? null
      );
    },
    [productosDisponibles],
  );

  const clientesFiltrados = useMemo(() => {
    const q = (createForm.cliente_texto || '').trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter((c) => {
        const full = `${c.nombre || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
        const tel = String(c.telefono || '').toLowerCase();
        return full.includes(q) || tel.includes(q);
      })
      .slice(0, 8);
  }, [clientes, createForm.cliente_texto]);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters = { es_venta_directa: 0 };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (filtroEstado) filters.estado = filtroEstado;
      if (filtroPago) filters.estado_pago = filtroPago;

      const [pedidosRes, statsRes] = await Promise.all([
        pedidosApi.list(filters),
        pedidosApi.stats({ es_venta_directa: 0 }),
      ]);

      setPedidos(pedidosRes.data || []);
      setStats(statsRes.data || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filtroEstado, filtroPago]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [clientesRes, empleadosRes, sucursalesRes] = await Promise.all([
          clientesApi.list(),
          empleadosApi.list(),
          sucursalesApi.list(),
        ]);
        setClientes(clientesRes.data || []);
        setEmpleados((empleadosRes.data || []).filter((item) => item.estado === 'activo'));
        setSucursales(sucursalesRes.data || []);
      } catch (requestError) {
        console.error('Error al cargar catálogos de pedidos:', requestError);
      }
    }

    loadCatalogs();
  }, []);

  useEffect(() => {
    if (!createOpen) return;

    const { idEmpleado, idSucursal } = resolveDefaultContext();
    setCreateForm((current) => {
      const nextEmpleado = current.id_empleado || idEmpleado;
      const nextSucursal = current.id_sucursal || idSucursal;
      const nextPagoEmpleado = current.pago_inicial.id_empleado || nextEmpleado;

      if (
        nextEmpleado === current.id_empleado &&
        nextSucursal === current.id_sucursal &&
        nextPagoEmpleado === current.pago_inicial.id_empleado
      ) {
        return current;
      }

      return {
        ...current,
        id_empleado: nextEmpleado,
        id_sucursal: nextSucursal,
        pago_inicial: {
          ...current.pago_inicial,
          id_empleado: nextPagoEmpleado,
        },
      };
    });
  }, [createOpen, resolveDefaultContext]);

  useEffect(() => {
    if (!createOpen || !createForm.id_sucursal) {
      setInventario([]);
      return undefined;
    }

    let active = true;

    async function loadInventario() {
      try {
        const response = await inventarioApi.list({ id_sucursal: createForm.id_sucursal });
        if (active) setInventario(response.data || []);
      } catch (requestError) {
        console.error('Error al cargar inventario:', requestError);
        if (active) setInventario([]);
      }
    }

    loadInventario();
    return () => {
      active = false;
    };
  }, [createOpen, createForm.id_sucursal]);

  useEffect(() => {
    const idEmpleadoCaja =
      createForm.pago_inicial.id_empleado || createForm.id_empleado;

    if (!createOpen || !idEmpleadoCaja) {
      setCajaAbierta(null);
      return undefined;
    }

    let active = true;
    setCajaAbierta(null);
    setCheckingCaja(true);

    cajaApi
      .abierta(idEmpleadoCaja)
      .then((response) => {
        if (active) setCajaAbierta(response.data);
      })
      .catch(() => {
        if (active) setCajaAbierta(null);
      })
      .finally(() => {
        if (active) setCheckingCaja(false);
      });

    return () => {
      active = false;
    };
  }, [createOpen, createForm.id_empleado, createForm.pago_inicial.id_empleado]);

  useEffect(() => {
    if (!pagoTarget) {
      setPagoCaja(null);
      return undefined;
    }

    const defaultId = resolveDefaultContext().idEmpleado || pagoTarget.id_empleado;
    const idEmpleadoCaja = pagoForm.id_empleado || defaultId;
    if (!idEmpleadoCaja) {
      setPagoCaja(null);
      return undefined;
    }

    let active = true;
    setPagoCaja(null);

    cajaApi
      .abierta(idEmpleadoCaja)
      .then((response) => {
        if (active) setPagoCaja(response.data);
      })
      .catch(() => {
        if (active) setPagoCaja(null);
      });

    return () => {
      active = false;
    };
  }, [pagoTarget, pagoForm.id_empleado, resolveDefaultContext]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4500);
    return () => clearTimeout(timer);
  }, [success]);

  const totals = useMemo(() => {
    const productosDetalle = createForm.productos.map((row) => {
      // Únicamente vincular producto si el usuario lo seleccionó explícitamente por id_producto
      const matchedItem = row.id_producto
        ? productosDisponibles.find(
            (inventarioItem) =>
              String(inventarioItem.id_producto) === String(row.id_producto),
          ) ?? null
        : null;

      const precio = Number(matchedItem?.producto_precio || 0);
      const cantidad = Number(row.cantidad || 0);

      return {
        ...row,
        item: matchedItem,
        precio,
        subtotal: precio * cantidad,
      };
    });

    const subtotalProductos = productosDetalle.reduce(
      (total, item) => total + item.subtotal,
      0,
    );
    const totalPiezas = productosDetalle.reduce(
      (total, item) => total + Number(item.cantidad || 0),
      0,
    );
    const subtotalServicios = createForm.servicios.reduce(
      (total, servicio) =>
        total + Number(servicio.cantidad || 0) * Number(servicio.precio || 0),
      0,
    );
    const subtotal = subtotalProductos + subtotalServicios;

    const esMayoreo = totalPiezas >= MAYOREO_MINIMO;
    const descuentoMayoreo = esMayoreo
      ? Math.round((subtotal * MAYOREO_PORCENTAJE) / 100)
      : 0;

    let descuento = 0;
    let descuentoTipo = 'ninguno';

    if (aplicarDescuentoManual) {
      descuentoTipo = 'manual';
      descuento = Math.min(Number(createForm.descuento_monto || 0), subtotal);
    } else if (esMayoreo) {
      descuentoTipo = 'mayoreo';
      descuento = descuentoMayoreo;
    }

    descuento = Math.min(descuento, subtotal);

    const costoEnvio =
      createForm.forma_entrega === 'en_local'
        ? 0
        : Number(createForm.costo_envio || 0);
    const total = Math.max(subtotal - descuento + costoEnvio, 0);
    const anticipo = Math.ceil((total * ANTICIPO_PORCENTAJE) / 100);
    const montoInicial = Number(createForm.pago_inicial.monto || 0);

    return {
      productosDetalle,
      subtotalProductos,
      subtotalServicios,
      subtotal,
      totalPiezas,
      esMayoreo,
      descuentoMayoreo,
      descuentoTipo,
      descuento,
      costoEnvio,
      total,
      anticipo,
      montoInicial,
      saldoDespues: Math.max(total - montoInicial, 0),
    };
  }, [
    createForm.productos,
    createForm.servicios,
    createForm.descuento_monto,
    createForm.forma_entrega,
    createForm.costo_envio,
    createForm.pago_inicial.monto,
    aplicarDescuentoManual,
    productosDisponibles,
    matchProductoFromText,
  ]);

  const effectiveEmpleadoId =
    createForm.pago_inicial.id_empleado ||
    createForm.id_empleado ||
    resolveDefaultContext().idEmpleado;

  const createPagoErrors = {};
  if (totals.total > 0) {
    const monto = createForm.pago_inicial.monto;
    const montoNumber = Number(monto);

    if (!monto) {
      createPagoErrors.monto = 'El monto del anticipo es obligatorio.';
    } else if (!/^\d+$/.test(monto)) {
      createPagoErrors.monto = 'Ingresa un monto entero usando solo dígitos.';
    } else if (montoNumber > totals.total) {
      createPagoErrors.monto =
        `El monto no puede exceder el total de ${formatMoney(totals.total)}.`;
    } else if (montoNumber < totals.anticipo && montoNumber < totals.total) {
      createPagoErrors.monto =
        `El anticipo mínimo es ${formatMoney(totals.anticipo)} o puedes liquidar el total.`;
    }

    if (
      createForm.pago_inicial.metodo_pago === 'transferencia' &&
      !createForm.pago_inicial.referencia.trim()
    ) {
      createPagoErrors.referencia =
        'La referencia es obligatoria para transferencias.';
    }

    if (!effectiveEmpleadoId) {
      createPagoErrors.id_empleado =
        'No se pudo detectar automáticamente un empleado responsable.';
    }
  }
  const visibleCreatePagoErrors = Object.fromEntries(
    Object.entries(createPagoErrors).filter(
      ([field]) => createPagoTouched[field],
    ),
  );
  const hasCreatePagoErrors = Object.values(createPagoErrors).some(Boolean);

  function abrirNuevoPedido() {
    const { idEmpleado, idSucursal } = resolveDefaultContext();

    setCreateForm({
      ...EMPTY_FORM,
      id_cliente: '',
      cliente_texto: '',
      id_empleado: idEmpleado,
      id_sucursal: idSucursal,
      pago_inicial: {
        ...EMPTY_FORM.pago_inicial,
        id_empleado: idEmpleado,
      },
    });
    setAplicarDescuentoManual(false);
    setCreateError('');
    setCreatePagoTouched({});
    setCreateOpen(true);
  }

  function handleToggleDescuentoManual(activo) {
    setAplicarDescuentoManual(activo);
    if (!activo) {
      setCreateForm((current) => ({
        ...current,
        descuento_monto: 0,
        descuento_motivo: '',
        id_descuento_autoriza: '',
      }));
    }
  }

  function handleFormChange(field, value) {
    setCreateForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'forma_entrega' && value === 'en_local') {
        next.costo_envio = 0;
        next.direccion_entrega = '';
      }

      if (field === 'descuento_tipo' && value !== 'manual') {
        next.descuento_monto = 0;
        next.descuento_motivo = '';
        next.id_descuento_autoriza = '';
      }

      return next;
    });
  }

  function handleClienteTextoChange(value) {
    const matched = matchClienteFromText(value);
    setCreateForm((current) => ({
      ...current,
      cliente_texto: value,
      id_cliente: matched ? String(matched.id_cliente) : '',
    }));
  }

  function seleccionarCliente(cliente) {
    setCreateForm((current) => ({
      ...current,
      id_cliente: String(cliente.id_cliente),
      cliente_texto: formatClienteOption(cliente),
    }));
    setClienteSearchOpen(false);
  }

  function abrirRegistroRapidoCliente() {
    setQuickClienteForm({
      nombre: createForm.cliente_texto?.split(' ')[0] || '',
      apellido_paterno: '',
      apellido_materno: '',
      telefono: '',
      direccion: 'Venta mostrador / Sin dirección',
      correo: '',
      es_frecuente: false,
    });
    setQuickClienteError('');
    setQuickClienteModalOpen(true);
  }

  async function handleGuardarClienteRapido(e) {
    e.preventDefault();
    setQuickClienteError('');

    if (!quickClienteForm.nombre.trim()) {
      setQuickClienteError('El nombre es obligatorio');
      return;
    }
    if (!quickClienteForm.apellido_paterno.trim()) {
      setQuickClienteError('El apellido paterno es obligatorio');
      return;
    }
    if (!quickClienteForm.telefono.trim() || !/^\d{10,15}$/.test(quickClienteForm.telefono.trim())) {
      setQuickClienteError('El teléfono debe tener entre 10 y 15 dígitos numéricos');
      return;
    }

    setQuickClienteLoading(true);
    try {
      const resp = await clientesApi.create({
        nombre: quickClienteForm.nombre.trim(),
        apellido_paterno: quickClienteForm.apellido_paterno.trim(),
        apellido_materno: quickClienteForm.apellido_materno?.trim() || null,
        telefono: quickClienteForm.telefono.trim(),
        direccion: quickClienteForm.direccion.trim() || 'Sin dirección',
        correo: quickClienteForm.correo.trim() || null,
        es_frecuente: Boolean(quickClienteForm.es_frecuente),
        tiene_credito: false,
        limite_credito: 0,
      });

      const nuevo = resp.data;
      setClientes((prev) => [nuevo, ...prev]);
      seleccionarCliente(nuevo);
      setQuickClienteModalOpen(false);
    } catch (err) {
      setQuickClienteError(err.message || 'Error al registrar el cliente');
    } finally {
      setQuickClienteLoading(false);
    }
  }

  function handlePagoInicialChange(field, value) {
    setCreateForm((current) => {
      const nextPagoInicial = {
        ...current.pago_inicial,
        [field]: value,
      };

      if (field === 'metodo_pago' && value !== 'transferencia') {
        nextPagoInicial.referencia = '';
      }

      return {
        ...current,
        pago_inicial: nextPagoInicial,
      };
    });

    if (field === 'metodo_pago' && value !== 'transferencia') {
      setCreatePagoTouched((current) => ({ ...current, referencia: false }));
    }
  }

  function handleAddProducto() {
    if (!createForm.id_sucursal) {
      setCreateError('Esperando sucursal para consultar el inventario.');
      return;
    }

    setCreateError('');
    setCreateForm((current) => ({
      ...current,
      productos: [
        ...current.productos,
        { id_producto: '', producto_texto: '', cantidad: 1 },
      ],
    }));
  }

  function handleProductoTextoChange(index, value) {
    setCreateError('');
    // Al escribir, solo actualizamos el texto de búsqueda y limpiamos id_producto
    // El producto solo se asignará cuando el usuario haga clic en una opción de la lista
    setCreateForm((current) => ({
      ...current,
      productos: current.productos.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              producto_texto: value,
              id_producto: '',
            }
          : item,
      ),
    }));
  }

  function seleccionarProducto(index, item) {
    const duplicate = createForm.productos.some(
      (p, i) => i !== index && String(p.id_producto || '') === String(item.id_producto),
    );

    if (duplicate) {
      setCreateError('Ese producto ya está agregado en el pedido.');
      return;
    }

    setCreateError('');
    setCreateForm((current) => ({
      ...current,
      productos: current.productos.map((row, i) =>
        i === index
          ? {
              ...row,
              id_producto: String(item.id_producto),
              producto_texto: formatProductoOption(item),
            }
          : row,
      ),
    }));
    setActiveProductoDropdown(null);
  }

  function getProductosFiltrados(texto) {
    const q = (texto || '').trim().toLowerCase();
    if (!q) return productosDisponibles.slice(0, 10);
    return productosDisponibles
      .filter((item) => {
        const nom = String(item.producto_nombre || '').toLowerCase();
        const sku = String(item.producto_sku || '').toLowerCase();
        const col = String(item.producto_color || '').toLowerCase();
        const tal = String(item.producto_talla || '').toLowerCase();
        return (
          nom.includes(q) ||
          (sku && sku.includes(q)) ||
          col.includes(q) ||
          tal.includes(q) ||
          `${nom} ${col} ${tal}`.includes(q)
        );
      })
      .slice(0, 10);
  }

  function handleCantidadChange(index, value) {
    setCreateForm((current) => ({
      ...current,
      productos: current.productos.map((item, itemIndex) =>
        itemIndex === index ? { ...item, cantidad: value } : item,
      ),
    }));
  }

  function handleRemoveProducto(index) {
    setCreateForm((current) => ({
      ...current,
      productos: current.productos.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleAddServicio() {
    setCreateForm((current) => ({
      ...current,
      servicios: [
        ...current.servicios,
        {
          tipo: 'bordado',
          descripcion: '',
          cantidad: 1,
          precio: 0,
        },
      ],
    }));
  }

  function handleServicioChange(index, field, value) {
    setCreateForm((current) => ({
      ...current,
      servicios: current.servicios.map((servicio, itemIndex) =>
        itemIndex === index ? { ...servicio, [field]: value } : servicio,
      ),
    }));
  }

  function handleRemoveServicio(index) {
    setCreateForm((current) => ({
      ...current,
      servicios: current.servicios.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleCrearPedido(event) {
    event.preventDefault();

    const fallbackContext = resolveDefaultContext();
    const idEmpleadoFinal = createForm.id_empleado || fallbackContext.idEmpleado;
    const idSucursalFinal = createForm.id_sucursal || fallbackContext.idSucursal;
    const matchedCliente =
      clientes.find((item) => String(item.id_cliente) === String(createForm.id_cliente)) ??
      matchClienteFromText(createForm.cliente_texto);
    const clienteTextoLimpio = createForm.cliente_texto.trim();

    if (!matchedCliente && !clienteTextoLimpio) {
      setCreateError('Escribe el nombre o teléfono del cliente.');
      return;
    }

    if (!idEmpleadoFinal || !idSucursalFinal) {
      setCreateError(
        'No se pudo determinar automáticamente el empleado o la sucursal del sistema.',
      );
      return;
    }

    if (createForm.productos.length === 0 && createForm.servicios.length === 0) {
      setCreateError('Agrega al menos un producto o un servicio al pedido.');
      return;
    }

    for (const [index, row] of totals.productosDetalle.entries()) {
      if (!row.item) {
        setCreateError(
          `Escribe o selecciona un producto válido en la fila ${index + 1}.`,
        );
        return;
      }

      if (Number(row.cantidad) <= 0) {
        setCreateError(`La cantidad del producto ${index + 1} debe ser mayor a cero.`);
        return;
      }
    }

    const serviciosValidos = createForm.servicios.filter(
      (servicio) => servicio.descripcion.trim().length > 0,
    );

    if (createForm.servicios.length > 0 && serviciosValidos.length !== createForm.servicios.length) {
      setCreateError('Todos los servicios deben tener una descripción.');
      return;
    }

    if (createForm.forma_entrega !== 'en_local' && !createForm.direccion_entrega.trim()) {
      setCreateError('Captura la dirección de entrega.');
      return;
    }

    if (aplicarDescuentoManual) {
      const montoDesc = Number(createForm.descuento_monto || 0);
      if (montoDesc <= 0) {
        setCreateError('Ingresa un monto de descuento válido mayor a cero.');
        return;
      }
      if (montoDesc > totals.subtotal) {
        setCreateError('El monto de descuento no puede exceder el subtotal del pedido.');
        return;
      }
      if (!createForm.descuento_motivo.trim()) {
        setCreateError('El descuento manual requiere un motivo explicativo.');
        return;
      }
    }

    let pagoInicial = null;
    if (totals.total > 0) {
      if (hasCreatePagoErrors) {
        setCreatePagoTouched({
          monto: true,
          referencia: createForm.pago_inicial.metodo_pago === 'transferencia',
          id_empleado: true,
        });
        return;
      }

      const monto = Number(createForm.pago_inicial.monto);
      pagoInicial = {
        monto,
        metodo_pago: createForm.pago_inicial.metodo_pago,
        referencia:
          createForm.pago_inicial.metodo_pago === 'transferencia'
            ? createForm.pago_inicial.referencia.trim() || null
            : null,
        id_empleado: Number(createForm.pago_inicial.id_empleado || idEmpleadoFinal),
      };
    }

    try {
      setSaving(true);
      setCreateError('');
      setSuccess('');

      await pedidosApi.create({
        id_cliente: matchedCliente ? Number(matchedCliente.id_cliente) : null,
        cliente_nombre: matchedCliente ? undefined : clienteTextoLimpio,
        id_empleado: Number(idEmpleadoFinal),
        id_sucursal: Number(idSucursalFinal),
        origen: createForm.origen,
        condicion_pago: createForm.condicion_pago,
        forma_entrega: createForm.forma_entrega,
        direccion_entrega:
          createForm.forma_entrega === 'en_local'
            ? null
            : createForm.direccion_entrega.trim(),
        costo_envio:
          createForm.forma_entrega === 'en_local'
            ? 0
            : Number(createForm.costo_envio) || 0,
        fecha_entrega_prometida: createForm.fecha_entrega_prometida
          ? createForm.fecha_entrega_prometida.replace('T', ' ')
          : null,
        descuento_tipo: totals.descuentoTipo,
        descuento_monto:
          totals.descuentoTipo === 'manual'
            ? Number(createForm.descuento_monto) || 0
            : totals.descuentoTipo === 'mayoreo'
              ? totals.descuentoMayoreo
              : 0,
        descuento_motivo:
          totals.descuentoTipo === 'manual'
            ? createForm.descuento_motivo.trim()
            : null,
        id_descuento_autoriza:
          totals.descuentoTipo === 'manual'
            ? Number(idEmpleadoFinal)
            : null,
        observaciones: createForm.observaciones.trim() || null,
        productos: totals.productosDetalle.map((row) => ({
          id_producto: Number(row.item.id_producto),
          cantidad: Number(row.cantidad),
        })),
        servicios: serviciosValidos.map((servicio) => ({
          tipo: servicio.tipo,
          descripcion: servicio.descripcion.trim(),
          cantidad: Number(servicio.cantidad) || 1,
          precio: Number(servicio.precio) || 0,
        })),
        pago_inicial: pagoInicial,
      });

      setSuccess('Pedido creado correctamente.');
      setCreateOpen(false);
      await loadPedidos();
    } catch (requestError) {
      setCreateError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function abrirDetalle(pedido) {
    setDetailTarget(pedido);
    setDetail(null);
    setDetailLoading(true);

    try {
      const response = await pedidosApi.get(pedido.id_pedido);
      setDetail(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function cerrarDetalle() {
    setDetailTarget(null);
    setDetail(null);
  }

  function conceptoPagoPorDefecto(pedido, monto) {
    const saldoPendiente = Number(pedido.saldo_pendiente);
    if (monto === saldoPendiente) return 'liquidacion';
    if (Number(pedido.total_pagado) === 0 && monto < saldoPendiente) return 'anticipo';
    return 'abono';
  }

  const pagoFieldErrors = {
    monto:
      pagoForm.monto === ''
        ? 'El monto es obligatorio.'
        : Number(pagoForm.monto) <= 0
          ? 'El monto debe ser mayor a cero.'
          : Number(pagoForm.monto) > Number(pagoTarget?.saldo_pendiente)
            ? 'El monto no puede exceder el saldo pendiente.'
            : '',
    referencia:
      pagoForm.metodo_pago === 'transferencia' && !pagoForm.referencia.trim()
        ? 'La referencia es obligatoria para pagos por transferencia.'
        : '',
  };
  const montoPagoActual = Number(pagoForm.monto);
  const saldoPendientePago = Number(pagoTarget?.saldo_pendiente);
  const pagoSaldoHint =
    montoPagoActual > 0 && montoPagoActual < saldoPendientePago
      ? `Faltan ${formatMoney(saldoPendientePago - montoPagoActual)} para cubrir el total`
      : montoPagoActual === saldoPendientePago && montoPagoActual > 0
        ? 'Con este pago el pedido queda liquidado'
        : undefined;
  const visiblePagoFieldErrors = Object.fromEntries(
    Object.entries(pagoFieldErrors).filter(
      ([field, message]) => message && pagoTouched[field],
    ),
  );
  const pagoFormInvalid = Object.values(pagoFieldErrors).some(Boolean);

  function abrirPago(pedido) {
    setError('');
    setPagoTarget(pedido);
    setPagoCaja(null);
    const monto = String(pedido.saldo_pendiente || '');
    const defaultEmpleadoId = resolveDefaultContext().idEmpleado || String(pedido.id_empleado);
    setPagoForm({
      monto,
      metodo_pago: 'efectivo',
      referencia: '',
      id_empleado: defaultEmpleadoId,
      concepto_pago: conceptoPagoPorDefecto(pedido, Number(monto)),
    });
    setPagoTouched({});
    setPagoConceptoTouched(false);
  }

  async function handleRegistrarPago(event) {
    event.preventDefault();

    const monto = Number(pagoForm.monto);
    if (Object.values(pagoFieldErrors).some(Boolean)) {
      setPagoTouched({ monto: true, referencia: true });
      return;
    }

    try {
      setSavingPago(true);
      setError('');
      setSuccess('');
      const defaultEmpleadoId = resolveDefaultContext().idEmpleado || String(pagoTarget.id_empleado);
      await pedidosApi.addPago(pagoTarget.id_pedido, {
        monto,
        metodo_pago: pagoForm.metodo_pago,
        referencia:
          pagoForm.metodo_pago === 'transferencia'
            ? pagoForm.referencia.trim()
            : null,
        id_empleado: Number(pagoForm.id_empleado || defaultEmpleadoId),
        concepto_pago: pagoForm.concepto_pago,
      });
      setSuccess('Pago registrado correctamente.');
      setPagoTarget(null);
      await loadPedidos();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingPago(false);
    }
  }

  function abrirEstado(pedido) {
    setError('');
    const posibles = getEstadosPosibles(pedido);
    setEstadoTarget(pedido);
    setEstadoForm({
      estado: posibles[0]?.value || '',
      id_empleado_entrega: resolveDefaultContext().idEmpleado || String(pedido.id_empleado),
      observaciones: '',
    });
  }

  async function handleCambiarEstado(event) {
    event.preventDefault();

    if (!estadoForm.estado) {
      setError('Selecciona el siguiente estado del pedido.');
      return;
    }

    try {
      setSavingEstado(true);
      setError('');
      setSuccess('');
      const defaultId = resolveDefaultContext().idEmpleado || String(estadoTarget.id_empleado);
      await pedidosApi.cambiarEstado(estadoTarget.id_pedido, {
        estado: estadoForm.estado,
        id_empleado_entrega:
          estadoForm.estado === 'entregado'
            ? Number(estadoForm.id_empleado_entrega || defaultId)
            : null,
        observaciones: estadoForm.observaciones.trim() || null,
      });
      setSuccess('Estado del pedido actualizado correctamente.');
      setEstadoTarget(null);
      await loadPedidos();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingEstado(false);
    }
  }

  function abrirCancelar(pedido) {
    setError('');
    setCancelTarget(pedido);
    setCancelForm({
      motivo: '',
      monto_devolucion: 0,
      metodo_devolucion: 'efectivo',
      id_empleado_autoriza: String(pedido.id_empleado),
      id_empleado_cancela: String(pedido.id_empleado),
    });
  }

  async function handleCancelarPedido(event) {
    event.preventDefault();

    if (cancelForm.motivo.trim().length < 3) {
      setError('El motivo de cancelación debe tener al menos 3 caracteres.');
      return;
    }

    if (Number(cancelForm.monto_devolucion) > Number(cancelTarget.total_pagado)) {
      setError('La devolución no puede exceder lo pagado del pedido.');
      return;
    }

    try {
      setSavingCancel(true);
      setError('');
      setSuccess('');
      await pedidosApi.cancelar(cancelTarget.id_pedido, {
        motivo: cancelForm.motivo.trim(),
        monto_devolucion: Number(cancelForm.monto_devolucion) || 0,
        metodo_devolucion: cancelForm.metodo_devolucion,
        id_empleado_autoriza: Number(cancelForm.id_empleado_autoriza),
        id_empleado_cancela: Number(cancelForm.id_empleado_cancela),
      });
      setSuccess('Pedido cancelado y existencias devueltas.');
      setCancelTarget(null);
      await loadPedidos();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingCancel(false);
    }
  }

  const puedeCobrar = (pedido) =>
    pedido.estado !== 'cancelado' && Number(pedido.saldo_pendiente) > 0;
  const puedeCambiarEstado = (pedido) =>
    !['cancelado', 'entregado'].includes(pedido.estado);
  const puedeCancelar = (pedido) =>
    !['cancelado', 'entregado'].includes(pedido.estado);
  const puedeDevolver = (pedido) =>
    canDevoluciones && pedido.estado !== 'cancelado';

  const abrirDevolucion = (pedido) => {
    cerrarDetalle();
    setSearchParams({
      tab: 'devoluciones',
      pedido_id: String(pedido.id_pedido),
      folio: pedido.folio || '',
    });
  };

  return (
    <div>
      {/* Selector de pestañas */}
      <div className="flex border-b border-line gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('pedidos')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
            activeTab === 'pedidos'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Pedidos y Ventas</span>
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted">
            {pedidos.length}
          </span>
        </button>

        {canDevoluciones && (
          <button
            type="button"
            onClick={() => setTab('devoluciones')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
              activeTab === 'devoluciones'
                ? 'border-forest text-forest'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Devoluciones</span>
          </button>
        )}
      </div>

      {activeTab === 'pedidos' ? (
        <>
          <PageHeader
        title="Pedidos"
        description="Registra ventas, apartados y servicios de bordado; controla pagos, entregas y cancelaciones."
      >
        <Button onClick={abrirNuevoPedido} disabled={empleados.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo pedido
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-5">
          <Alert>
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadPedidos}
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </Alert>
        </div>
      )}

      {success && (
        <div className="mb-5">
          <Alert type="success">{success}</Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Pedidos"
          value={stats.total ?? 0}
          hint={`${stats.pendientes ?? 0} pendientes · ${stats.en_proceso ?? 0} en proceso`}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Ventas registradas"
          value={formatMoney(stats.total_ventas ?? 0)}
          hint="Pedidos no cancelados"
        />
        <StatCard
          icon={Wallet}
          label="Por cobrar"
          value={formatMoney(stats.saldo_por_cobrar ?? 0)}
          hint="Saldo pendiente de todos los pedidos"
        />
        <StatCard
          icon={CheckCircle2}
          label="Entregados"
          value={stats.entregados ?? 0}
          hint={`${stats.terminados ?? 0} listos para entregar`}
        />
      </div>

      <div className="mt-7 rounded-2xl border border-line bg-paper p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <Field label="Buscar" htmlFor="pedido-buscar">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="pedido-buscar"
                type="search"
                className={cn(inputClass(), 'pl-9')}
                placeholder="Folio, cliente o teléfono…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Field>

          <Field label="Estado" htmlFor="pedido-estado">
            <select
              id="pedido-estado"
              className={inputClass()}
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
            >
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Pago" htmlFor="pedido-pago">
            <select
              id="pedido-pago"
              className={inputClass()}
              value={filtroPago}
              onChange={(event) => setFiltroPago(event.target.value)}
            >
              <option value="">Todos</option>
              {ESTADOS_PAGO.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-sand" />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No hay pedidos que coincidan"
            description="Cambia los filtros o registra el primer pedido para empezar a vender."
            action={
              <Button onClick={abrirNuevoPedido} disabled={empleados.length === 0}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo pedido
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Folio</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Pago</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                    <th className="px-4 py-3 text-right font-semibold min-w-[280px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id_pedido} className="hover:bg-sand/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{pedido.folio}</p>
                        <p className="text-xs text-muted">{pedido.sucursal_nombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{pedido.cliente_nombre}</p>
                        <p className="text-xs text-muted">{pedido.cliente_telefono}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDateTime(pedido.fecha_pedido)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={pedido.estado} />
                      </td>
                      <td className="px-4 py-3">
                        {pedido.estado === 'cancelado' ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <PagoBadge estado={pedido.estado_pago} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {formatMoney(pedido.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'font-semibold',
                            Number(pedido.saldo_pendiente) > 0
                              ? 'text-danger'
                              : 'text-forest',
                          )}
                        >
                          {formatMoney(pedido.saldo_pendiente)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirDetalle(pedido)}
                          >
                            Ver
                          </Button>
                          {puedeCobrar(pedido) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="whitespace-nowrap"
                              onClick={() => abrirPago(pedido)}
                            >
                              Pago
                            </Button>
                          )}
                          {puedeCambiarEstado(pedido) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => abrirEstado(pedido)}
                            >
                              Estado
                            </Button>
                          )}
                          {puedeDevolver(pedido) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-700 hover:bg-amber-50"
                              onClick={() => abrirDevolucion(pedido)}
                              title="Registrar devolución"
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Devolución
                            </Button>
                          )}
                          {puedeCancelar(pedido) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-danger/10"
                              onClick={() => abrirCancelar(pedido)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line lg:hidden">
              {pedidos.map((pedido) => (
                <article key={pedido.id_pedido} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{pedido.folio}</p>
                      <p className="text-sm text-muted">{pedido.cliente_nombre}</p>
                      <p className="text-xs text-muted">{pedido.sucursal_nombre}</p>
                    </div>
                    <EstadoBadge estado={pedido.estado} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {pedido.estado === 'cancelado' ? (
                      <span className="text-xs text-muted">Pago no aplicable</span>
                    ) : (
                      <PagoBadge estado={pedido.estado_pago} />
                    )}
                    <span className="text-xs text-muted">
                      {formatDateTime(pedido.fecha_pedido)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Total</dt>
                      <dd className="font-semibold">{formatMoney(pedido.total)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Saldo</dt>
                      <dd className="font-semibold text-danger">
                        {formatMoney(pedido.saldo_pendiente)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-line/60">
                    <Button variant="secondary" size="sm" onClick={() => abrirDetalle(pedido)}>
                      Ver
                    </Button>
                    {puedeCobrar(pedido) && (
                      <Button size="sm" onClick={() => abrirPago(pedido)}>
                        Pago
                      </Button>
                    )}
                    {puedeCambiarEstado(pedido) && (
                      <Button variant="secondary" size="sm" onClick={() => abrirEstado(pedido)}>
                        Estado
                      </Button>
                    )}
                    {puedeDevolver(pedido) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-700 hover:bg-amber-50"
                        onClick={() => abrirDevolucion(pedido)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Devolución
                      </Button>
                    )}
                    {puedeCancelar(pedido) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/10"
                        onClick={() => abrirCancelar(pedido)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Nuevo pedido"
        description="Captura productos, servicios, entrega y el pago inicial."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-nuevo-pedido"
              loading={saving}
              disabled={
                checkingCaja ||
                !cajaAbierta ||
                (totals.total > 0 && hasCreatePagoErrors)
              }
            >
              Crear pedido
            </Button>
          </>
        }
      >
        <form id="form-nuevo-pedido" className="space-y-6" onSubmit={handleCrearPedido}>
          {createError && <Alert>{createError}</Alert>}

          {empleados.length === 0 && (
            <Alert>
              <p className="font-semibold">No hay empleados activos.</p>
              <p className="mt-1">
                Registra un empleado en{' '}
                <Link to="/sucursales" className="font-semibold underline">
                  Sucursales
                </Link>{' '}
                antes de crear un pedido.
              </p>
            </Alert>
          )}

          <datalist id="lista-clientes-sugeridos">
            {clientes.map((cliente) => (
              <option key={cliente.id_cliente} value={formatClienteOption(cliente)} />
            ))}
          </datalist>

          <datalist id="lista-productos-sugeridos">
            {productosDisponibles.map((item) => (
              <option key={item.id_inventario} value={formatProductoOption(item)} />
            ))}
          </datalist>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Cliente y origen</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="pedido-cliente" className="block text-sm font-semibold text-ink">
                    Cliente <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={abrirRegistroRapidoCliente}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    + Registrar nuevo cliente
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="pedido-cliente"
                    type="text"
                    list="lista-clientes-sugeridos"
                    maxLength={150}
                    className={cn(inputClass(), 'pr-8')}
                    value={createForm.cliente_texto}
                    onChange={(event) => {
                      handleClienteTextoChange(event.target.value);
                      setClienteSearchOpen(true);
                    }}
                    onFocus={() => setClienteSearchOpen(true)}
                    placeholder="Escribe nombre o teléfono…"
                    required
                    autoComplete="off"
                  />
                  {createForm.id_cliente ? (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest text-xs font-bold bg-sage px-1.5 py-0.5 rounded">
                      ✓ Seleccionado
                    </div>
                  ) : null}
                </div>

                {clienteSearchOpen && createForm.cliente_texto && !createForm.id_cliente && (
                  <div className="relative z-20">
                    <div className="absolute left-0 right-0 top-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-paper p-1 shadow-soft">
                      {clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map((c) => (
                          <button
                            key={c.id_cliente}
                            type="button"
                            onClick={() => seleccionarCliente(c)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-sand transition"
                          >
                            <div>
                              <p className="font-semibold text-ink">
                                {[c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ')}
                              </p>
                              {c.direccion && <p className="text-[11px] text-muted truncate max-w-xs">{c.direccion}</p>}
                            </div>
                            <span className="text-muted font-mono shrink-0">{c.telefono}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-2 text-center text-xs text-muted">
                          No se encontró este cliente.{' '}
                          <button
                            type="button"
                            onClick={abrirRegistroRapidoCliente}
                            className="font-bold text-forest underline ml-1"
                          >
                            Crear aquí
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">Escribe para autocompletar o selecciona de la lista.</p>
              </div>

              <Field label="Origen" htmlFor="pedido-origen">
                <select
                  id="pedido-origen"
                  className={inputClass()}
                  value={createForm.origen}
                  onChange={(event) => handleFormChange('origen', event.target.value)}
                >
                  {ORIGENES.map((origen) => (
                    <option key={origen.value} value={origen.value}>
                      {origen.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Entrega y pago</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Forma de entrega" htmlFor="pedido-entrega">
                <select
                  id="pedido-entrega"
                  className={inputClass()}
                  value={createForm.forma_entrega}
                  onChange={(event) => handleFormChange('forma_entrega', event.target.value)}
                >
                  {FORMAS_ENTREGA.map((forma) => (
                    <option key={forma.value} value={forma.value}>
                      {forma.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Condición de pago" htmlFor="pedido-condicion">
                <select
                  id="pedido-condicion"
                  className={inputClass()}
                  value={createForm.condicion_pago}
                  onChange={(event) => handleFormChange('condicion_pago', event.target.value)}
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </Field>

              {createForm.forma_entrega !== 'en_local' && (
                <>
                  <Field
                    label="Dirección de entrega"
                    htmlFor="pedido-direccion"
                    className="sm:col-span-2"
                  >
                    <input
                      id="pedido-direccion"
                      type="text"
                      maxLength={200}
                      className={inputClass()}
                      value={createForm.direccion_entrega}
                      onChange={(event) =>
                        handleFormChange('direccion_entrega', event.target.value)
                      }
                      placeholder="Calle, número, colonia, ciudad…"
                    />
                  </Field>

                  <Field
                    label="Costo de envío"
                    htmlFor="pedido-costo-envio"
                    hint="Para paquetería captura el costo real de la guía."
                  >
                    <input
                      id="pedido-costo-envio"
                      type="number"
                      min="0"
                      step="1"
                      className={inputClass()}
                      value={createForm.costo_envio}
                      onChange={(event) =>
                        handleFormChange('costo_envio', event.target.value)
                      }
                    />
                  </Field>
                </>
              )}

              <Field label="Fecha prometida de entrega" htmlFor="pedido-fecha-entrega">
                <input
                  id="pedido-fecha-entrega"
                  type="datetime-local"
                  className={inputClass()}
                  value={createForm.fecha_entrega_prometida}
                  onChange={(event) =>
                    handleFormChange('fecha_entrega_prometida', event.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Productos</h3>
                <p className="text-xs text-muted">
                  Escribe el producto; el stock se descuenta al crear el pedido.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddProducto}
                disabled={!createForm.id_sucursal}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar producto
              </Button>
            </div>

            {createForm.productos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                {createForm.id_sucursal
                  ? 'Agrega al menos un producto y escríbelo para buscarlo.'
                  : 'Cargando inventario de la sucursal…'}
              </div>
            ) : (
              <div className="space-y-2">
                {totals.productosDetalle.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`producto-${index}`} className="block text-sm font-semibold text-ink">
                          Producto <span className="text-danger">*</span>
                        </label>
                        {row.item && (
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              Number(row.item.stock_actual) > 0 ? 'text-forest' : 'text-amber-600',
                            )}
                          >
                            {Number(row.item.stock_actual) > 0
                              ? `Stock: ${row.item.stock_actual}`
                              : 'Sin stock (por encargo)'}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          id={`producto-${index}`}
                          type="text"
                          className={cn(inputClass(), 'pr-8')}
                          value={row.producto_texto ?? ''}
                          onChange={(event) => {
                            handleProductoTextoChange(index, event.target.value);
                            setActiveProductoDropdown(index);
                          }}
                          onFocus={() => setActiveProductoDropdown(index)}
                          placeholder="Escribe nombre o SKU…"
                          autoComplete="off"
                        />
                        {row.id_producto ? (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest text-xs font-bold bg-sage px-1.5 py-0.5 rounded">
                            ✓
                          </div>
                        ) : null}
                      </div>

                      {activeProductoDropdown === index && !row.id_producto && (
                        <div className="relative z-30">
                          <div className="absolute left-0 right-0 top-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-paper p-1 shadow-soft">
                            {getProductosFiltrados(row.producto_texto).length > 0 ? (
                              getProductosFiltrados(row.producto_texto).map((item) => (
                                <button
                                  key={item.id_inventario || item.id_producto}
                                  type="button"
                                  onClick={() => seleccionarProducto(index, item)}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-sand transition"
                                >
                                  <div>
                                    <p className="font-semibold text-ink">
                                      {item.producto_nombre}
                                    </p>
                                    <p className="text-[11px] text-muted">
                                      {[item.producto_color, item.producto_talla].filter(Boolean).join(' · ')}
                                      {item.producto_sku ? ` · SKU: ${item.producto_sku}` : ''}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-semibold text-ink block">
                                      {formatMoney(item.producto_precio)}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[11px] font-medium',
                                        Number(item.stock_actual) > 0 ? 'text-forest' : 'text-amber-600',
                                      )}
                                    >
                                      {Number(item.stock_actual) > 0
                                        ? `${item.stock_actual} disp.`
                                        : '0 disp. (por encargo)'}
                                    </span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-muted">
                                No se encontraron productos activos en esta sucursal.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted">
                        {row.item
                          ? `Precio: ${formatMoney(row.item.producto_precio)} c/u`
                          : 'Escribe para autocompletar o selecciona de la lista.'}
                      </p>
                    </div>

                    <Field label="Cantidad" htmlFor={`cantidad-${index}`}>
                      <input
                        id={`cantidad-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        className={inputClass()}
                        value={row.cantidad}
                        onChange={(event) =>
                          handleCantidadChange(index, event.target.value)
                        }
                      />
                    </Field>

                    <div>
                      <p className="text-sm font-medium text-ink">Subtotal</p>
                      <p className="mt-2 font-semibold text-ink">
                        {formatMoney(row.subtotal)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatMoney(row.precio)} c/u
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => handleRemoveProducto(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Servicios</h3>
                <p className="text-xs text-muted">
                  Bordados o diseños sobre pedido; no descuentan inventario.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddServicio}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar servicio
              </Button>
            </div>

            {createForm.servicios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                Sin servicios adicionales.
              </div>
            ) : (
              <div className="space-y-2">
                {createForm.servicios.map((servicio, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[8rem_1fr_6rem_7rem_auto] sm:items-end"
                  >
                    <Field label="Tipo" htmlFor={`servicio-tipo-${index}`}>
                      <select
                        id={`servicio-tipo-${index}`}
                        className={inputClass()}
                        value={servicio.tipo}
                        onChange={(event) =>
                          handleServicioChange(index, 'tipo', event.target.value)
                        }
                      >
                        <option value="bordado">Bordado</option>
                        <option value="diseno">Diseño</option>
                      </select>
                    </Field>

                    <Field label="Descripción" htmlFor={`servicio-desc-${index}`}>
                      <input
                        id={`servicio-desc-${index}`}
                        type="text"
                        maxLength={200}
                        className={inputClass()}
                        value={servicio.descripcion}
                        onChange={(event) =>
                          handleServicioChange(index, 'descripcion', event.target.value)
                        }
                        placeholder="Nombre, iniciales, diseño…"
                      />
                    </Field>

                    <Field label="Cantidad" htmlFor={`servicio-cantidad-${index}`}>
                      <input
                        id={`servicio-cantidad-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        className={inputClass()}
                        value={servicio.cantidad}
                        onChange={(event) =>
                          handleServicioChange(index, 'cantidad', event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Precio" htmlFor={`servicio-precio-${index}`}>
                      <input
                        id={`servicio-precio-${index}`}
                        type="number"
                        min="0"
                        step="1"
                        className={inputClass()}
                        value={servicio.precio}
                        onChange={(event) =>
                          handleServicioChange(index, 'precio', event.target.value)
                        }
                      />
                    </Field>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => handleRemoveServicio(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Descuento</h3>

            {/* Banner informativo de mayoreo automático */}
            <div
              className={cn(
                'rounded-xl border p-3.5 text-sm transition-colors flex items-start gap-3',
                totals.esMayoreo
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                  : 'border-border/60 bg-sand/40 text-muted',
              )}
            >
              <div className="pt-0.5 text-base">
                {totals.esMayoreo ? '🏷️' : 'ℹ️'}
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-medium">
                  {totals.esMayoreo
                    ? `¡Descuento de mayoreo (${MAYOREO_PORCENTAJE}%) aplicado automáticamente!`
                    : `Descuento por mayoreo (${MAYOREO_PORCENTAJE}% a partir de ${MAYOREO_MINIMO} piezas)`}
                </p>
                <p className="text-xs">
                  {totals.esMayoreo ? (
                    <>
                      Se detectaron <strong>{totals.totalPiezas} piezas</strong> en prendas.
                      Ahorro aplicado: <strong>-{formatMoney(totals.descuentoMayoreo)}</strong>.
                      {aplicarDescuentoManual && (
                        <span className="block mt-1 font-semibold text-amber-800">
                          (Sustituido por el descuento manual personalizado indicado abajo)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Prendas agregadas al pedido: <strong>{totals.totalPiezas}</strong> de{' '}
                      <strong>{MAYOREO_MINIMO} piezas</strong> mínimas requeridas.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Apartado ¿Aplicar descuento? */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-surface shadow-xs">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="pedido-aplicar-descuento-toggle"
                  className="h-4 w-4 rounded border-border text-charcoal focus:ring-charcoal"
                  checked={aplicarDescuentoManual}
                  onChange={(e) => handleToggleDescuentoManual(e.target.checked)}
                />
                <div>
                  <span className="font-medium text-ink">¿Aplicar descuento?</span>
                  <p className="text-xs text-muted">
                    Activa esta casilla para ingresar un monto de descuento especial autorizado.
                  </p>
                </div>
              </label>

              {aplicarDescuentoManual && (
                <div className="pt-3 border-t border-border grid gap-4 sm:grid-cols-2">
                  <Field label="Monto a descontar ($)" htmlFor="pedido-descuento-monto">
                    <input
                      id="pedido-descuento-monto"
                      type="number"
                      min="0"
                      step="1"
                      className={inputClass()}
                      placeholder="0.00"
                      value={createForm.descuento_monto}
                      onChange={(event) =>
                        handleFormChange('descuento_monto', event.target.value)
                      }
                    />
                  </Field>

                  <Field label="Motivo del descuento" htmlFor="pedido-descuento-motivo">
                    <input
                      id="pedido-descuento-motivo"
                      type="text"
                      maxLength={150}
                      className={inputClass()}
                      value={createForm.descuento_motivo}
                      onChange={(event) =>
                        handleFormChange('descuento_motivo', event.target.value)
                      }
                      placeholder="Ej. Descuento cliente frecuente, promoción especial, etc."
                    />
                  </Field>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Pago inicial</h3>
            <p className="text-sm text-muted">
              El anticipo del 50% es obligatorio; también puedes liquidar el total.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  handlePagoInicialChange('monto', String(totals.anticipo));
                  setCreatePagoTouched((current) => ({ ...current, monto: true }));
                }}
              >
                Usar anticipo 50%
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  handlePagoInicialChange('monto', String(totals.total));
                  setCreatePagoTouched((current) => ({ ...current, monto: true }));
                }}
              >
                Liquidar total
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Monto"
                htmlFor="pedido-pago-monto"
                hint={`Anticipo mínimo: ${formatMoney(totals.anticipo)}`}
                error={visibleCreatePagoErrors.monto}
              >
                <input
                  id="pedido-pago-monto"
                  type="text"
                  inputMode="numeric"
                  className={inputClass(visibleCreatePagoErrors.monto)}
                  value={createForm.pago_inicial.monto}
                  onChange={(event) =>
                    handlePagoInicialChange(
                      'monto',
                      event.target.value.replace(/\D/g, ''),
                    )
                  }
                  onBlur={() =>
                    setCreatePagoTouched((current) => ({ ...current, monto: true }))
                  }
                  placeholder={String(totals.anticipo)}
                />
              </Field>

              <Field label="Método de pago" htmlFor="pedido-pago-metodo">
                <select
                  id="pedido-pago-metodo"
                  className={inputClass()}
                  value={createForm.pago_inicial.metodo_pago}
                  onChange={(event) =>
                    handlePagoInicialChange('metodo_pago', event.target.value)
                  }
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </Field>

              {createForm.pago_inicial.metodo_pago === 'transferencia' && (
                <Field
                  label="Referencia"
                  htmlFor="pedido-pago-referencia"
                  error={visibleCreatePagoErrors.referencia}
                  className="sm:col-span-2"
                >
                  <input
                    id="pedido-pago-referencia"
                    type="text"
                    maxLength={50}
                    className={inputClass(visibleCreatePagoErrors.referencia)}
                    value={createForm.pago_inicial.referencia}
                    onChange={(event) =>
                      handlePagoInicialChange('referencia', event.target.value)
                    }
                    onBlur={() =>
                      setCreatePagoTouched((current) => ({
                        ...current,
                        referencia: true,
                      }))
                    }
                    placeholder="Folio o referencia de transferencia"
                  />
                </Field>
              )}
            </div>

            {checkingCaja ? (
              <p className="text-xs text-muted">Verificando caja abierta…</p>
            ) : !cajaAbierta ? (
              <Alert>
                <p className="font-semibold">
                  {isSupervisorOrAdmin(empleadoActual)
                    ? 'No hay una caja abierta para el turno actual.'
                    : 'Sin caja asignada para registrar cobros.'}
                </p>
                {isSupervisorOrAdmin(empleadoActual) ? (
                  <p className="mt-1">
                    Abre una caja en{' '}
                    <Link to="/caja" className="font-semibold underline">
                      Corte de caja
                    </Link>{' '}
                    para registrar el anticipo.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    No tienes una caja asignada y abierta. Espera a que tu supervisor o administrador te asigne y abra una caja para poder ingresar anticipos.
                  </p>
                )}
              </Alert>
            ) : cajaAbierta ? (
              <p className="text-xs text-forest">
                Caja abierta disponible: corte #{cajaAbierta.id_corte_caja}.
              </p>
            ) : null}
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Totales</h3>
            <TotalsPanel totals={totals} />
          </section>

          <Field label="Observaciones" htmlFor="pedido-observaciones">
            <textarea
              id="pedido-observaciones"
              rows="3"
              maxLength={1000}
              className={inputClass()}
              value={createForm.observaciones}
              onChange={(event) => handleFormChange('observaciones', event.target.value)}
              placeholder="Detalles de confección, entrega, medidas, etc."
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={cerrarDetalle}
        title={`Pedido ${detailTarget?.folio ?? ''}`}
        description={detailTarget?.cliente_nombre}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cerrarDetalle}>
              Cerrar
            </Button>
            {detail && puedeCobrar(detail) && (
              <Button
                onClick={() => {
                  const pedido = detail;
                  cerrarDetalle();
                  abrirPago(pedido);
                }}
              >
                Pago
              </Button>
            )}
            {detail && puedeCambiarEstado(detail) && (
              <Button
                variant="secondary"
                onClick={() => {
                  const pedido = detail;
                  cerrarDetalle();
                  abrirEstado(pedido);
                }}
              >
                Cambiar estado
              </Button>
            )}
            {detail && puedeDevolver(detail) && (
              <Button
                variant="ghost"
                className="text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  const pedido = detail;
                  abrirDevolucion(pedido);
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Devolución
              </Button>
            )}
            {detail && puedeCancelar(detail) && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                onClick={() => {
                  const pedido = detail;
                  cerrarDetalle();
                  abrirCancelar(pedido);
                }}
              >
                Cancelar pedido
              </Button>
            )}
          </>
        }
      >
        {detailLoading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-sand" />
            <div className="h-40 animate-pulse rounded-xl bg-sand" />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-ink">
                  {detail.cliente_nombre}
                </p>
                <p className="text-sm text-muted">
                  {detail.cliente_telefono} · {detail.sucursal_nombre}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <EstadoBadge estado={detail.estado} />
                {detail.estado !== 'cancelado' && (
                  <PagoBadge estado={detail.estado_pago} />
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Total</dt>
                <dd className="mt-1 font-semibold">{formatMoney(detail.total)}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Pagado</dt>
                <dd className="mt-1 font-semibold text-forest">
                  {formatMoney(detail.total_pagado)}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Saldo</dt>
                <dd className="mt-1 font-semibold text-danger">
                  {formatMoney(detail.saldo_pendiente)}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Anticipo requerido</dt>
                <dd className="mt-1 font-semibold">
                  {formatMoney(detail.anticipo_requerido)}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Registrado por</dt>
                <dd className="mt-1 font-semibold">{detail.empleado_nombre || 'No registrado'}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Entregado por</dt>
                <dd className="mt-1 font-semibold">
                  {detail.empleado_entrega_nombre || (detail.estado === 'entregado' ? 'Entregado (Sin empleado asignado)' : 'Pendiente de entrega')}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Fecha de registro</dt>
                <dd className="mt-1 font-semibold">
                  {formatDateTime(detail.fecha_pedido)}
                </dd>
              </div>
              {detail.fecha_entrega_real && (
                <div className="rounded-xl bg-sand/70 p-3">
                  <dt className="text-xs text-muted">Fecha de entrega</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDateTime(detail.fecha_entrega_real)}
                  </dd>
                </div>
              )}
            </dl>

            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Productos</h3>
              {detail.detalles.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Sin productos.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Producto</th>
                        <th className="px-3 py-2 font-semibold">Variante</th>
                        <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold">Precio</th>
                        <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {detail.detalles.map((detalle) => (
                        <tr key={detalle.id_detalle_pedido}>
                          <td className="px-3 py-2 font-medium text-ink">
                            {detalle.producto_nombre}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {detalle.producto_color} · {detalle.producto_talla}
                          </td>
                          <td className="px-3 py-2 text-right">{detalle.cantidad}</td>
                          <td className="px-3 py-2 text-right">
                            {formatMoney(detalle.precio_unitario)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatMoney(detalle.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {detail.servicios.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Servicios</h3>
                <div className="mt-3 space-y-2">
                  {detail.servicios.map((servicio) => (
                    <div
                      key={servicio.id_pedido_servicio}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                    >
                      <span className="font-semibold capitalize text-ink">
                        {servicio.tipo}
                      </span>
                      <span className="text-muted">{servicio.descripcion}</span>
                      <span className="font-semibold">
                        {servicio.cantidad} × {formatMoney(servicio.precio)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Pagos</h3>
              {detail.pagos.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Todavía no hay pagos registrados.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Fecha</th>
                        <th className="px-3 py-2 font-semibold">Método</th>
                        <th className="px-3 py-2 font-semibold">Concepto</th>
                        <th className="px-3 py-2 font-semibold">Corte</th>
                        <th className="px-3 py-2 text-right font-semibold">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {detail.pagos.map((pago) => (
                        <tr key={pago.id_pago}>
                          <td className="px-3 py-2 text-muted">
                            {formatDateTime(pago.fecha_hora)}
                          </td>
                          <td className="px-3 py-2 capitalize">{pago.metodo_pago}</td>
                          <td className="px-3 py-2 capitalize">{pago.concepto_pago}</td>
                          <td className="px-3 py-2 text-muted">#{pago.id_corte_caja}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatMoney(pago.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {detail.devoluciones.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Devoluciones</h3>
                <div className="mt-3 space-y-2">
                  {detail.devoluciones.map((devolucion) => (
                    <div
                      key={devolucion.id_devolucion}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                    >
                      <span className="text-muted">{devolucion.motivo}</span>
                      <span className="font-semibold text-danger">
                        {formatMoney(devolucion.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.observaciones && (
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">Observaciones</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {detail.observaciones}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No se pudo cargar el pedido.</p>
        )}
      </Modal>

      <Modal
        open={Boolean(pagoTarget)}
        onClose={() => !savingPago && setPagoTarget(null)}
        title={`Registrar pago · ${pagoTarget?.folio ?? ''}`}
        description="El pago se asocia automáticamente a la caja abierta del empleado."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPagoTarget(null)}
              disabled={savingPago}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-pago-pedido"
              loading={savingPago}
              disabled={!pagoCaja || pagoFormInvalid || savingPago}
            >
              Registrar pago
            </Button>
          </>
        }
      >
        {pagoTarget && (
          <form id="form-pago-pedido" className="space-y-4" onSubmit={handleRegistrarPago}>
            {error && <Alert>{error}</Alert>}

            <div className="rounded-xl bg-sand/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Saldo pendiente</span>
                <span className="font-display text-lg font-semibold text-ink">
                  {formatMoney(pagoTarget.saldo_pendiente)}
                </span>
              </div>
            </div>

            {!pagoCaja && (
              <Alert>
                <p className="font-semibold">
                  {isSupervisorOrAdmin(empleadoActual)
                    ? 'No hay una caja abierta.'
                    : 'Sin caja asignada para cobrar.'}
                </p>
                {isSupervisorOrAdmin(empleadoActual) ? (
                  <p className="mt-1">
                    Abre una caja en{' '}
                    <Link to="/caja" className="font-semibold underline">
                      Corte de caja
                    </Link>{' '}
                    antes de cobrar.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    No tienes una caja asignada y abierta. Espera a que tu supervisor o administrador te asigne y abra una caja para poder registrar pagos.
                  </p>
                )}
              </Alert>
            )}

            <Field
              label="Monto"
              htmlFor="pago-monto"
              error={visiblePagoFieldErrors.monto}
              hint={pagoSaldoHint}
            >
              <input
                id="pago-monto"
                type="text"
                inputMode="numeric"
                className={inputClass(visiblePagoFieldErrors.monto)}
                value={pagoForm.monto}
                onChange={(event) => {
                  const monto = event.target.value.replace(/\D/g, '');
                  setPagoForm((current) => ({
                    ...current,
                    monto,
                    ...(!pagoConceptoTouched && pagoTarget
                      ? { concepto_pago: conceptoPagoPorDefecto(pagoTarget, Number(monto)) }
                      : {}),
                  }));
                }}
                onBlur={() => setPagoTouched((current) => ({ ...current, monto: true }))}
              />
            </Field>

            <Field label="Método de pago" htmlFor="pago-metodo">
              <select
                id="pago-metodo"
                className={inputClass()}
                value={pagoForm.metodo_pago}
                onChange={(event) =>
                  setPagoForm((current) => ({
                    ...current,
                    metodo_pago: event.target.value,
                    ...(event.target.value === 'credito' ? { referencia: '' } : {}),
                  }))
                }
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                {pagoTarget.condicion_pago === 'credito' && (
                  <option value="credito">Crédito</option>
                )}
              </select>
            </Field>

            {pagoForm.metodo_pago !== 'credito' && (
              <Field
                label="Referencia"
                htmlFor="pago-referencia"
                error={visiblePagoFieldErrors.referencia}
              >
                <input
                  id="pago-referencia"
                  type="text"
                  maxLength={50}
                  className={inputClass(visiblePagoFieldErrors.referencia)}
                  value={pagoForm.referencia}
                  onChange={(event) =>
                    setPagoForm((current) => ({
                      ...current,
                      referencia: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setPagoTouched((current) => ({ ...current, referencia: true }))
                  }
                  placeholder="Folio o referencia de transferencia"
                />
              </Field>
            )}

            <Field label="Concepto" htmlFor="pago-concepto">
              <select
                id="pago-concepto"
                className={inputClass()}
                value={pagoForm.concepto_pago}
                onChange={(event) => {
                  setPagoConceptoTouched(true);
                  setPagoForm((current) => ({
                    ...current,
                    concepto_pago: event.target.value,
                  }));
                }}
              >
                <option value="anticipo">Anticipo</option>
                <option value="abono">Abono</option>
                <option value="liquidacion">Liquidación</option>
              </select>
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(estadoTarget)}
        onClose={() => !savingEstado && setEstadoTarget(null)}
        title={`Cambiar estado · ${estadoTarget?.folio ?? ''}`}
        description="Selecciona el siguiente estado disponible para este pedido."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEstadoTarget(null)}
              disabled={savingEstado}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-estado-pedido"
              loading={savingEstado}
              disabled={!estadoTarget || getEstadosPosibles(estadoTarget).length === 0 || !estadoForm.estado}
            >
              Guardar estado
            </Button>
          </>
        }
      >
        {estadoTarget && (() => {
          const posibles = getEstadosPosibles(estadoTarget);
          const totalPagado = Number(estadoTarget.total_pagado || 0);
          const anticipoRequerido = Number(estadoTarget.anticipo_requerido || 0);
          const saldoPendiente = Number(
            estadoTarget.saldo_pendiente ?? (Number(estadoTarget.total || 0) - totalPagado),
          );
          const faltaAnticipo = totalPagado < anticipoRequerido;

          return (
            <form id="form-estado-pedido" className="space-y-4" onSubmit={handleCambiarEstado}>
              {error && <Alert>{error}</Alert>}

              <div className="rounded-xl bg-sand/70 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Estado actual:</span>
                  <EstadoBadge estado={estadoTarget.estado} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-line/60">
                  <span>Total: <strong>{formatMoney(estadoTarget.total)}</strong></span>
                  <span>Pagado: <strong className="text-forest">{formatMoney(totalPagado)}</strong></span>
                  <span>Saldo: <strong className={saldoPendiente > 0 ? 'text-danger' : 'text-forest'}>{formatMoney(saldoPendiente)}</strong></span>
                </div>
              </div>

              {posibles.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
                  <p className="font-semibold">
                    No hay cambios de estado disponibles en este momento.
                  </p>
                  {estadoTarget.estado === 'pendiente' && faltaAnticipo && (
                    <p className="text-xs text-amber-800">
                      Este pedido requiere cubrir el anticipo mínimo de <strong>{formatMoney(anticipoRequerido)}</strong> para pasar a elaboración (pagado: {formatMoney(totalPagado)}). Registra un abono primero.
                    </p>
                  )}
                  {saldoPendiente > 0 && (
                    <p className="text-xs text-amber-800">
                      Para marcarse como entregado, el pedido debe estar completamente liquidado. Saldo pendiente: <strong>{formatMoney(saldoPendiente)}</strong>.
                    </p>
                  )}
                </div>
              ) : (
                <Field label="Siguiente estado" htmlFor="estado-pedido">
                  <select
                    id="estado-pedido"
                    className={inputClass()}
                    value={estadoForm.estado}
                    onChange={(event) =>
                      setEstadoForm((current) => ({
                        ...current,
                        estado: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecciona el siguiente estado</option>
                    {posibles.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Observaciones" htmlFor="estado-observaciones">
                <textarea
                  id="estado-observaciones"
                  rows="3"
                  maxLength={1000}
                  className={inputClass()}
                  value={estadoForm.observaciones}
                  onChange={(event) =>
                    setEstadoForm((current) => ({
                      ...current,
                      observaciones: event.target.value,
                    }))
                  }
                  placeholder="Notas del cambio de estado"
                />
              </Field>
            </form>
          );
        })()}
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => !savingCancel && setCancelTarget(null)}
        title={`Cancelar pedido · ${cancelTarget?.folio ?? ''}`}
        description="Se devolverán al inventario las piezas del pedido y se registrará el motivo."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
              disabled={savingCancel}
            >
              Volver
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="form-cancelar-pedido"
              loading={savingCancel}
            >
              Cancelar pedido
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <form id="form-cancelar-pedido" className="space-y-4" onSubmit={handleCancelarPedido}>
            {error && <Alert>{error}</Alert>}

            <div className="rounded-xl bg-sand/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Pagado del pedido</span>
                <span className="font-semibold text-ink">
                  {formatMoney(cancelTarget.total_pagado)}
                </span>
              </div>
            </div>

            <Field label="Motivo de cancelación" htmlFor="cancelar-motivo">
              <textarea
                id="cancelar-motivo"
                rows="3"
                maxLength={255}
                className={inputClass()}
                value={cancelForm.motivo}
                onChange={(event) =>
                  setCancelForm((current) => ({
                    ...current,
                    motivo: event.target.value,
                  }))
                }
                placeholder="Cliente canceló, error de captura, etc."
                required
              />
            </Field>

            {canDevoluciones ? (
              <Field
                label="Monto a devolver"
                htmlFor="cancelar-monto"
                hint="Puede ser 0 si no se devolverá dinero."
              >
                <input
                  id="cancelar-monto"
                  type="number"
                  min="0"
                  max={cancelTarget.total_pagado}
                  step="0.01"
                  className={inputClass()}
                  value={cancelForm.monto_devolucion}
                  onChange={(event) =>
                    setCancelForm((current) => ({
                      ...current,
                      monto_devolucion: event.target.value,
                    }))
                  }
                />
              </Field>
            ) : (
              Number(cancelTarget.total_pagado) > 0 && (
                <div className="rounded-xl border border-sand-dark/60 bg-sand/30 p-3 text-xs text-muted">
                  <p className="font-semibold text-ink">Devolución monetaria no permitida</p>
                  <p>
                    Puedes cancelar el pedido, pero para autorizar la devolución de los ${formatMoney(cancelTarget.total_pagado)} pagados se requiere un Administrador o Supervisor.
                  </p>
                </div>
              )
            )}

            {Number(cancelForm.monto_devolucion) > 0 && (
              <>
                <Field label="Método de devolución" htmlFor="cancelar-metodo">
                  <select
                    id="cancelar-metodo"
                    className={inputClass()}
                    value={cancelForm.metodo_devolucion}
                    onChange={(event) =>
                      setCancelForm((current) => ({
                        ...current,
                        metodo_devolucion: event.target.value,
                      }))
                    }
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </Field>

                <Field label="Empleado que autoriza" htmlFor="cancelar-autoriza">
                  <select
                    id="cancelar-autoriza"
                    className={inputClass()}
                    value={cancelForm.id_empleado_autoriza}
                    onChange={(event) =>
                      setCancelForm((current) => ({
                        ...current,
                        id_empleado_autoriza: event.target.value,
                      }))
                    }
                  >
                    {empleados.map((empleado) => (
                      <option key={empleado.id_empleado} value={empleado.id_empleado}>
                        {empleado.nombre} {empleado.apellido_paterno}
                      </option>
                    ))}
                  </select>
                </Field>

                {cancelForm.metodo_devolucion === 'efectivo' && (
                  <p className="text-xs text-muted">
                    La devolución en efectivo se descuenta de la caja abierta del empleado que
                    procesa la cancelación o, en su defecto, de la de quien autoriza.
                  </p>
                )}
              </>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={quickClienteModalOpen}
        onClose={() => !quickClienteLoading && setQuickClienteModalOpen(false)}
        title="Registrar cliente rápido"
        description="Captura los datos del cliente para asociarlo directamente a este pedido."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setQuickClienteModalOpen(false)}
              disabled={quickClienteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="form-quick-cliente"
              loading={quickClienteLoading}
            >
              Guardar y seleccionar
            </Button>
          </>
        }
      >
        <form id="form-quick-cliente" className="space-y-4" onSubmit={handleGuardarClienteRapido}>
          {quickClienteError && <Alert>{quickClienteError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="quick-nombre" required>
              <input
                id="quick-nombre"
                type="text"
                className={inputClass()}
                value={quickClienteForm.nombre}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                placeholder="Nombre(s)"
                required
              />
            </Field>

            <Field label="Apellido paterno" htmlFor="quick-apellido" required>
              <input
                id="quick-apellido"
                type="text"
                className={inputClass()}
                value={quickClienteForm.apellido_paterno}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, apellido_paterno: e.target.value }))
                }
                placeholder="Apellido paterno"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Apellido materno" htmlFor="quick-apellido-materno">
              <input
                id="quick-apellido-materno"
                type="text"
                className={inputClass()}
                value={quickClienteForm.apellido_materno}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, apellido_materno: e.target.value }))
                }
                placeholder="Apellido materno"
              />
            </Field>

            <Field label="Teléfono" htmlFor="quick-telefono" hint="10 dígitos numéricos" required>
              <input
                id="quick-telefono"
                type="tel"
                maxLength={15}
                className={inputClass()}
                value={quickClienteForm.telefono}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, telefono: e.target.value }))
                }
                placeholder="Ej. 9511234567"
                required
              />
            </Field>

            <Field label="Correo (opcional)" htmlFor="quick-correo">
              <input
                id="quick-correo"
                type="email"
                className={inputClass()}
                value={quickClienteForm.correo}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, correo: e.target.value }))
                }
                placeholder="correo@ejemplo.com"
              />
            </Field>
          </div>

          <Field label="Dirección / Referencia" htmlFor="quick-direccion">
            <input
              id="quick-direccion"
              type="text"
              className={inputClass()}
              value={quickClienteForm.direccion}
              onChange={(e) =>
                setQuickClienteForm((prev) => ({ ...prev, direccion: e.target.value }))
              }
              placeholder="Calle, número o referencia de entrega"
            />
          </Field>

          <div className="rounded-xl border border-line bg-sand/30 p-3.5">
            <label htmlFor="quick-es-frecuente" className="flex items-start gap-3 cursor-pointer select-none">
              <input
                id="quick-es-frecuente"
                type="checkbox"
                checked={quickClienteForm.es_frecuente}
                onChange={(e) =>
                  setQuickClienteForm((prev) => ({ ...prev, es_frecuente: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-line text-charcoal focus:ring-charcoal"
              />
              <div>
                <span className="font-semibold text-sm text-ink">¿Cliente frecuente?</span>
                <p className="text-xs text-muted mt-0.5">
                  {quickClienteForm.es_frecuente
                    ? 'Se guardará en el apartado de Clientes para futuras compras.'
                    : 'Solo se guardarán sus datos para este pedido (no se guardará en el apartado de clientes).'}
                </p>
              </div>
            </label>
          </div>
        </form>
      </Modal>
    </>
  ) : (
    <DevolucionesPage embedded />
  )}
</div>
);
}
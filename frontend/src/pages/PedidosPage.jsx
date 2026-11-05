import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
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
  { value: 'parcial', label: 'Parcial' },
  { value: 'liquidado', label: 'Liquidado' },
];

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
  cobrar_ahora: true,
  pago_inicial: {
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    id_empleado: '',
  },
};

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
          <dt className="text-muted">Descuento</dt>
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
        {totals.cobrarAhora && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Saldo después del pago inicial</dt>
            <dd className="font-semibold text-ink">{formatMoney(totals.saldoDespues)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function PedidosPage() {
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
  const [filtroSucursal, setFiltroSucursal] = useState('');
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

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters = {};
      if (debouncedSearch) filters.search = debouncedSearch;
      if (filtroEstado) filters.estado = filtroEstado;
      if (filtroPago) filters.estado_pago = filtroPago;
      if (filtroSucursal) filters.id_sucursal = filtroSucursal;

      const [pedidosRes, statsRes] = await Promise.all([
        pedidosApi.list(filters),
        pedidosApi.stats(),
      ]);

      setPedidos(pedidosRes.data || []);
      setStats(statsRes.data || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filtroEstado, filtroPago, filtroSucursal]);

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

    const idEmpleadoCaja = pagoForm.id_empleado || pagoTarget.id_empleado;
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
  }, [pagoTarget, pagoForm.id_empleado]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4500);
    return () => clearTimeout(timer);
  }, [success]);

  const totals = useMemo(() => {
    const productosDetalle = createForm.productos.map((row) => {
      const item = inventario.find(
        (inventarioItem) =>
          String(inventarioItem.id_producto) === String(row.id_producto),
      );
      const precio = Number(item?.producto_precio || 0);
      const cantidad = Number(row.cantidad || 0);

      return {
        ...row,
        item,
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

    let descuento = 0;
    if (createForm.descuento_tipo === 'mayoreo') {
      if (totalPiezas >= MAYOREO_MINIMO) {
        descuento = Math.round((subtotal * MAYOREO_PORCENTAJE) / 100);
      }
    } else if (createForm.descuento_tipo === 'manual') {
      descuento = Number(createForm.descuento_monto || 0);
    }

    descuento = Math.min(descuento, subtotal);

    const costoEnvio =
      createForm.forma_entrega === 'en_local'
        ? 0
        : Number(createForm.costo_envio || 0);
    const total = Math.max(subtotal - descuento + costoEnvio, 0);
    const anticipo = Math.ceil((total * ANTICIPO_PORCENTAJE) / 100);
    const montoInicial = createForm.cobrar_ahora
      ? Number(createForm.pago_inicial.monto || 0)
      : 0;

    return {
      productosDetalle,
      subtotalProductos,
      subtotalServicios,
      subtotal,
      totalPiezas,
      descuento,
      costoEnvio,
      total,
      anticipo,
      montoInicial,
      saldoDespues: Math.max(total - montoInicial, 0),
      cobrarAhora: createForm.cobrar_ahora,
    };
  }, [createForm, inventario]);

  const productosDisponibles = useMemo(
    () =>
      inventario.filter(
        (item) =>
          Number(item.stock_actual) > 0 &&
          (!item.producto_estado || item.producto_estado === 'activo'),
      ),
    [inventario],
  );

  function abrirNuevoPedido() {
    const empleado =
      empleados.find((item) => item.rol === 'empleado') ?? empleados[0];
    const cliente = clientes[0];

    setCreateForm({
      ...EMPTY_FORM,
      id_cliente: cliente ? String(cliente.id_cliente) : '',
      id_empleado: empleado ? String(empleado.id_empleado) : '',
      id_sucursal: empleado ? String(empleado.id_sucursal) : '',
      pago_inicial: {
        ...EMPTY_FORM.pago_inicial,
        id_empleado: empleado ? String(empleado.id_empleado) : '',
      },
    });
    setCreateError('');
    setCreateOpen(true);
  }

  function handleFormChange(field, value) {
    setCreateForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'id_empleado') {
        const empleado = empleados.find(
          (item) => String(item.id_empleado) === String(value),
        );
        if (empleado) {
          next.id_sucursal = String(empleado.id_sucursal);
          next.productos = [];
          next.pago_inicial = {
            ...current.pago_inicial,
            id_empleado: String(empleado.id_empleado),
          };
        }
      }

      if (field === 'id_sucursal') {
        next.productos = [];
      }

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

  function handlePagoInicialChange(field, value) {
    setCreateForm((current) => ({
      ...current,
      pago_inicial: {
        ...current.pago_inicial,
        [field]: value,
      },
    }));
  }

  function handleCobrarAhoraChange(checked) {
    setCreateForm((current) => ({
      ...current,
      cobrar_ahora: checked,
      pago_inicial: {
        ...current.pago_inicial,
        monto: checked ? current.pago_inicial.monto : '',
      },
    }));
  }

  function handleAddProducto() {
    const selectedIds = new Set(
      createForm.productos.map((item) => String(item.id_producto)),
    );
    const available = productosDisponibles.find(
      (item) => !selectedIds.has(String(item.id_producto)),
    );

    if (!available) {
      setCreateError('No hay más productos con existencias disponibles en esta sucursal.');
      return;
    }

    setCreateError('');
    setCreateForm((current) => ({
      ...current,
      productos: [
        ...current.productos,
        { id_producto: String(available.id_producto), cantidad: 1 },
      ],
    }));
  }

  function handleProductoChange(index, value) {
    const duplicate = createForm.productos.some(
      (item, itemIndex) =>
        itemIndex !== index && String(item.id_producto) === String(value),
    );

    if (duplicate) {
      setCreateError('Ese producto ya está agregado en el pedido.');
      return;
    }

    setCreateError('');
    setCreateForm((current) => ({
      ...current,
      productos: current.productos.map((item, itemIndex) =>
        itemIndex === index ? { ...item, id_producto: value } : item,
      ),
    }));
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

    if (!createForm.id_cliente || !createForm.id_empleado || !createForm.id_sucursal) {
      setCreateError('Selecciona cliente, empleado y sucursal.');
      return;
    }

    if (createForm.productos.length === 0 && createForm.servicios.length === 0) {
      setCreateError('Agrega al menos un producto o un servicio al pedido.');
      return;
    }

    for (const [index, row] of totals.productosDetalle.entries()) {
      if (!row.item) {
        setCreateError(`El producto de la fila ${index + 1} no está disponible.`);
        return;
      }

      if (Number(row.cantidad) <= 0) {
        setCreateError(`La cantidad del producto ${index + 1} debe ser mayor a cero.`);
        return;
      }

      if (Number(row.cantidad) > Number(row.item.stock_actual)) {
        setCreateError(
          `Stock insuficiente para ${row.item.producto_nombre}. Disponible: ${row.item.stock_actual}.`,
        );
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

    if (
      createForm.descuento_tipo === 'manual' &&
      (!createForm.id_descuento_autoriza || !createForm.descuento_motivo.trim())
    ) {
      setCreateError('El descuento manual requiere monto, motivo y empleado que autoriza.');
      return;
    }

    if (createForm.descuento_tipo === 'manual' && Number(createForm.descuento_monto) > totals.subtotal) {
      setCreateError('El descuento no puede exceder el subtotal.');
      return;
    }

    let pagoInicial = null;
    if (createForm.cobrar_ahora && totals.total > 0) {
      const monto = Number(
        createForm.pago_inicial.monto === ''
          ? totals.anticipo
          : createForm.pago_inicial.monto,
      );

      if (!Number.isFinite(monto) || monto <= 0) {
        setCreateError('Captura el monto del pago inicial.');
        return;
      }

      if (monto < totals.anticipo && monto < totals.total) {
        setCreateError(
          `El anticipo mínimo es ${formatMoney(totals.anticipo)}. Si no vas a cobrar ahora, desmarca la opción.`,
        );
        return;
      }

      if (monto > totals.total) {
        setCreateError('El pago inicial no puede exceder el total del pedido.');
        return;
      }

      pagoInicial = {
        monto,
        metodo_pago: createForm.pago_inicial.metodo_pago,
        referencia: createForm.pago_inicial.referencia.trim() || null,
        id_empleado: Number(
          createForm.pago_inicial.id_empleado || createForm.id_empleado,
        ),
      };
    }

    try {
      setSaving(true);
      setCreateError('');
      setSuccess('');

      await pedidosApi.create({
        id_cliente: Number(createForm.id_cliente),
        id_empleado: Number(createForm.id_empleado),
        id_sucursal: Number(createForm.id_sucursal),
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
        descuento_tipo: createForm.descuento_tipo,
        descuento_monto:
          createForm.descuento_tipo === 'manual'
            ? Number(createForm.descuento_monto) || 0
            : 0,
        descuento_motivo:
          createForm.descuento_tipo === 'manual'
            ? createForm.descuento_motivo.trim()
            : null,
        id_descuento_autoriza:
          createForm.descuento_tipo === 'manual'
            ? Number(createForm.id_descuento_autoriza)
            : null,
        observaciones: createForm.observaciones.trim() || null,
        productos: createForm.productos.map((item) => ({
          id_producto: Number(item.id_producto),
          cantidad: Number(item.cantidad),
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
    id_empleado: pagoForm.id_empleado ? '' : 'Selecciona un empleado.',
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
    setPagoForm({
      monto,
      metodo_pago: 'efectivo',
      referencia: '',
      id_empleado: String(pedido.id_empleado),
      concepto_pago: conceptoPagoPorDefecto(pedido, Number(monto)),
    });
    setPagoTouched({});
    setPagoConceptoTouched(false);
  }

  async function handleRegistrarPago(event) {
    event.preventDefault();

    const monto = Number(pagoForm.monto);
    if (Object.values(pagoFieldErrors).some(Boolean)) {
      setPagoTouched({ monto: true, referencia: true, id_empleado: true });
      return;
    }

    try {
      setSavingPago(true);
      setError('');
      setSuccess('');
      await pedidosApi.addPago(pagoTarget.id_pedido, {
        monto,
        metodo_pago: pagoForm.metodo_pago,
        referencia:
          pagoForm.metodo_pago === 'transferencia'
            ? pagoForm.referencia.trim()
            : null,
        id_empleado: Number(pagoForm.id_empleado || pagoTarget.id_empleado),
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
    const siguiente = {
      pendiente: 'en_proceso',
      en_proceso: 'terminado',
      terminado: 'entregado',
    }[pedido.estado];

    setEstadoTarget(pedido);
    setEstadoForm({
      estado: siguiente || '',
      id_empleado_entrega: String(pedido.id_empleado),
      observaciones: '',
    });
  }

  async function handleCambiarEstado(event) {
    event.preventDefault();

    if (!estadoForm.estado) {
      setError('Selecciona el siguiente estado del pedido.');
      return;
    }

    if (estadoForm.estado === 'entregado' && !estadoForm.id_empleado_entrega) {
      setError('Selecciona el empleado que realiza la entrega.');
      return;
    }

    try {
      setSavingEstado(true);
      setError('');
      setSuccess('');
      await pedidosApi.cambiarEstado(estadoTarget.id_pedido, {
        estado: estadoForm.estado,
        id_empleado_entrega:
          estadoForm.estado === 'entregado'
            ? Number(estadoForm.id_empleado_entrega)
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

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Registra ventas, apartados y servicios de bordado; controla pagos, entregas y cancelaciones."
      >
        <Button onClick={abrirNuevoPedido} disabled={clientes.length === 0 || empleados.length === 0}>
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
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
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

          <Field label="Sucursal" htmlFor="pedido-sucursal">
            <select
              id="pedido-sucursal"
              className={inputClass()}
              value={filtroSucursal}
              onChange={(event) => setFiltroSucursal(event.target.value)}
            >
              <option value="">Todas</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Button variant="secondary" onClick={loadPedidos} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </Button>
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
              <Button onClick={abrirNuevoPedido} disabled={clientes.length === 0 || empleados.length === 0}>
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
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
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
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
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
                              Registrar pago
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => abrirDetalle(pedido)}>
                      Ver detalle
                    </Button>
                    {puedeCobrar(pedido) && (
                      <Button size="sm" onClick={() => abrirPago(pedido)}>
                          Registrar pago
                      </Button>
                    )}
                    {puedeCambiarEstado(pedido) && (
                      <Button variant="secondary" size="sm" onClick={() => abrirEstado(pedido)}>
                        Estado
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
            <Button type="submit" form="form-nuevo-pedido" loading={saving}>
              Crear pedido
            </Button>
          </>
        }
      >
        <form id="form-nuevo-pedido" className="space-y-6" onSubmit={handleCrearPedido}>
          {createError && <Alert>{createError}</Alert>}

          {clientes.length === 0 && (
            <Alert>
              <p className="font-semibold">No hay clientes registrados.</p>
              <p className="mt-1">
                Registra un cliente en{' '}
                <Link to="/clientes?nuevo=1" className="font-semibold underline">
                  Clientes
                </Link>{' '}
                antes de crear un pedido.
              </p>
            </Alert>
          )}

          {empleados.length === 0 && (
            <Alert>
              <p className="font-semibold">No hay empleados activos.</p>
              <p className="mt-1">
                Registra un empleado en{' '}
                <Link to="/empleados?nuevo=1" className="font-semibold underline">
                  Empleados
                </Link>{' '}
                antes de crear un pedido.
              </p>
            </Alert>
          )}

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Cliente y responsable</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente" htmlFor="pedido-cliente">
                <select
                  id="pedido-cliente"
                  className={inputClass()}
                  value={createForm.id_cliente}
                  onChange={(event) => handleFormChange('id_cliente', event.target.value)}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nombre} {cliente.apellido_paterno} · {cliente.telefono}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Empleado" htmlFor="pedido-empleado">
                <select
                  id="pedido-empleado"
                  className={inputClass()}
                  value={createForm.id_empleado}
                  onChange={(event) => handleFormChange('id_empleado', event.target.value)}
                  required
                >
                  <option value="">Selecciona un empleado</option>
                  {empleados.map((empleado) => (
                    <option key={empleado.id_empleado} value={empleado.id_empleado}>
                      {empleado.nombre} {empleado.apellido_paterno} · {empleado.sucursal}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Sucursal"
                htmlFor="pedido-sucursal-form"
                hint="Se asigna automáticamente según el empleado."
              >
                <select
                  id="pedido-sucursal-form"
                  className={inputClass()}
                  value={createForm.id_sucursal}
                  disabled
                >
                  <option value="">Selecciona una sucursal</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </Field>

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
                  El stock se descuenta al crear el pedido.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddProducto}
                disabled={!createForm.id_sucursal || productosDisponibles.length === 0}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar producto
              </Button>
            </div>

            {createForm.productos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                {createForm.id_sucursal
                  ? 'Agrega al menos un producto con existencias.'
                  : 'Selecciona una sucursal para consultar el inventario.'}
              </div>
            ) : (
              <div className="space-y-2">
                {totals.productosDetalle.map((row, index) => (
                  <div
                    key={`${row.id_producto}-${index}`}
                    className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end"
                  >
                    <Field label="Producto" htmlFor={`producto-${index}`}>
                      <select
                        id={`producto-${index}`}
                        className={inputClass()}
                        value={row.id_producto}
                        onChange={(event) =>
                          handleProductoChange(index, event.target.value)
                        }
                      >
                        <option value="">Selecciona un producto</option>
                        {productosDisponibles.map((item) => (
                          <option key={item.id_inventario} value={item.id_producto}>
                            {item.producto_nombre} · {item.producto_color} · {item.producto_talla} · stock {item.stock_actual}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Cantidad" htmlFor={`cantidad-${index}`}>
                      <input
                        id={`cantidad-${index}`}
                        type="number"
                        min="1"
                        max={row.item?.stock_actual || undefined}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de descuento" htmlFor="pedido-descuento-tipo">
                <select
                  id="pedido-descuento-tipo"
                  className={inputClass()}
                  value={createForm.descuento_tipo}
                  onChange={(event) =>
                    handleFormChange('descuento_tipo', event.target.value)
                  }
                >
                  <option value="ninguno">Sin descuento</option>
                  <option value="mayoreo">Mayoreo automático</option>
                  <option value="manual">Manual autorizado</option>
                </select>
              </Field>

              {createForm.descuento_tipo === 'mayoreo' && (
                <div className="rounded-xl bg-sand/70 px-4 py-3 text-sm text-muted">
                  Se aplica {MAYOREO_PORCENTAJE}% cuando el pedido tiene {MAYOREO_MINIMO} piezas o más.
                  Piezas actuales: <strong className="text-ink">{totals.totalPiezas}</strong>.
                </div>
              )}

              {createForm.descuento_tipo === 'manual' && (
                <>
                  <Field label="Monto del descuento" htmlFor="pedido-descuento-monto">
                    <input
                      id="pedido-descuento-monto"
                      type="number"
                      min="0"
                      step="1"
                      className={inputClass()}
                      value={createForm.descuento_monto}
                      onChange={(event) =>
                        handleFormChange('descuento_monto', event.target.value)
                      }
                    />
                  </Field>

                  <Field label="Motivo" htmlFor="pedido-descuento-motivo">
                    <input
                      id="pedido-descuento-motivo"
                      type="text"
                      maxLength={150}
                      className={inputClass()}
                      value={createForm.descuento_motivo}
                      onChange={(event) =>
                        handleFormChange('descuento_motivo', event.target.value)
                      }
                      placeholder="Autorizado por la administradora"
                    />
                  </Field>

                  <Field label="Empleado que autoriza" htmlFor="pedido-descuento-autoriza">
                    <select
                      id="pedido-descuento-autoriza"
                      className={inputClass()}
                      value={createForm.id_descuento_autoriza}
                      onChange={(event) =>
                        handleFormChange('id_descuento_autoriza', event.target.value)
                      }
                    >
                      <option value="">Selecciona quién autoriza</option>
                      {empleados.map((empleado) => (
                        <option key={empleado.id_empleado} value={empleado.id_empleado}>
                          {empleado.nombre} {empleado.apellido_paterno} · {empleado.rol}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Pago inicial</h3>

            <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-line text-clay focus:ring-clay"
                checked={createForm.cobrar_ahora}
                onChange={(event) => handleCobrarAhoraChange(event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-ink">Registrar pago ahora</span>
                <span className="block text-muted">
                  Puedes cobrar el anticipo del 50% o liquidar el total. Si no cobras ahora,
                  el pedido queda pendiente y podrás registrarlo después en Pagos.
                </span>
              </span>
            </label>

            {createForm.cobrar_ahora && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Monto"
                  htmlFor="pedido-pago-monto"
                  hint={`Anticipo mínimo: ${formatMoney(totals.anticipo)}`}
                >
                  <input
                    id="pedido-pago-monto"
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass()}
                    value={createForm.pago_inicial.monto}
                    onChange={(event) =>
                      handlePagoInicialChange('monto', event.target.value)
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
                  </select>
                </Field>

                <Field label="Referencia" htmlFor="pedido-pago-referencia">
                  <input
                    id="pedido-pago-referencia"
                    type="text"
                    maxLength={50}
                    className={inputClass()}
                    value={createForm.pago_inicial.referencia}
                    onChange={(event) =>
                      handlePagoInicialChange('referencia', event.target.value)
                    }
                    placeholder="Folio o referencia de transferencia"
                  />
                </Field>

                <Field label="Empleado que recibe" htmlFor="pedido-pago-empleado">
                  <select
                    id="pedido-pago-empleado"
                    className={inputClass()}
                    value={createForm.pago_inicial.id_empleado}
                    onChange={(event) =>
                      handlePagoInicialChange('id_empleado', event.target.value)
                    }
                  >
                    {empleados.map((empleado) => (
                      <option key={empleado.id_empleado} value={empleado.id_empleado}>
                        {empleado.nombre} {empleado.apellido_paterno}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePagoInicialChange('monto', String(totals.anticipo))}
                  >
                    Usar anticipo 50%
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePagoInicialChange('monto', String(totals.total))}
                  >
                    Liquidar total
                  </Button>
                </div>
              </div>
            )}

            {checkingCaja ? (
              <p className="text-xs text-muted">Verificando caja abierta…</p>
            ) : createForm.cobrar_ahora && !cajaAbierta ? (
              <Alert>
                <p className="font-semibold">El empleado no tiene una caja abierta.</p>
                <p className="mt-1">
                  Si vas a cobrar ahora, abre una caja en{' '}
                  <Link to="/caja" className="font-semibold underline">
                    Corte de caja
                  </Link>
                  . También puedes desmarcar “Registrar pago ahora” y cobrar después.
                </p>
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
                Registrar pago
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
                <dt className="text-xs text-muted">Empleado</dt>
                <dd className="mt-1 font-semibold">{detail.empleado_nombre}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Fecha</dt>
                <dd className="mt-1 font-semibold">
                  {formatDateTime(detail.fecha_pedido)}
                </dd>
              </div>
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
                <p className="font-semibold">No hay caja abierta para este empleado.</p>
                <p className="mt-1">
                  Abre una caja en{' '}
                  <Link to="/caja" className="font-semibold underline">
                    Corte de caja
                  </Link>{' '}
                  antes de cobrar.
                </p>
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

            <Field
              label="Empleado que recibe"
              htmlFor="pago-empleado"
              error={visiblePagoFieldErrors.id_empleado}
            >
              <select
                id="pago-empleado"
                className={inputClass(visiblePagoFieldErrors.id_empleado)}
                value={pagoForm.id_empleado}
                onChange={(event) => {
                  setPagoCaja(null);
                  setPagoForm((current) => ({
                    ...current,
                    id_empleado: event.target.value,
                  }));
                }}
                onBlur={() =>
                  setPagoTouched((current) => ({ ...current, id_empleado: true }))
                }
              >
                <option value="">Selecciona un empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id_empleado} value={empleado.id_empleado}>
                    {empleado.nombre} {empleado.apellido_paterno}
                  </option>
                ))}
              </select>
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(estadoTarget)}
        onClose={() => !savingEstado && setEstadoTarget(null)}
        title={`Cambiar estado · ${estadoTarget?.folio ?? ''}`}
        description="El flujo permitido es pendiente → en proceso → terminado → entregado."
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
            <Button type="submit" form="form-estado-pedido" loading={savingEstado}>
              Guardar estado
            </Button>
          </>
        }
      >
        {estadoTarget && (
          <form id="form-estado-pedido" className="space-y-4" onSubmit={handleCambiarEstado}>
            {error && <Alert>{error}</Alert>}

            <div className="rounded-xl bg-sand/70 p-4 text-sm">
              <p className="text-muted">Estado actual</p>
              <div className="mt-2">
                <EstadoBadge estado={estadoTarget.estado} />
              </div>
            </div>

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
                {estadoTarget.estado === 'pendiente' && (
                  <option value="en_proceso">En proceso</option>
                )}
                {estadoTarget.estado === 'en_proceso' && (
                  <option value="terminado">Terminado</option>
                )}
                {estadoTarget.estado === 'terminado' && (
                  <option value="entregado">Entregado</option>
                )}
              </select>
            </Field>

            {estadoForm.estado === 'entregado' && (
              <Field label="Empleado que entrega" htmlFor="estado-empleado-entrega">
                <select
                  id="estado-empleado-entrega"
                  className={inputClass()}
                  value={estadoForm.id_empleado_entrega}
                  onChange={(event) =>
                    setEstadoForm((current) => ({
                      ...current,
                      id_empleado_entrega: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Selecciona un empleado</option>
                  {empleados.map((empleado) => (
                    <option key={empleado.id_empleado} value={empleado.id_empleado}>
                      {empleado.nombre} {empleado.apellido_paterno}
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
        )}
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
                step="1"
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
    </div>
  );
}

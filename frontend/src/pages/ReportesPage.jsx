import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  Filter,
  Layers,
  Package,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Store,
  Tag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { reportesApi } from '../api/reportes.js';
import { sucursalesApi } from '../api/sucursales.js';
import { cn } from '../lib/cn.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const TABS = [
  { id: 'ventas', label: 'Ventas y Finanzas', icon: TrendingUp },
  { id: 'productos', label: 'Top Productos', icon: Package },
  { id: 'sucursales', label: 'Por Sucursal', icon: Store },
  { id: 'detalle', label: 'Detalle de Pedidos', icon: Receipt },
];

function getPresetDates(preset) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'hoy') {
    return { inicio: todayStr, fin: todayStr };
  }

  if (preset === 'semana') {
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    return {
      inicio: monday.toISOString().split('T')[0],
      fin: todayStr,
    };
  }

  if (preset === 'mes') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      inicio: firstDay.toISOString().split('T')[0],
      fin: todayStr,
    };
  }

  if (preset === '30dias') {
    const past = new Date(now);
    past.setDate(now.getDate() - 30);
    return {
      inicio: past.toISOString().split('T')[0],
      fin: todayStr,
    };
  }

  return { inicio: '', fin: '' };
}

function getActiveSucursalId() {
  try {
    const raw = localStorage.getItem('artextilo_empleado');
    const emp = raw ? JSON.parse(raw) : null;
    return emp?.id_sucursal ? String(emp.id_sucursal) : '';
  } catch {
    return '';
  }
}

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [preset, setPreset] = useState('mes');
  const [fechaInicio, setFechaInicio] = useState(() => getPresetDates('mes').inicio);
  const [fechaFin, setFechaFin] = useState(() => getPresetDates('mes').fin);
  const [idSucursal, setIdSucursal] = useState(() => getActiveSucursalId());

  const [sucursales, setSucursales] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTable, setSearchTable] = useState('');

  // Sincronizar automáticamente si se cambia la sucursal activa con el botón junto al perfil
  useEffect(() => {
    function handleStorageChange() {
      const activeId = getActiveSucursalId();
      if (activeId) {
        setIdSucursal(activeId);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cargar sucursales para el filtro
  useEffect(() => {
    sucursalesApi
      .list()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setSucursales(list.filter((s) => s.estado === 'activa'));
      })
      .catch(() => {});
  }, []);

  const loadReporte = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await reportesApi.getReporte({
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        id_sucursal: idSucursal || undefined,
      });

      setData(response.data || null);
    } catch (err) {
      setError(err.message || 'Error al cargar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, idSucursal]);

  useEffect(() => {
    loadReporte();
  }, [loadReporte]);

  function handlePresetChange(newPreset) {
    setPreset(newPreset);
    if (newPreset === 'todos') {
      setFechaInicio('');
      setFechaFin('');
    } else {
      const { inicio, fin } = getPresetDates(newPreset);
      setFechaInicio(inicio);
      setFechaFin(fin);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    if (!data?.pedidos || data.pedidos.length === 0) return;

    const headers = [
      'Folio',
      'Fecha',
      'Cliente',
      'Sucursal',
      'Vendedor',
      'Piezas',
      'Total',
      'Pagado',
      'Saldo Pendiente',
      'Estado',
      'Estado Pago',
    ];

    const rows = data.pedidos.map((p) => [
      p.folio,
      `"${formatDateTime(p.fecha_pedido)}"`,
      `"${p.cliente_nombre}"`,
      `"${p.sucursal_nombre}"`,
      `"${p.empleado_nombre}"`,
      p.total_piezas,
      p.total,
      p.total_pagado,
      p.saldo_pendiente,
      p.estado,
      p.estado_pago,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `reporte_ventas_${fechaInicio || 'inicio'}_${fechaFin || 'hoy'}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredPedidos = useMemo(() => {
    if (!data?.pedidos) return [];
    if (!searchTable.trim()) return data.pedidos;
    const q = searchTable.toLowerCase();
    return data.pedidos.filter(
      (p) =>
        p.folio.toLowerCase().includes(q) ||
        p.cliente_nombre.toLowerCase().includes(q) ||
        p.sucursal_nombre.toLowerCase().includes(q) ||
        p.empleado_nombre.toLowerCase().includes(q),
    );
  }, [data, searchTable]);

  const maxVentaDia = useMemo(() => {
    if (!data?.ventas_por_dia || data.ventas_por_dia.length === 0) return 1;
    return Math.max(...data.ventas_por_dia.map((d) => d.total_dia), 1);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* CABECERA (NO IMPRIMIBLE EN PAPEL) */}
      <div className="print:hidden">
        <PageHeader
          title="Reportes y Estadísticas"
          description="Monitorea las ventas, ingresos por método de pago, productos destacados y actividad por sucursal."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleExportCSV}
              disabled={loading || !data?.pedidos?.length}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar CSV
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 bg-clay text-white shadow-sm hover:bg-clay/90"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir reporte
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* ENCABEZADO MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
      <div className="hidden border-b-2 border-clay pb-4 print:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={localStorage.getItem('artextilo_logo') || '/logo-artextilo.jpeg'}
              alt="Artextilo"
              className="h-16 w-16 object-contain"
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                Artextilo - Hilando con Amor
              </h1>
              <p className="text-xs text-muted">
                Reporte Ejecutivo de Ventas y Operaciones
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <p>
              Generado:{' '}
              <strong className="text-ink">
                {new Date().toLocaleDateString('es-MX', {
                  dateStyle: 'long',
                })}
              </strong>
            </p>
            <p>
              Periodo:{' '}
              {fechaInicio ? formatDateTime(fechaInicio).split(' ')[0] : 'Histórico'}{' '}
              al {fechaFin ? formatDateTime(fechaFin).split(' ')[0] : 'Actual'}
            </p>
            {idSucursal && (
              <p>
                Sucursal:{' '}
                {sucursales.find((s) => s.id_sucursal === Number(idSucursal))?.nombre ||
                  idSucursal}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS (OCULTA AL IMPRIMIR) */}
      <div className="rounded-2xl border border-line bg-paper p-4 shadow-soft print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Presets rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
              { id: '30dias', label: 'Últimos 30 días' },
              { id: 'todos', label: 'Todo el historial' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  preset === p.id
                    ? 'bg-clay text-white shadow-xs'
                    : 'bg-sand text-muted hover:bg-line/70 hover:text-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Rango de fechas y selector de sucursal */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted" aria-hidden="true" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setPreset('custom');
                  setFechaInicio(e.target.value);
                }}
                className="rounded-xl border border-line bg-sand px-2.5 py-1.5 text-xs font-medium text-ink focus:border-clay focus:outline-none"
                title="Fecha de inicio"
              />
              <span className="text-xs text-muted">-</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setPreset('custom');
                  setFechaFin(e.target.value);
                }}
                className="rounded-xl border border-line bg-sand px-2.5 py-1.5 text-xs font-medium text-ink focus:border-clay focus:outline-none"
                title="Fecha de fin"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-muted" aria-hidden="true" />
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
                className="rounded-xl border border-line bg-sand px-3 py-1.5 text-xs font-semibold text-ink focus:border-clay focus:outline-none"
              >
                <option value="">Todas las sucursales (Consolidado)</option>
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre}
                    {String(s.id_sucursal) === getActiveSucursalId()
                      ? ' (Tu sucursal)'
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadReporte}
              loading={loading}
              className="h-8 px-2.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Indicador contextual de sucursal */}
        <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2.5 text-xs text-muted">
          <span>
            Filtrando datos de:{' '}
            <strong className="font-semibold text-ink">
              {idSucursal
                ? sucursales.find((s) => s.id_sucursal === Number(idSucursal))?.nombre ||
                  `Sucursal #${idSucursal}`
                : 'Todas las sucursales (Consolidado general)'}
            </strong>
            {idSucursal && String(idSucursal) === getActiveSucursalId() && (
              <span className="ml-1.5 rounded-full bg-clay/10 px-2 py-0.5 text-[0.65rem] font-bold text-clay">
                Sucursal activa en sesión
              </span>
            )}
          </span>

          {idSucursal && (
            <button
              type="button"
              onClick={() => setIdSucursal('')}
              className="font-semibold text-clay hover:underline"
            >
              Ver consolidado de todas las sucursales
            </button>
          )}
        </div>
      </div>

      {error && (
        <Alert>
          <div className="flex items-center gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadReporte}
              className="font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        </Alert>
      )}

      {/* TARJETAS DE INDICADORES (KPIS) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Ventas Totales
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-clay">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {formatMoney(data?.resumen?.total_ventas || 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {data?.resumen?.pedidos_activos || 0} pedido(s) activo(s) en el periodo
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Cobrado Efectivo / Banco
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
            {formatMoney(data?.resumen?.total_cobrado || 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Total recaudado por anticipos y liquidaciones
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Saldo Pendiente (Crédito)
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-700">
            {formatMoney(data?.resumen?.saldo_por_cobrar || 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Por liquidar de pedidos entregados o en proceso
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Ticket Promedio
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-ink">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {formatMoney(data?.resumen?.ticket_promedio || 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {data?.resumen?.total_piezas || 0} prendas/piezas vendidas en total
          </p>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN (OCULTAS AL IMPRIMIR) */}
      <div className="border-b border-line print:hidden">
        <nav className="flex space-x-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition',
                  isActive
                    ? 'border-clay text-clay'
                    : 'border-transparent text-muted hover:border-line hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}

      {/* TAB 1: VENTAS Y FINANZAS */}
      {(activeTab === 'ventas' || window.matchMedia('print').matches) && (
        <div className="space-y-6">
          {/* Desglose de Métodos de Pago y Estados */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Métodos de Pago */}
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
              <h3 className="font-display text-lg font-semibold text-ink">
                Ingresos por Método de Pago
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Distribución de los cobros procesados en caja
              </p>

              <div className="mt-5 space-y-3.5">
                {data?.pagos_por_metodo && data.pagos_por_metodo.length > 0 ? (
                  data.pagos_por_metodo.map((pago) => {
                    const totalCobrado = data.resumen.total_cobrado || 1;
                    const pct = Math.round((pago.total_monto / totalCobrado) * 100);

                    return (
                      <div key={pago.metodo_pago} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold capitalize text-ink">
                            {pago.metodo_pago} ({pago.cantidad_transacciones} pagos)
                          </span>
                          <span className="font-bold text-ink">
                            {formatMoney(pago.total_monto)}{' '}
                            <span className="font-normal text-muted">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              pago.metodo_pago === 'efectivo'
                                ? 'bg-emerald-500'
                                : pago.metodo_pago === 'tarjeta'
                                  ? 'bg-sky-500'
                                  : 'bg-clay',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-xs text-muted">
                    No hay cobros registrados en este periodo.
                  </p>
                )}
              </div>
            </div>

            {/* Pedidos por Estado */}
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
              <h3 className="font-display text-lg font-semibold text-ink">
                Estado de los Pedidos
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Flujo operativo de los pedidos en el periodo
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data?.pedidos_por_estado?.map((est) => (
                  <div
                    key={est.estado}
                    className="rounded-xl border border-line/70 bg-sand/50 p-3"
                  >
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted">
                      {est.estado.replace('_', ' ')}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-ink">
                      {est.cantidad}
                    </p>
                    <p className="text-xs text-muted">{formatMoney(est.monto)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico / Barras de Ventas por Día */}
          <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
            <h3 className="font-display text-lg font-semibold text-ink">
              Tendencia de Ventas por Día
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Comportamiento diario de la facturación en el rango de fechas
            </p>

            <div className="mt-6">
              {data?.ventas_por_dia && data.ventas_por_dia.length > 0 ? (
                <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2 pt-6">
                  {data.ventas_por_dia.map((d) => {
                    const heightPct = Math.round((d.total_dia / maxVentaDia) * 100);
                    return (
                      <div
                        key={d.fecha}
                        className="group flex min-w-[2.75rem] flex-1 flex-col items-center gap-1.5"
                      >
                        <span className="text-[0.65rem] font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100">
                          {formatMoney(d.total_dia)}
                        </span>
                        <div className="w-full rounded-t-lg bg-sand transition group-hover:bg-sand/70">
                          <div
                            className="w-full rounded-t-lg bg-clay transition-all duration-500 hover:bg-clay-strong"
                            style={{ height: `${Math.max(heightPct, 6)}%` }}
                          />
                        </div>
                        <span className="text-[0.65rem] font-medium text-muted">
                          {d.fecha.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-10 text-center text-xs text-muted">
                  No hay transacciones registradas para graficar en este periodo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP PRODUCTOS MÁS VENDIDOS */}
      {(activeTab === 'productos' || window.matchMedia('print').matches) && (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="border-b border-line pb-4">
            <h3 className="font-display text-lg font-semibold text-ink">
              Top 10 Productos Más Vendidos
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Prendas y artículos con mayor rotación e ingresos generados
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 pr-4">#</th>
                  <th className="py-3 pr-4">Producto</th>
                  <th className="py-3 pr-4">SKU / Variante</th>
                  <th className="py-3 pr-4">Categoría</th>
                  <th className="py-3 pr-4 text-center">Unidades Vendidas</th>
                  <th className="py-3 text-right">Ingresos Generados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {data?.top_productos && data.top_productos.length > 0 ? (
                  data.top_productos.map((prod, idx) => (
                    <tr key={prod.id_producto} className="hover:bg-sand/40">
                      <td className="py-3.5 pr-4 font-bold text-muted">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-ink">
                        {prod.nombre}
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-muted">
                        <span className="font-mono">{prod.sku || '-'}</span>
                        {(prod.color || prod.talla) && (
                          <span className="ml-1 text-[0.7rem] text-muted">
                            ({[prod.color, prod.talla].filter(Boolean).join(' / ')})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-muted">
                        <span className="rounded-md bg-sand px-2 py-0.5 font-medium">
                          {prod.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center font-bold text-ink">
                        {prod.total_unidades} pzas
                      </td>
                      <td className="py-3.5 text-right font-bold text-clay">
                        {formatMoney(prod.total_ingresos)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted">
                      No hay datos de productos vendidos en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENTAS POR SUCURSAL */}
      {(activeTab === 'sucursales' || window.matchMedia('print').matches) && (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="border-b border-line pb-4">
            <h3 className="font-display text-lg font-semibold text-ink">
              Rendimiento por Sucursal
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Comparativa de volumen de pedidos y ventas totales en cada sucursal
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.ventas_por_sucursal?.map((suc) => (
              <div
                key={suc.id_sucursal}
                className="rounded-2xl border border-line bg-sand/30 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/10 text-clay">
                    <Store className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{suc.sucursal_nombre}</h4>
                    <p className="text-xs text-muted">
                      {suc.total_pedidos} pedido(s) registrados
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-line/70 pt-3">
                  <p className="text-xs text-muted">Total facturado:</p>
                  <p className="font-display text-2xl font-bold text-clay">
                    {formatMoney(suc.total_ventas)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DETALLE DE PEDIDOS Y TRANSACCIONES */}
      {(activeTab === 'detalle' || window.matchMedia('print').matches) && (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
          <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">
                Historial de Transacciones del Periodo
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Listado detallado de pedidos para auditoría y arqueo
              </p>
            </div>

            <div className="relative w-full sm:w-64 print:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por folio o cliente..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="w-full rounded-xl border border-line bg-sand py-1.5 pl-8 pr-3 text-xs text-ink focus:border-clay focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2.5 pr-3">Folio</th>
                  <th className="py-2.5 pr-3">Fecha</th>
                  <th className="py-2.5 pr-3">Cliente</th>
                  <th className="py-2.5 pr-3">Sucursal</th>
                  <th className="py-2.5 pr-3">Piezas</th>
                  <th className="py-2.5 pr-3 text-right">Total</th>
                  <th className="py-2.5 pr-3 text-right">Pagado</th>
                  <th className="py-2.5 pr-3 text-right">Saldo</th>
                  <th className="py-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {filteredPedidos.length > 0 ? (
                  filteredPedidos.map((ped) => (
                    <tr key={ped.id_pedido} className="hover:bg-sand/30">
                      <td className="py-2.5 pr-3 font-mono font-bold text-ink">
                        {ped.folio}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">
                        {formatDateTime(ped.fecha_pedido)}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-ink">
                        {ped.cliente_nombre}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">
                        {ped.sucursal_nombre}
                      </td>
                      <td className="py-2.5 pr-3 text-center text-muted">
                        {ped.total_piezas}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-ink">
                        {formatMoney(ped.total)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-emerald-700">
                        {formatMoney(ped.total_pagado)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-amber-700">
                        {ped.saldo_pendiente > 0
                          ? formatMoney(ped.saldo_pendiente)
                          : '-'}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
                            ped.estado === 'entregado'
                              ? 'bg-emerald-50 text-emerald-800'
                              : ped.estado === 'cancelado'
                                ? 'bg-danger/10 text-danger'
                                : 'bg-sand text-muted',
                          )}
                        >
                          {ped.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-muted">
                      No se encontraron transacciones coincidentes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

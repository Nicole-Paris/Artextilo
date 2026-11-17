import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import Alert from '../components/Alert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { cajaApi } from '../api/caja.js';
import { inventarioApi } from '../api/inventario.js';
import { pedidosApi } from '../api/pedidos.js';
import { cn } from '../lib/cn.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

const PEDIDOS_ESTADOS = [
  { key: 'pendientes', label: 'Pendientes', color: 'bg-amber-400' },
  { key: 'en_proceso', label: 'En proceso', color: 'bg-sky-400' },
  { key: 'terminados', label: 'Terminados', color: 'bg-violet-400' },
  { key: 'entregados', label: 'Entregados', color: 'bg-forest' },
  { key: 'cancelados', label: 'Cancelados', color: 'bg-danger' },
];

const EMPTY_DATA = {
  pedidos: {
    total: 0,
    pendientes: 0,
    en_proceso: 0,
    terminados: 0,
    entregados: 0,
    cancelados: 0,
    total_ventas: 0,
    saldo_por_cobrar: 0,
  },
  inventario: {
    total_productos_asignados: 0,
    total_piezas_stock: 0,
    total_bajo_stock: 0,
    total_agotados: 0,
  },
  abiertas: [],
  ultimosCortes: [],
};

function StatCard({ icon: Icon, label, value, hint, tone = 'clay' }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            tone === 'forest' ? 'bg-sage text-forest' : 'bg-sand text-clay',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, description, to, linkLabel, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {to && (
          <Link
            to={to}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-clay transition hover:bg-clay/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            {linkLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="px-5 py-4 sm:px-6">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResumen = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [pedidosRes, inventarioRes, abiertasRes, historialRes] =
        await Promise.all([
          pedidosApi.stats(),
          inventarioApi.getStats(),
          cajaApi.list({ estado: 'abierto' }),
          cajaApi.list({ estado: 'cerrado', limit: 5 }),
        ]);

      setData({
        pedidos: { ...EMPTY_DATA.pedidos, ...(pedidosRes.data || {}) },
        inventario: { ...EMPTY_DATA.inventario, ...(inventarioRes.data || {}) },
        abiertas: abiertasRes.data || [],
        ultimosCortes: historialRes.data || [],
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  const saldoEnCajas = data.abiertas.reduce(
    (total, corte) => total + Number(corte.saldo_esperado || 0),
    0,
  );
  const pedidosActivos = Math.max(
    Number(data.pedidos.total || 0) - Number(data.pedidos.cancelados || 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Inicio"
        description="Resumen de ventas, caja e inventario de Artextilo."
      />

      {error && (
        <div className="mb-5">
          <Alert>
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadResumen}
                className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-sand" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Ventas registradas"
            value={formatMoney(data.pedidos.total_ventas)}
            hint={`${pedidosActivos} pedido${pedidosActivos === 1 ? '' : 's'} activo${pedidosActivos === 1 ? '' : 's'}`}
            tone="forest"
          />
          <StatCard
            icon={CircleDollarSign}
            label="Por cobrar"
            value={formatMoney(data.pedidos.saldo_por_cobrar)}
            hint="Saldo pendiente de todos los pedidos"
          />
          <StatCard
            icon={Wallet}
            label="Cajas abiertas"
            value={data.abiertas.length}
            hint={`${formatMoney(saldoEnCajas)} en efectivo esperado`}
          />
          <StatCard
            icon={Boxes}
            label="Piezas en inventario"
            value={Number(data.inventario.total_piezas_stock || 0)}
            hint={`${data.inventario.total_productos_asignados || 0} producto(s) con existencias`}
            tone="forest"
          />
        </div>
      )}

      <div className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Reportes rápidos
            </h2>
            <p className="mt-1 text-sm text-muted">
              Un vistazo al estado operativo de la tienda.
            </p>
          </div>
          <Link
            to="/pedidos"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Ver pedidos
          </Link>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <SectionCard
            title="Pedidos por estado"
            description="Distribución actual de los pedidos registrados."
            to="/pedidos"
            linkLabel="Abrir pedidos"
          >
            <ul className="space-y-3">
              {PEDIDOS_ESTADOS.map((estado) => (
                <li key={estado.key} className="flex items-center gap-3">
                  <span
                    className={cn('h-2.5 w-2.5 shrink-0 rounded-full', estado.color)}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm text-muted">{estado.label}</span>
                  <span className="font-semibold text-ink">
                    {data.pedidos[estado.key] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">Total de pedidos</span>
              <span className="font-display text-lg font-semibold text-ink">
                {data.pedidos.total ?? 0}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Inventario"
            description="Existencias y alertas de la sucursal."
            to="/inventario"
            linkLabel="Abrir inventario"
          >
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Piezas disponibles</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-ink">
                  {data.inventario.total_piezas_stock ?? 0}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Productos asignados</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-ink">
                  {data.inventario.total_productos_asignados ?? 0}
                </dd>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <dt className="text-xs text-amber-800">Bajo stock</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-amber-900">
                  {data.inventario.total_bajo_stock ?? 0}
                </dd>
              </div>
              <div className="rounded-xl bg-danger/10 p-3">
                <dt className="text-xs text-danger-strong">Agotados</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-danger-strong">
                  {data.inventario.total_agotados ?? 0}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Cajas abiertas"
            description="Turnos activos y efectivo esperado."
            to="/caja"
            linkLabel="Abrir caja"
          >
            {data.abiertas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No hay cajas abiertas en este momento.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.abiertas.slice(0, 4).map((corte) => (
                  <li
                    key={corte.id_corte_caja}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {corte.empleado_nombre}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {corte.sucursal_nombre} · Corte #{corte.id_corte_caja}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-forest">
                      {formatMoney(corte.saldo_esperado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Últimos cortes"
            description="Cierres recientes de caja."
            to="/caja"
            linkLabel="Ver historial"
          >
            {data.ultimosCortes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Todavía no hay cortes cerrados.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.ultimosCortes.map((corte) => (
                  <li
                    key={corte.id_corte_caja}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {corte.empleado_nombre}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {formatDateTime(corte.fecha_cierre)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-ink">
                        {formatMoney(corte.saldo_real ?? corte.saldo_esperado)}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          Number(corte.diferencia_saldo || 0) === 0
                            ? 'text-muted'
                            : 'text-danger',
                        )}
                      >
                        Diferencia {formatMoney(corte.diferencia_saldo ?? 0)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

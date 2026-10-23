import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, RefreshCw, ShieldCheck, Store } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { rolesApi } from '../api/roles.js';
import { sucursalesApi } from '../api/sucursales.js';

const EMPTY_RESOURCE = { data: [], loading: true, error: '' };

function ResourceError({ message, onRetry }) {
  return (
    <Alert>
      <div className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </Alert>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-sand" />
      ))}
    </div>
  );
}

function PanelHeader({ title, count, loading, error, to, linkLabel }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted" aria-live="polite">
          {loading
            ? 'Consultando…'
            : error
              ? 'Información no disponible'
              : `${count} ${count === 1 ? 'registro activo' : 'registros activos'}`}
        </p>
      </div>
      <Link
        to={to}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-clay transition hover:bg-clay/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
      >
        {linkLabel}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const [sucursales, setSucursales] = useState(EMPTY_RESOURCE);
  const [roles, setRoles] = useState(EMPTY_RESOURCE);

  const loadSucursales = useCallback(async () => {
    setSucursales((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await sucursalesApi.list();
      setSucursales({ data: response.data, loading: false, error: '' });
    } catch (requestError) {
      setSucursales((current) => ({
        ...current,
        loading: false,
        error: requestError.message,
      }));
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setRoles((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await rolesApi.list();
      setRoles({ data: response.data, loading: false, error: '' });
    } catch (requestError) {
      setRoles((current) => ({
        ...current,
        loading: false,
        error: requestError.message,
      }));
    }
  }, []);

  useEffect(() => {
    loadSucursales();
    loadRoles();
  }, [loadSucursales, loadRoles]);

  const sucursalesPreview = sucursales.data.slice(0, 3);
  const rolesPreview = roles.data.slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Inicio"
        description="El estado de tus puntos de venta y del equipo, en un solo lugar."
      >
        <Link
          to="/sucursales?nuevo=1"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Registrar sucursal
        </Link>
        <Link
          to="/roles?nuevo=1"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear rol
        </Link>
      </PageHeader>

      <div className="stitch-line mb-7 text-line" aria-hidden="true" />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          <PanelHeader
            title="Puntos de venta"
            count={sucursales.data.length}
            loading={sucursales.loading}
            error={sucursales.error}
            to="/sucursales"
            linkLabel="Ver todas"
          />

          <div className="px-5 py-2 sm:px-6">
            {sucursales.error ? (
              <div className="py-4">
                <ResourceError message={sucursales.error} onRetry={loadSucursales} />
              </div>
            ) : sucursales.loading ? (
              <LoadingRows />
            ) : sucursalesPreview.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-forest">
                  <Store className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-3 font-display text-lg font-semibold text-ink">
                  Aún no hay sucursales
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
                  Registra el primer punto de venta para empezar a operar.
                </p>
                <Link
                  to="/sucursales?nuevo=1"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-strong"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registrar sucursal
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {sucursalesPreview.map((sucursal) => (
                  <li key={sucursal.id_sucursal} className="flex items-start gap-3 py-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                      <Store className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{sucursal.nombre}</p>
                      <p className="mt-1 break-words text-sm leading-6 text-muted">
                        {sucursal.direccion} · CP {sucursal.codigo_postal}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-muted">
                        {sucursal.horario}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!sucursales.loading && !sucursales.error && sucursales.data.length > 3 && (
            <div className="border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
              y {sucursales.data.length - 3} sucursal
              {sucursales.data.length - 3 === 1 ? '' : 'es'} más
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          <PanelHeader
            title="Equipo y permisos"
            count={roles.data.length}
            loading={roles.loading}
            error={roles.error}
            to="/roles"
            linkLabel="Ver roles"
          />

          <div className="px-5 py-2 sm:px-6">
            {roles.error ? (
              <div className="py-4">
                <ResourceError message={roles.error} onRetry={loadRoles} />
              </div>
            ) : roles.loading ? (
              <LoadingRows count={4} />
            ) : rolesPreview.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-forest">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-3 font-display text-lg font-semibold text-ink">
                  Aún no hay roles
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
                  Define el primer rol para organizar al personal.
                </p>
                <Link
                  to="/roles?nuevo=1"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-strong"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear rol
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {rolesPreview.map((role) => (
                  <li key={role.id_rol} className="flex items-start gap-3 py-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand text-clay">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{role.nombre}</p>
                      <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted">
                        {role.descripcion || 'Sin descripción'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!roles.loading && !roles.error && roles.data.length > 4 && (
            <div className="border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
              y {roles.data.length - 4} rol{roles.data.length - 4 === 1 ? '' : 'es'} más
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

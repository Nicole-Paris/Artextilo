import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { cajaApi } from '../api/caja.js';
import { devolucionesApi } from '../api/devoluciones.js';
import { empleadosApi } from '../api/empleados.js';
import { pedidosApi } from '../api/pedidos.js';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';
import { formatDate, formatDateTime, formatMoney } from '../lib/format.js';

const EMPTY_FORM = {
  id_empleado_autoriza: '',
  id_empleado_procesa: '',
  monto: '',
  metodo: 'efectivo',
  motivo: '',
};

function nombreEmpleado(empleado) {
  return [
    empleado.nombre,
    empleado.apellido_paterno,
    empleado.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function MetodoBadge({ metodo }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        metodo === 'efectivo'
          ? 'bg-forest/10 text-forest'
          : 'bg-sky-100 text-sky-800',
      )}
    >
      {metodo}
    </span>
  );
}

function DetailRow({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{children || '—'}</dd>
    </div>
  );
}

export default function DevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [metodo, setMetodo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const debouncedPedidoSearch = useDebouncedValue(pedidoSearch, 300);
  const [pedidoOptions, setPedidoOptions] = useState([]);
  const [pedidoOptionsLoading, setPedidoOptionsLoading] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [resumenLoading, setResumenLoading] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [checkingCaja, setCheckingCaja] = useState(false);
  const [cajaError, setCajaError] = useState('');
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadDevoluciones = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await devolucionesApi.list({
        search: debouncedSearch,
        metodo,
        desde,
        hasta,
      });
      setDevoluciones(response.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, metodo, desde, hasta]);

  useEffect(() => {
    loadDevoluciones();
  }, [loadDevoluciones]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const empleadosResponse = await empleadosApi.list();
        setEmpleados(
          (empleadosResponse.data || []).filter(
            (empleado) => empleado.estado === 'activo',
          ),
        );
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadCatalogs();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4500);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!createOpen || !debouncedPedidoSearch.trim()) {
      setPedidoOptions([]);
      setPedidoOptionsLoading(false);
      return undefined;
    }

    let active = true;
    setPedidoOptionsLoading(true);
    pedidosApi
      .list({ search: debouncedPedidoSearch.trim() })
      .then((response) => {
        if (active) setPedidoOptions((response.data || []).slice(0, 8));
      })
      .catch((requestError) => {
        if (active) setFormError(requestError.message);
      })
      .finally(() => {
        if (active) setPedidoOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [createOpen, debouncedPedidoSearch]);

  useEffect(() => {
    if (!createOpen || !selectedPedido) {
      setResumen(null);
      setResumenLoading(false);
      return undefined;
    }

    let active = true;
    setResumen(null);
    setResumenLoading(true);
    devolucionesApi
      .resumenPedido(selectedPedido.id_pedido)
      .then((response) => {
        if (active) setResumen(response.data);
      })
      .catch((requestError) => {
        if (active) setFormError(requestError.message);
      })
      .finally(() => {
        if (active) setResumenLoading(false);
      });

    return () => {
      active = false;
    };
  }, [createOpen, selectedPedido]);

  useEffect(() => {
    if (!createOpen || form.metodo !== 'efectivo' || !form.id_empleado_procesa) {
      setCajaAbierta(null);
      setCheckingCaja(false);
      setCajaError('');
      return undefined;
    }

    let active = true;
    setCajaAbierta(null);
    setCajaError('');
    setCheckingCaja(true);
    cajaApi
      .abierta(form.id_empleado_procesa)
      .then((response) => {
        if (active) setCajaAbierta(response.data || null);
      }).catch((requestError) => {
        if (active) setCajaAbierta(null);
        if (active) setCajaError(requestError.message);
      })
      .finally(() => {
        if (active) setCheckingCaja(false);
      });

    return () => {
      active = false;
    };
  }, [createOpen, form.metodo, form.id_empleado_procesa]);

  const fieldErrors = useMemo(
    () => ({
      pedido: selectedPedido ? '' : 'Selecciona un pedido.',
      monto:
        form.monto === ''
          ? 'El monto es obligatorio.'
          : Number(form.monto) <= 0
            ? 'El monto debe ser mayor a cero.'
            : resumen && Number(form.monto) > Number(resumen.devolvible)
              ? 'El monto no puede exceder lo disponible para devolver.'
              : '',
      motivo: form.motivo.trim() ? '' : 'El motivo es obligatorio.',
      id_empleado_autoriza: form.id_empleado_autoriza
        ? ''
        : 'Selecciona quién autoriza la devolución.',
      id_empleado_procesa: form.id_empleado_procesa
        ? ''
        : 'Selecciona quién procesa la devolución.',
    }),
    [selectedPedido, form, resumen],
  );
  const visibleFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(
      ([field, message]) => message && touched[field],
    ),
  );
  const formInvalid = Object.values(fieldErrors).some(Boolean);
  const noDisponible = Boolean(resumen && Number(resumen.devolvible) <= 0);

  function resetForm() {
    const empleadoInicial = empleados[0]
      ? String(empleados[0].id_empleado)
      : '';
    setForm({
      ...EMPTY_FORM,
      id_empleado_autoriza: empleadoInicial,
      id_empleado_procesa: empleadoInicial,
    });
    setPedidoSearch('');
    setPedidoOptions([]);
    setSelectedPedido(null);
    setResumen(null);
    setFormError('');
    setTouched({});
  }

  function abrirRegistro() {
    resetForm();
    setCreateOpen(true);
  }

  function cerrarRegistro() {
    if (saving) return;
    setCreateOpen(false);
    resetForm();
  }

  function seleccionarPedido(pedido) {
    setSelectedPedido(pedido);
    setPedidoSearch(pedido.folio);
    setPedidoOptions([]);
    setFormError('');
  }

  function markTouched(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleRegistrar(event) {
    event.preventDefault();
    setTouched(
      Object.fromEntries(Object.keys(fieldErrors).map((field) => [field, true])),
    );
    if (formInvalid || !resumen || noDisponible) return;
    if (form.metodo === 'efectivo' && (!cajaAbierta || checkingCaja)) return;

    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      await devolucionesApi.create({
        id_pedido: Number(selectedPedido.id_pedido),
        monto: Number(form.monto),
        metodo: form.metodo,
        motivo: form.motivo.trim(),
        id_empleado_autoriza: Number(form.id_empleado_autoriza),
        id_empleado_procesa: Number(form.id_empleado_procesa),
      });
      setCreateOpen(false);
      resetForm();
      setSuccess('Devolución registrada correctamente.');
      await loadDevoluciones();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function abrirDetalle(devolucion) {
    setDetailTarget(devolucion);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await devolucionesApi.get(devolucion.id_devolucion);
      setDetail(response.data);
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function cerrarDetalle() {
    setDetailTarget(null);
    setDetail(null);
    setDetailError('');
  }

  return (
    <div>
      <PageHeader
        title="Devoluciones"
        description="Consulta y registra devoluciones asociadas a los pedidos."
      >
        <Button onClick={abrirRegistro}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Registrar devolución
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      {success && (
        <div className="mb-5">
          <Alert type="success">{success}</Alert>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-paper p-4 shadow-soft">
        <div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
          <Field
            label="Buscar"
            htmlFor="devolucion-buscar"
            className="min-w-[160px] flex-1"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="devolucion-buscar"
                type="search"
                className={cn(inputClass(), 'pl-9')}
                placeholder="Folio, cliente o teléfono…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Field>

          <Field
            label="Método"
            htmlFor="devolucion-metodo-filtro"
            className="w-[130px] shrink-0"
          >
            <select
              id="devolucion-metodo-filtro"
              className={inputClass()}
              value={metodo}
              onChange={(event) => setMetodo(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </Field>

          <Field
            label="Desde"
            htmlFor="devolucion-desde"
            className="w-[140px] shrink-0"
          >
            <input
              id="devolucion-desde"
              type="date"
              className={cn(inputClass(), 'px-2')}
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
            />
          </Field>

          <Field
            label="Hasta"
            htmlFor="devolucion-hasta"
            className="w-[140px] shrink-0"
          >
            <input
              id="devolucion-hasta"
              type="date"
              className={cn(inputClass(), 'px-2')}
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
            />
          </Field>

          <Button
            variant="secondary"
            onClick={loadDevoluciones}
            loading={loading}
            className="shrink-0 px-3"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-sand" />
            ))}
          </div>
        ) : devoluciones.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No hay devoluciones que coincidan"
            description="Cambia los filtros o registra una devolución para empezar."
            action={<Button onClick={abrirRegistro}>Registrar devolución</Button>}
          />
        ) : (
          <div>
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="w-[9%] whitespace-nowrap px-3 py-3.5 font-semibold">Folio</th>
                  <th className="w-[13%] whitespace-nowrap px-3 py-3.5 font-semibold">Cliente</th>
                  <th className="w-[12%] whitespace-nowrap px-3 py-3.5 font-semibold">Fecha</th>
                  <th className="w-[12%] whitespace-nowrap px-3 py-3.5 font-semibold">Método</th>
                  <th className="w-[13%] whitespace-nowrap px-3 py-3.5 font-semibold">Motivo</th>
                  <th className="w-[10%] whitespace-nowrap px-3 py-3.5 text-right font-semibold">Monto</th>
                  <th className="w-[19%] whitespace-nowrap px-3 py-3.5 font-semibold">Autorizó</th>
                  <th className="w-[12%] whitespace-nowrap py-3.5 pl-3 pr-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {devoluciones.map((devolucion) => (
                  <tr
                    key={devolucion.id_devolucion}
                    className="hover:bg-sand/40"
                  >
                    <td className="align-middle whitespace-nowrap px-3 py-3.5">
                      <p className="font-semibold text-ink">{devolucion.folio}</p>
                      <p
                        className="max-w-[140px] truncate text-xs text-muted"
                        title={devolucion.sucursal_nombre ?? devolucion.sucursal}
                      >
                        {devolucion.sucursal_nombre ?? devolucion.sucursal}
                      </p>
                    </td>
                    <td
                      className="align-middle truncate whitespace-nowrap px-3 py-3.5 font-medium text-ink"
                      title={devolucion.cliente_nombre}
                    >
                      {devolucion.cliente_nombre}
                    </td>
                    <td className="align-middle whitespace-nowrap px-3 py-3.5">
                      <span className="block text-sm font-normal text-ink">
                        {formatDate(devolucion.fecha_hora)}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatTime(devolucion.fecha_hora)}
                      </span>
                    </td>
                    <td className="align-middle px-3 py-3.5">
                      <MetodoBadge metodo={devolucion.metodo} />
                    </td>
                    <td
                      className="max-w-[150px] truncate align-middle px-3 py-3.5 text-muted"
                      title={devolucion.motivo}
                    >
                      {devolucion.motivo}
                    </td>
                    <td className="align-middle whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-ink">
                      {formatMoney(devolucion.monto)}
                    </td>
                    <td
                      className="align-middle truncate whitespace-nowrap px-3 py-3.5 text-ink"
                      title={devolucion.empleado_autoriza_nombre}
                    >
                      {devolucion.empleado_autoriza_nombre}
                    </td>
                    <td className="align-middle whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirDetalle(devolucion)}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={cerrarRegistro}
        title="Registrar devolución"
        description="Registra el monto que se devolverá y quién participa en la operación."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={cerrarRegistro}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-devolucion"
              loading={saving}
              disabled={
                saving ||
                formInvalid ||
                !resumen ||
                resumenLoading ||
                noDisponible ||
                (form.metodo === 'efectivo' &&
                  (!cajaAbierta || checkingCaja || Boolean(cajaError)))
              }
            >
              Registrar devolución
            </Button>
          </>
        }
      >
        {createOpen && (
          <form
            id="form-devolucion"
            className="space-y-4"
            onSubmit={handleRegistrar}
          >
            {formError && <Alert>{formError}</Alert>}

            <Field
              label="Pedido"
              htmlFor="devolucion-pedido"
              error={visibleFieldErrors.pedido}
            >
              <input
                id="devolucion-pedido"
                type="search"
                className={inputClass(visibleFieldErrors.pedido)}
                placeholder="Buscar por folio o cliente…"
                value={pedidoSearch}
                onChange={(event) => {
                  setPedidoSearch(event.target.value);
                  setSelectedPedido(null);
                  setResumen(null);
                  setFormError('');
                }}
                onBlur={() => markTouched('pedido')}
                autoComplete="off"
              />
            </Field>
            {pedidoOptionsLoading && (
              <p className="text-xs text-muted">Buscando pedidos…</p>
            )}
            {pedidoOptions.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-paper shadow-sm">
                {pedidoOptions.map((pedido) => (
                  <button
                    key={pedido.id_pedido}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-sand/60"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => seleccionarPedido(pedido)}
                  >
                    <span>
                      <span className="block font-semibold text-ink">
                        {pedido.folio} · {pedido.cliente_nombre}
                      </span>
                      <span className="block text-xs text-muted">
                        Pagado: {formatMoney(pedido.total_pagado)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold text-ink">
                      {formatMoney(pedido.total)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedPedido && resumen && (
              <div className="rounded-xl border border-line bg-sand/60 p-4">
                <p className="font-semibold text-ink">
                  {resumen.folio} · {selectedPedido.cliente_nombre}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Total</dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {formatMoney(resumen.total)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Pagado</dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {formatMoney(resumen.total_pagado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Ya devuelto</dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {formatMoney(resumen.total_devuelto)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Disponible para devolver</dt>
                    <dd className="mt-1 font-semibold text-forest">
                      {formatMoney(resumen.devolvible)}
                    </dd>
                  </div>
                </dl>
                {noDisponible && (
                  <Alert className="mt-3">
                    El pedido no tiene pagos disponibles para devolver.
                  </Alert>
                )}
              </div>
            )}
            {selectedPedido && resumenLoading && (
              <p className="text-sm text-muted">Cargando resumen del pedido…</p>
            )}

            <Field
              label="Monto"
              htmlFor="devolucion-monto"
              error={visibleFieldErrors.monto}
            >
              <input
                id="devolucion-monto"
                type="text"
                inputMode="numeric"
                className={inputClass(visibleFieldErrors.monto)}
                value={form.monto}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monto: event.target.value.replace(/\D/g, ''),
                  }))
                }
                onBlur={() => markTouched('monto')}
                placeholder="0"
              />
            </Field>
            <p className="-mt-3 text-xs leading-5 text-muted">
              Máximo disponible: {formatMoney(resumen?.devolvible ?? 0)}
            </p>

            <Field label="Método" htmlFor="devolucion-metodo">
              <select
                id="devolucion-metodo"
                className={inputClass()}
                value={form.metodo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metodo: event.target.value }))
                }
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </Field>

            <Field
              label="Motivo"
              htmlFor="devolucion-motivo"
              error={visibleFieldErrors.motivo}
              hint={`${form.motivo.length}/255`}
            >
              <textarea
                id="devolucion-motivo"
                rows="3"
                maxLength={255}
                className={cn(
                  inputClass(visibleFieldErrors.motivo),
                  'resize-y',
                )}
                value={form.motivo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, motivo: event.target.value }))
                }
                onBlur={() => markTouched('motivo')}
              />
            </Field>

            <Field
              label="Empleado que autoriza"
              htmlFor="devolucion-autoriza"
              error={visibleFieldErrors.id_empleado_autoriza}
            >
              <select
                id="devolucion-autoriza"
                className={inputClass(visibleFieldErrors.id_empleado_autoriza)}
                value={form.id_empleado_autoriza}
                onChange={(event) => {
                  const idEmpleado = event.target.value;
                  setForm((current) => ({
                    ...current,
                    id_empleado_autoriza: idEmpleado,
                    id_empleado_procesa: idEmpleado,
                  }));
                }}
                onBlur={() => markTouched('id_empleado_autoriza')}
              >
                <option value="">Selecciona un empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id_empleado} value={empleado.id_empleado}>
                    {nombreEmpleado(empleado)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Empleado que procesa"
              htmlFor="devolucion-procesa"
              error={visibleFieldErrors.id_empleado_procesa}
            >
              <select
                id="devolucion-procesa"
                className={inputClass(visibleFieldErrors.id_empleado_procesa)}
                value={form.id_empleado_procesa}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    id_empleado_procesa: event.target.value,
                  }))
                }
                onBlur={() => markTouched('id_empleado_procesa')}
              >
                <option value="">Selecciona un empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id_empleado} value={empleado.id_empleado}>
                    {nombreEmpleado(empleado)}
                  </option>
                ))}
              </select>
            </Field>

            {form.metodo === 'efectivo' && form.id_empleado_procesa && (
              checkingCaja ? (
                <p className="text-sm text-muted">Verificando caja abierta…</p>
              ) : cajaError ? (
                <Alert>{cajaError}</Alert>
              ) : !cajaAbierta ? (
                <Alert>
                  <p className="font-semibold">
                    El empleado que procesa no tiene una caja abierta
                  </p>
                  <p className="mt-1">
                    Abre una caja en{' '}
                    <Link to="/caja" className="font-semibold underline">
                      Corte de caja
                    </Link>
                    .
                  </p>
                </Alert>
              ) : null
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={cerrarDetalle}
        title={`Devolución · ${detailTarget?.folio ?? ''}`}
        description="Detalle de la devolución registrada."
        size="sm"
      >
        {detailLoading ? (
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-xl bg-sand" />
            <div className="h-10 animate-pulse rounded-xl bg-sand" />
          </div>
        ) : detailError ? (
          <Alert>{detailError}</Alert>
        ) : detail ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <DetailRow label="Folio">{detail.folio}</DetailRow>
              <DetailRow label="Cliente">{detail.cliente_nombre}</DetailRow>
              <DetailRow label="Sucursal">
                {detail.sucursal_nombre ?? detail.sucursal}
              </DetailRow>
              <DetailRow label="Fecha">
                {formatDateTime(detail.fecha_hora)}
              </DetailRow>
              <DetailRow label="Método">
                <MetodoBadge metodo={detail.metodo} />
              </DetailRow>
              <DetailRow label="Monto">{formatMoney(detail.monto)}</DetailRow>
              <DetailRow label="Autorizó">
                {detail.empleado_autoriza_nombre}
              </DetailRow>
              <DetailRow label="Caja">
                {detail.id_corte_caja ? `Corte #${detail.id_corte_caja}` : '—'}
              </DetailRow>
            </dl>
            <div className="rounded-xl bg-sand/70 p-4">
              <p className="text-xs text-muted">Motivo</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {detail.motivo}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 rounded-xl border border-line p-4 text-sm">
              <DetailRow label="Total del pedido">
                {formatMoney(detail.total)}
              </DetailRow>
              <DetailRow label="Total pagado">
                {formatMoney(detail.total_pagado)}
              </DetailRow>
              <DetailRow label="Total devuelto">
                {formatMoney(detail.total_devuelto)}
              </DetailRow>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

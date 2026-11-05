import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  History,
  Landmark,
  Plus,
  RefreshCw,
  Store,
  UserRound,
  Wallet,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { cajaApi } from '../api/caja.js';
import { empleadosApi } from '../api/empleados.js';
import { sucursalesApi } from '../api/sucursales.js';
import { cn } from '../lib/cn.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

function EstadoCorteBadge({ estado }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        estado === 'abierto'
          ? 'bg-forest/10 text-forest'
          : 'bg-sand text-muted-strong',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          estado === 'abierto' ? 'bg-forest' : 'bg-muted',
        )}
        aria-hidden="true"
      />
      {estado === 'abierto' ? 'Abierta' : 'Cerrada'}
    </span>
  );
}

function Diferencia({ value }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;

  const number = Number(value);
  const positive = number > 0;
  const negative = number < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        positive && 'text-forest',
        negative && 'text-danger',
        number === 0 && 'text-muted-strong',
      )}
    >
      {positive && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
      {negative && <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
      {formatMoney(number)}
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

function CorteCard({ corte, onVer, onCerrar }) {
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">
            Corte #{corte.id_corte_caja}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">
            {corte.empleado_nombre}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            {corte.sucursal_nombre}
          </p>
        </div>
        <EstadoCorteBadge estado={corte.estado} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-sand/70 p-3">
          <dt className="text-xs text-muted">Fondo inicial</dt>
          <dd className="mt-1 font-semibold text-ink">{formatMoney(corte.fondo_inicial)}</dd>
        </div>
        <div className="rounded-xl bg-sand/70 p-3">
          <dt className="text-xs text-muted">Saldo esperado</dt>
          <dd className="mt-1 font-semibold text-ink">{formatMoney(corte.saldo_esperado)}</dd>
        </div>
        <div className="rounded-xl bg-sand/70 p-3">
          <dt className="text-xs text-muted">Efectivo</dt>
          <dd className="mt-1 font-semibold text-ink">{formatMoney(corte.total_efectivo)}</dd>
        </div>
        <div className="rounded-xl bg-sand/70 p-3">
          <dt className="text-xs text-muted">Transferencia</dt>
          <dd className="mt-1 font-semibold text-ink">
            {formatMoney(corte.total_transferencia)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Abierta {formatDateTime(corte.fecha_apertura)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => onVer(corte)}>
          Ver detalle
        </Button>
        <Button size="sm" onClick={() => onCerrar(corte)}>
          Cerrar caja
        </Button>
      </div>
    </article>
  );
}

export default function CajaPage() {
  const [activeTab, setActiveTab] = useState('actual');
  const [abiertas, setAbiertas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openModal, setOpenModal] = useState(false);
  const [openForm, setOpenForm] = useState({
    id_empleado: '',
    id_sucursal: '',
    fondo_inicial: 0,
    descripcion: '',
  });
  const [savingOpen, setSavingOpen] = useState(false);

  const [closeTarget, setCloseTarget] = useState(null);
  const [closeForm, setCloseForm] = useState({ saldo_real: '', descripcion: '' });
  const [savingClose, setSavingClose] = useState(false);

  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCortes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [abiertasRes, historialRes] = await Promise.all([
        cajaApi.list({ estado: 'abierto' }),
        cajaApi.list({ estado: 'cerrado' }),
      ]);
      setAbiertas(abiertasRes.data || []);
      setHistorial(historialRes.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCortes();
  }, [loadCortes]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [empleadosRes, sucursalesRes] = await Promise.all([
          empleadosApi.list(),
          sucursalesApi.list(),
        ]);
        setEmpleados((empleadosRes.data || []).filter((item) => item.estado === 'activo'));
        setSucursales(sucursalesRes.data || []);
      } catch (requestError) {
        console.error('Error al cargar catálogos de caja:', requestError);
      }
    }

    loadCatalogs();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4500);
    return () => clearTimeout(timer);
  }, [success]);

  const stats = useMemo(
    () => ({
      abiertas: abiertas.length,
      efectivo: abiertas.reduce((total, corte) => total + Number(corte.total_efectivo || 0), 0),
      transferencia: abiertas.reduce(
        (total, corte) => total + Number(corte.total_transferencia || 0),
        0,
      ),
      esperado: abiertas.reduce(
        (total, corte) => total + Number(corte.saldo_esperado || 0),
        0,
      ),
    }),
    [abiertas],
  );

  function abrirModalCaja() {
    setError('');
    const empleado =
      empleados.find((item) => item.rol === 'empleado') ?? empleados[0];
    setOpenForm({
      id_empleado: empleado ? String(empleado.id_empleado) : '',
      id_sucursal: empleado ? String(empleado.id_sucursal) : '',
      fondo_inicial: 0,
      descripcion: '',
    });
    setOpenModal(true);
  }

  function handleOpenFormChange(field, value) {
    setOpenForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'id_empleado') {
        const empleado = empleados.find(
          (item) => String(item.id_empleado) === String(value),
        );
        if (empleado) next.id_sucursal = String(empleado.id_sucursal);
      }

      return next;
    });
  }

  async function handleAbrirCaja(event) {
    event.preventDefault();

    if (!openForm.id_empleado || !openForm.id_sucursal) {
      setError('Selecciona el empleado y la sucursal para abrir la caja.');
      return;
    }

    try {
      setSavingOpen(true);
      setError('');
      setSuccess('');
      await cajaApi.abrir({
        id_empleado: Number(openForm.id_empleado),
        id_sucursal: Number(openForm.id_sucursal),
        fondo_inicial: Number(openForm.fondo_inicial) || 0,
        descripcion: openForm.descripcion.trim() || null,
      });
      setSuccess('Caja abierta correctamente.');
      setOpenModal(false);
      await loadCortes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingOpen(false);
    }
  }

  function abrirModalCierre(corte) {
    setError('');
    setCloseTarget(corte);
    setCloseForm({
      saldo_real: String(corte.saldo_esperado ?? 0),
      descripcion: '',
    });
  }

  async function handleCerrarCaja(event) {
    event.preventDefault();

    if (closeForm.saldo_real === '' || Number(closeForm.saldo_real) < 0) {
      setError('Captura un saldo real válido.');
      return;
    }

    try {
      setSavingClose(true);
      setError('');
      setSuccess('');
      await cajaApi.cerrar(closeTarget.id_corte_caja, {
        saldo_real: Number(closeForm.saldo_real),
        descripcion: closeForm.descripcion.trim() || null,
      });
      setSuccess('Caja cerrada correctamente.');
      setCloseTarget(null);
      await loadCortes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingClose(false);
    }
  }

  async function abrirDetalle(corte) {
    setDetailTarget(corte);
    setDetail(null);
    setDetailLoading(true);

    try {
      const response = await cajaApi.get(corte.id_corte_caja);
      setDetail(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const diferenciaCierre = closeTarget
    ? Number(closeForm.saldo_real || 0) - Number(closeTarget.saldo_esperado || 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Corte de caja"
        description="Abre turnos, consulta el efectivo y las transferencias del día, y cierra la caja con el saldo real."
      >
        <Button onClick={abrirModalCaja} disabled={empleados.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Abrir caja
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-5">
          <Alert>
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadCortes}
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
          icon={Wallet}
          label="Cajas abiertas"
          value={stats.abiertas}
          hint="Turnos activos en este momento"
        />
        <StatCard
          icon={Banknote}
          label="Pagos en efectivo"
          value={formatMoney(stats.efectivo)}
          hint="Cobros en efectivo de cajas abiertas"
        />
        <StatCard
          icon={Landmark}
          label="Pagos por transferencia"
          value={formatMoney(stats.transferencia)}
          hint="Cobros por transferencia de cajas abiertas"
        />
        <StatCard
          icon={History}
          label="Saldo esperado"
          value={formatMoney(stats.esperado)}
          hint="Fondo + efectivo - devoluciones en efectivo"
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('actual')}
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
            activeTab === 'actual'
              ? 'bg-forest text-cream'
              : 'text-muted-strong hover:bg-sand hover:text-ink',
          )}
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Cajas abiertas
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
            {abiertas.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
            activeTab === 'historial'
              ? 'bg-forest text-cream'
              : 'text-muted-strong hover:bg-sand hover:text-ink',
          )}
        >
          <History className="h-4 w-4" aria-hidden="true" />
          Historial
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
            {historial.length}
          </span>
        </button>
      </div>

      <div className="mt-5">
        {activeTab === 'actual' && (
          <>
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-sand" />
                ))}
              </div>
            ) : abiertas.length === 0 ? (
              <div className="rounded-2xl border border-line bg-paper shadow-soft">
                <EmptyState
                  icon={Wallet}
                  title="No hay cajas abiertas"
                  description="Abre un turno para empezar a registrar pagos y llevar el control del efectivo."
                  action={
                    <Button onClick={abrirModalCaja} disabled={empleados.length === 0}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Abrir primera caja
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {abiertas.map((corte) => (
                  <CorteCard
                    key={corte.id_corte_caja}
                    corte={corte}
                    onVer={abrirDetalle}
                    onCerrar={abrirModalCierre}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'historial' && (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-sand" />
                ))}
              </div>
            ) : historial.length === 0 ? (
              <EmptyState
                icon={History}
                title="Todavía no hay cortes cerrados"
                description="Cuando cierres una caja, aparecerá aquí con sus totales y diferencias."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Corte</th>
                        <th className="px-4 py-3 font-semibold">Empleado</th>
                        <th className="px-4 py-3 font-semibold">Sucursal</th>
                        <th className="px-4 py-3 font-semibold">Apertura / cierre</th>
                        <th className="px-4 py-3 text-right font-semibold">Efectivo</th>
                        <th className="px-4 py-3 text-right font-semibold">Transferencia</th>
                        <th className="px-4 py-3 text-right font-semibold">Esperado</th>
                        <th className="px-4 py-3 text-right font-semibold">Real</th>
                        <th className="px-4 py-3 text-right font-semibold">Diferencia</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {historial.map((corte) => (
                        <tr key={corte.id_corte_caja} className="hover:bg-sand/40">
                          <td className="px-4 py-3 font-semibold text-ink">
                            #{corte.id_corte_caja}
                          </td>
                          <td className="px-4 py-3 text-ink">{corte.empleado_nombre}</td>
                          <td className="px-4 py-3 text-muted">{corte.sucursal_nombre}</td>
                          <td className="px-4 py-3 text-muted">
                            <p>{formatDateTime(corte.fecha_apertura)}</p>
                            <p className="text-xs">{formatDateTime(corte.fecha_cierre)}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-ink">
                            {formatMoney(corte.total_efectivo)}
                          </td>
                          <td className="px-4 py-3 text-right text-ink">
                            {formatMoney(corte.total_transferencia)}
                          </td>
                          <td className="px-4 py-3 text-right text-ink">
                            {formatMoney(corte.saldo_esperado)}
                          </td>
                          <td className="px-4 py-3 text-right text-ink">
                            {formatMoney(corte.saldo_real)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Diferencia value={corte.diferencia_saldo} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDetalle(corte)}
                            >
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-line lg:hidden">
                  {historial.map((corte) => (
                    <div key={corte.id_corte_caja} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">Corte #{corte.id_corte_caja}</p>
                          <p className="text-sm text-muted">{corte.empleado_nombre}</p>
                          <p className="text-xs text-muted">{corte.sucursal_nombre}</p>
                        </div>
                        <EstadoCorteBadge estado={corte.estado} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted">Efectivo</dt>
                          <dd className="font-semibold">{formatMoney(corte.total_efectivo)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Transferencia</dt>
                          <dd className="font-semibold">
                            {formatMoney(corte.total_transferencia)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Esperado</dt>
                          <dd className="font-semibold">{formatMoney(corte.saldo_esperado)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Diferencia</dt>
                          <dd>
                            <Diferencia value={corte.diferencia_saldo} />
                          </dd>
                        </div>
                      </dl>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => abrirDetalle(corte)}
                      >
                        Ver detalle
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={openModal}
        onClose={() => !savingOpen && setOpenModal(false)}
        title="Abrir caja"
        description="Asigna un empleado y captura el fondo con el que inicia el turno."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpenModal(false)}
              disabled={savingOpen}
            >
              Cancelar
            </Button>
            <Button type="submit" form="form-abrir-caja" loading={savingOpen}>
              Abrir caja
            </Button>
          </>
        }
      >
        {empleados.length === 0 ? (
          <Alert>
            <p className="font-semibold">No hay empleados activos.</p>
            <p className="mt-1">
              Registra al menos un empleado en{' '}
              <Link to="/empleados?nuevo=1" className="font-semibold underline">
                Empleados
              </Link>{' '}
              antes de abrir una caja.
            </p>
          </Alert>
        ) : (
          <form id="form-abrir-caja" className="space-y-4" onSubmit={handleAbrirCaja}>
            {error && <Alert>{error}</Alert>}

            <Field label="Empleado asignado" htmlFor="caja-empleado">
              <select
                id="caja-empleado"
                className={inputClass()}
                value={openForm.id_empleado}
                onChange={(event) =>
                  handleOpenFormChange('id_empleado', event.target.value)
                }
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
              htmlFor="caja-sucursal"
              hint="Se asigna automáticamente según el empleado."
            >
              <select
                id="caja-sucursal"
                className={inputClass()}
                value={openForm.id_sucursal}
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

            <Field
              label="Fondo inicial"
              htmlFor="caja-fondo"
              hint="Efectivo con el que inicia el turno."
            >
              <input
                id="caja-fondo"
                type="number"
                min="0"
                step="1"
                className={inputClass()}
                value={openForm.fondo_inicial}
                onChange={(event) =>
                  handleOpenFormChange('fondo_inicial', event.target.value)
                }
              />
            </Field>

            <Field label="Descripción" htmlFor="caja-descripcion">
              <textarea
                id="caja-descripcion"
                rows="3"
                maxLength={150}
                className={inputClass()}
                value={openForm.descripcion}
                onChange={(event) =>
                  handleOpenFormChange('descripcion', event.target.value)
                }
                placeholder="Turno matutino, observaciones, etc."
              />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(closeTarget)}
        onClose={() => !savingClose && setCloseTarget(null)}
        title={`Cerrar caja #${closeTarget?.id_corte_caja ?? ''}`}
        description="Revisa el resumen y captura el efectivo contado al final del turno."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCloseTarget(null)}
              disabled={savingClose}
            >
              Cancelar
            </Button>
            <Button type="submit" form="form-cerrar-caja" loading={savingClose}>
              Cerrar caja
            </Button>
          </>
        }
      >
        {closeTarget && (
          <form id="form-cerrar-caja" className="space-y-4" onSubmit={handleCerrarCaja}>
            {error && <Alert>{error}</Alert>}

            <div className="rounded-xl border border-line bg-sand/60 p-4 text-sm">
              <p className="font-semibold text-ink">{closeTarget.empleado_nombre}</p>
              <p className="text-muted">{closeTarget.sucursal_nombre}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs text-muted">Fondo</dt>
                  <dd className="font-semibold">{formatMoney(closeTarget.fondo_inicial)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Efectivo</dt>
                  <dd className="font-semibold">{formatMoney(closeTarget.total_efectivo)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Transferencia</dt>
                  <dd className="font-semibold">
                    {formatMoney(closeTarget.total_transferencia)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Devoluciones</dt>
                  <dd className="font-semibold">
                    {formatMoney(closeTarget.total_devoluciones)}
                  </dd>
                </div>
                <div className="col-span-2 border-t border-line pt-2">
                  <dt className="text-xs text-muted">Saldo esperado en efectivo</dt>
                  <dd className="font-display text-lg font-semibold text-ink">
                    {formatMoney(closeTarget.saldo_esperado)}
                  </dd>
                </div>
              </dl>
            </div>

            <Field label="Saldo real contado" htmlFor="caja-saldo-real">
              <input
                id="caja-saldo-real"
                type="number"
                min="0"
                step="1"
                className={inputClass()}
                value={closeForm.saldo_real}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    saldo_real: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <div
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-3 text-sm',
                diferenciaCierre === 0
                  ? 'bg-forest/10 text-forest'
                  : 'bg-danger/10 text-danger-strong',
              )}
            >
              <span className="font-medium">Diferencia</span>
              <span className="font-semibold">{formatMoney(diferenciaCierre)}</span>
            </div>

            <Field label="Descripción de cierre" htmlFor="caja-descripcion-cierre">
              <textarea
                id="caja-descripcion-cierre"
                rows="3"
                maxLength={150}
                className={inputClass()}
                value={closeForm.descripcion}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    descripcion: event.target.value,
                  }))
                }
                placeholder="Observaciones del cierre, faltante, sobrante, etc."
              />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => {
          setDetailTarget(null);
          setDetail(null);
        }}
        title={`Detalle del corte #${detailTarget?.id_corte_caja ?? ''}`}
        description={detailTarget?.empleado_nombre}
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setDetailTarget(null);
              setDetail(null);
            }}
          >
            Cerrar
          </Button>
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
                  {detail.empleado_nombre}
                </p>
                <p className="text-sm text-muted">{detail.sucursal_nombre}</p>
              </div>
              <EstadoCorteBadge estado={detail.estado} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Fondo inicial</dt>
                <dd className="mt-1 font-semibold">{formatMoney(detail.fondo_inicial)}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Efectivo</dt>
                <dd className="mt-1 font-semibold">{formatMoney(detail.total_efectivo)}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Transferencia</dt>
                <dd className="mt-1 font-semibold">
                  {formatMoney(detail.total_transferencia)}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Devoluciones</dt>
                <dd className="mt-1 font-semibold">
                  {formatMoney(detail.total_devoluciones)}
                </dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Saldo esperado</dt>
                <dd className="mt-1 font-semibold">{formatMoney(detail.saldo_esperado)}</dd>
              </div>
              <div className="rounded-xl bg-sand/70 p-3">
                <dt className="text-xs text-muted">Diferencia</dt>
                <dd className="mt-1">
                  <Diferencia value={detail.diferencia_saldo} />
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Pagos del turno</h3>
              {detail.pagos.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Todavía no hay pagos registrados en este corte.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sand/70 text-xs uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Pedido</th>
                        <th className="px-3 py-2 font-semibold">Cliente</th>
                        <th className="px-3 py-2 font-semibold">Método</th>
                        <th className="px-3 py-2 font-semibold">Concepto</th>
                        <th className="px-3 py-2 text-right font-semibold">Monto</th>
                        <th className="px-3 py-2 font-semibold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {detail.pagos.map((pago) => (
                        <tr key={pago.id_pago}>
                          <td className="px-3 py-2 font-semibold text-ink">
                            {pago.folio_pedido}
                          </td>
                          <td className="px-3 py-2 text-muted">{pago.cliente_nombre}</td>
                          <td className="px-3 py-2 capitalize text-muted">
                            {pago.metodo_pago}
                          </td>
                          <td className="px-3 py-2 capitalize text-muted">
                            {pago.concepto_pago}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-ink">
                            {formatMoney(pago.monto)}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {formatDateTime(pago.fecha_hora)}
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
                      <span className="font-semibold text-ink">
                        {devolucion.folio_pedido}
                      </span>
                      <span className="text-muted">{devolucion.motivo}</span>
                      <span className="font-semibold text-danger">
                        {formatMoney(devolucion.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
              <p className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Abrió: {detail.apertura_nombre || '—'}
              </p>
              <p className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Cerró: {detail.cierre_nombre || '—'}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Apertura: {formatDateTime(detail.fecha_apertura)}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Cierre: {formatDateTime(detail.fecha_cierre)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No se pudo cargar el detalle del corte.</p>
        )}
      </Modal>
    </div>
  );
}

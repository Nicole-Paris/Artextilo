import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  Clock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import { sucursalesApi } from '../api/sucursales.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';
import { formatDate } from '../lib/format.js';

const EMPTY_FORM = {
  nombre: '',
  direccion: '',
  codigo_postal: '',
  telefono: '',
  horario: '',
};

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebouncedValue(search, 300);
  const requestIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveDependencies, setArchiveDependencies] = useState(null);
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [success, setSuccess] = useState('');
  const dependencyRequestRef = useRef(0);

  const loadSucursales = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await sucursalesApi.list(debouncedSearch, { archived });
      if (requestId !== requestIdRef.current) return;
      setSucursales(response.data);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, archived]);

  useEffect(() => {
    loadSucursales();
  }, [loadSucursales]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('nuevo');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(sucursal) {
    setEditing(sucursal);
    setForm({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      codigo_postal: sucursal.codigo_postal,
      telefono: sucursal.telefono,
      horario: sucursal.horario,
    });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError('');

    try {
      if (editing) {
        await sucursalesApi.update(editing.id_sucursal, form);
        setSuccess('Sucursal actualizada correctamente.');
      } else {
        await sucursalesApi.create(form);
        setSuccess('Sucursal creada correctamente.');
      }

      setModalOpen(false);
      await loadSucursales();
    } catch (requestError) {
      if (requestError.details) {
        const nextErrors = {};
        for (const detail of requestError.details) {
          nextErrors[detail.field] = detail.message;
        }
        setFieldErrors(nextErrors);
        const firstField = Object.keys(nextErrors)[0];
        window.requestAnimationFrame(() => {
          document.querySelector(`[data-field="${firstField}"]`)?.focus();
        });
      } else {
        setFormError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function openArchive(sucursal) {
    const requestId = ++dependencyRequestRef.current;
    setArchiveTarget(sucursal);
    setArchiveDependencies(null);
    setLoadingDependencies(true);

    try {
      const response = await sucursalesApi.dependencies(sucursal.id_sucursal);
      if (requestId !== dependencyRequestRef.current) return;
      setArchiveDependencies(response.data);
    } catch (requestError) {
      if (requestId !== dependencyRequestRef.current) return;
      setArchiveDependencies({ error: requestError.message });
    } finally {
      if (requestId === dependencyRequestRef.current) setLoadingDependencies(false);
    }
  }

  function resetArchive() {
    dependencyRequestRef.current += 1;
    setArchiveTarget(null);
    setArchiveDependencies(null);
    setLoadingDependencies(false);
  }

  function closeArchive() {
    if (archiving) return;
    resetArchive();
  }

  async function handleArchive() {
    if (!archiveTarget || archiveDependencies?.total > 0 || archiveDependencies?.error) return;

    setArchiving(true);
    try {
      await sucursalesApi.remove(archiveTarget.id_sucursal);
      setSuccess('Sucursal archivada correctamente.');
      resetArchive();
      await loadSucursales();
    } catch (requestError) {
      setError(requestError.message);
      resetArchive();
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore(sucursal) {
    setRestoringId(sucursal.id_sucursal);
    setError('');
    try {
      await sucursalesApi.restore(sucursal.id_sucursal);
      setSuccess('Sucursal restaurada correctamente.');
      await loadSucursales();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRestoringId(null);
    }
  }

  const dependencyTotal = archiveDependencies?.total ?? 0;
  const archiveBlocked = Boolean(archiveDependencies?.error) || dependencyTotal > 0;
  const dependencyParts = [];
  if (archiveDependencies?.empleados > 0) {
    dependencyParts.push(`${archiveDependencies.empleados} empleado(s) activo(s)`);
  }
  if (archiveDependencies?.inventario > 0) {
    dependencyParts.push(`${archiveDependencies.inventario} registro(s) de inventario activo(s)`);
  }
  const dependencySummary = dependencyParts.join(' y ');

  const countLabel = archived
    ? `${sucursales.length} ${
        sucursales.length === 1 ? 'sucursal archivada' : 'sucursales archivadas'
      }`
    : `${sucursales.length} ${
        sucursales.length === 1 ? 'sucursal activa' : 'sucursales activas'
      }`;

  const archiveMessage = loadingDependencies
    ? 'Revisando dependencias…'
    : archiveDependencies?.error
      ? `No se pudieron revisar las dependencias: ${archiveDependencies.error}`
      : dependencyTotal > 0
        ? `No se puede archivar "${archiveTarget?.nombre}" porque tiene ${dependencySummary}. Reasigna o desactiva esas dependencias primero.`
        : `"${archiveTarget?.nombre}" dejará de aparecer en la lista activa. Podrás restaurarla desde la pestaña Archivados. No se borra de la base de datos.`;

  const archiveDetails =
    !loadingDependencies && !archiveDependencies?.error && dependencyTotal > 0 ? (
      <ul className="list-disc space-y-1 pl-4">
        {archiveDependencies.empleados > 0 && (
          <li>{archiveDependencies.empleados} empleado(s) activo(s)</li>
        )}
        {archiveDependencies.inventario > 0 && (
          <li>{archiveDependencies.inventario} registro(s) de inventario activo(s)</li>
        )}
      </ul>
    ) : null;

  function renderActions(sucursal) {
    if (archived) {
      return (
        <IconButton
          label={`Restaurar ${sucursal.nombre}`}
          icon={ArchiveRestore}
          variant="restore"
          onClick={() => handleRestore(sucursal)}
          loading={restoringId === sucursal.id_sucursal}
        />
      );
    }

    return (
      <>
        <IconButton
          label={`Editar ${sucursal.nombre}`}
          icon={Pencil}
          variant="edit"
          onClick={() => openEdit(sucursal)}
        />
        <IconButton
          label={`Archivar ${sucursal.nombre}`}
          icon={Archive}
          variant="archive"
          onClick={() => openArchive(sucursal)}
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sucursales"
        description="Consulta y administra los puntos de venta de Artextilo."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva sucursal
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, dirección o teléfono…"
              className={cn(inputClass(false), 'pl-9')}
              aria-label="Buscar sucursales"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={archived}
              onChange={setArchived}
              label="Filtrar sucursales por estado"
              options={[
                { value: false, label: 'Activas' },
                { value: true, label: 'Archivadas' },
              ]}
            />
            <p className="text-sm text-muted" aria-live="polite">
              {loading ? 'Cargando…' : countLabel}
            </p>
          </div>
        </div>

        {success && (
          <div className="px-4 pt-4">
            <Alert type="success">{success}</Alert>
          </div>
        )}

        {error && (
          <div className="px-4 pt-4">
            <Alert>
              <div className="flex flex-wrap items-center gap-3">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={loadSucursales}
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
          <div className="space-y-3 p-4 sm:p-6">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-xl bg-sand" />
            ))}
          </div>
        ) : error ? null : sucursales.length === 0 ? (
          <EmptyState
            icon={Store}
            title={
              archived
                ? 'No hay sucursales archivadas'
                : search
                  ? 'Sin resultados'
                  : 'Aún no hay sucursales registradas'
            }
            description={
              archived
                ? 'Las sucursales que archives aparecerán aquí y podrás restaurarlas.'
                : search
                  ? 'No encontramos sucursales que coincidan con la búsqueda.'
                  : 'Registra la primera sucursal para empezar a operar.'
            }
            action={
              !archived &&
              !search && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear primera sucursal
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-sand/60 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-6">Sucursal</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Contacto</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Horario</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-6">
                      {archived ? 'Archivada' : 'Actualizada'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sucursales.map((sucursal) => (
                    <tr key={sucursal.id_sucursal} className="transition hover:bg-sand/40">
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage text-forest">
                            <Store className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{sucursal.nombre}</p>
                            <p className="mt-1 flex items-start gap-1.5 break-words text-xs leading-5 text-muted">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>
                                {sucursal.direccion} · CP {sucursal.codigo_postal}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-6">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                          {sucursal.telefono}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-4 text-muted sm:px-6">
                        <span className="inline-flex items-start gap-1.5 break-words leading-6">
                          <Clock className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {sucursal.horario}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-6">
                        {formatDate(archived ? sucursal.deleted_at : sucursal.updated_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-1">{renderActions(sucursal)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line xl:hidden">
              {sucursales.map((sucursal) => (
                <article key={sucursal.id_sucursal} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                      <Store className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{sucursal.nombre}</p>
                      <p className="mt-1 flex items-start gap-1.5 break-words text-sm leading-6 text-muted">
                        <MapPin className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {sucursal.direccion} · CP {sucursal.codigo_postal}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted sm:flex-row sm:flex-wrap sm:gap-x-4">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {sucursal.telefono}
                        </span>
                        <span className="inline-flex items-start gap-1.5">
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {sucursal.horario}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {archived ? 'Archivada' : 'Actualizada'}:{' '}
                        {formatDate(archived ? sucursal.deleted_at : sucursal.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1">{renderActions(sucursal)}</div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
        description={
          editing
            ? 'Actualiza los datos de la sucursal seleccionada.'
            : 'Registra un nuevo punto de venta.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="sucursal-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </>
        }
      >
        <form id="sucursal-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}

          <Field
            label="Nombre"
            htmlFor="sucursal-nombre"
            error={fieldErrors.nombre}
          >
            <input
              id="sucursal-nombre"
              data-field="nombre"
              data-autofocus
              type="text"
              value={form.nombre}
              onChange={(event) => updateField('nombre', event.target.value)}
              className={inputClass(fieldErrors.nombre)}
              placeholder="Ej. Sucursal Centro"
              maxLength={50}
              autoComplete="organization"
              required
            />
          </Field>

          <Field
            label="Dirección"
            htmlFor="sucursal-direccion"
            error={fieldErrors.direccion}
          >
            <input
              id="sucursal-direccion"
              data-field="direccion"
              type="text"
              value={form.direccion}
              onChange={(event) => updateField('direccion', event.target.value)}
              className={inputClass(fieldErrors.direccion)}
              placeholder="Calle, número, colonia"
              maxLength={100}
              autoComplete="street-address"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Código postal"
              htmlFor="sucursal-codigo-postal"
              error={fieldErrors.codigo_postal}
              hint="5 dígitos."
            >
              <input
                id="sucursal-codigo-postal"
                data-field="codigo_postal"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                value={form.codigo_postal}
                onChange={(event) =>
                  updateField(
                    'codigo_postal',
                    event.target.value.replace(/\D/g, '').slice(0, 5),
                  )
                }
                className={inputClass(fieldErrors.codigo_postal)}
                placeholder="00000"
                maxLength={5}
                autoComplete="postal-code"
                required
              />
            </Field>

            <Field
              label="Teléfono"
              htmlFor="sucursal-telefono"
              error={fieldErrors.telefono}
              hint="10 a 15 dígitos."
            >
              <input
                id="sucursal-telefono"
                data-field="telefono"
                type="tel"
                inputMode="tel"
                pattern="[0-9]{10,15}"
                value={form.telefono}
                onChange={(event) =>
                  updateField(
                    'telefono',
                    event.target.value.replace(/\D/g, '').slice(0, 15),
                  )
                }
                className={inputClass(fieldErrors.telefono)}
                placeholder="0000000000"
                maxLength={15}
                autoComplete="tel"
                required
              />
            </Field>
          </div>

          <Field
            label="Horario"
            htmlFor="sucursal-horario"
            error={fieldErrors.horario}
            hint="Ej. Lunes a viernes de 9:00 a 18:00."
          >
            <input
              id="sucursal-horario"
              data-field="horario"
              type="text"
              value={form.horario}
              onChange={(event) => updateField('horario', event.target.value)}
              className={inputClass(fieldErrors.horario)}
              placeholder="Lunes a sábado de 9:00 a 19:00"
              maxLength={100}
              required
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archivar sucursal"
        message={archiveMessage}
        details={archiveDetails}
        confirmLabel={
          loadingDependencies
            ? 'Revisando…'
            : archiveBlocked
              ? 'No se puede archivar'
              : 'Archivar'
        }
        confirmDisabled={loadingDependencies || archiveBlocked}
        loading={archiving}
        onCancel={closeArchive}
        onConfirm={handleArchive}
      />
    </div>
  );
}

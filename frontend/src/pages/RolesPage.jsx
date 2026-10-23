import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { rolesApi } from '../api/roles.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';
import { formatDate } from '../lib/format.js';

const EMPTY_FORM = { nombre: '', descripcion: '' };

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
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

  const loadRoles = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await rolesApi.list(debouncedSearch, { archived });
      if (requestId !== requestIdRef.current) return;
      setRoles(response.data);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, archived]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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

  function openEdit(role) {
    setEditing(role);
    setForm({ nombre: role.nombre, descripcion: role.descripcion ?? '' });
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
        await rolesApi.update(editing.id_rol, form);
        setSuccess('Rol actualizado correctamente.');
      } else {
        await rolesApi.create(form);
        setSuccess('Rol creado correctamente.');
      }

      setModalOpen(false);
      await loadRoles();
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

  async function openArchive(role) {
    const requestId = ++dependencyRequestRef.current;
    setArchiveTarget(role);
    setArchiveDependencies(null);
    setLoadingDependencies(true);

    try {
      const response = await rolesApi.dependencies(role.id_rol);
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
      await rolesApi.remove(archiveTarget.id_rol);
      setSuccess('Rol archivado correctamente.');
      resetArchive();
      await loadRoles();
    } catch (requestError) {
      setError(requestError.message);
      resetArchive();
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore(role) {
    setRestoringId(role.id_rol);
    setError('');
    try {
      await rolesApi.restore(role.id_rol);
      setSuccess('Rol restaurado correctamente.');
      await loadRoles();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRestoringId(null);
    }
  }

  const dependencyTotal = archiveDependencies?.total ?? 0;
  const archiveBlocked = Boolean(archiveDependencies?.error) || dependencyTotal > 0;
  const countLabel = archived
    ? `${roles.length} ${roles.length === 1 ? 'rol archivado' : 'roles archivados'}`
    : `${roles.length} ${roles.length === 1 ? 'rol activo' : 'roles activos'}`;

  const archiveMessage = loadingDependencies
    ? 'Revisando dependencias…'
    : archiveDependencies?.error
      ? `No se pudieron revisar las dependencias: ${archiveDependencies.error}`
      : dependencyTotal > 0
        ? `No se puede archivar "${archiveTarget?.nombre}" porque tiene ${archiveDependencies.empleados} empleado(s) activo(s) asignado(s). Reasigna o desactiva esas dependencias primero.`
        : `"${archiveTarget?.nombre}" dejará de aparecer en la lista activa. Podrás restaurarlo desde la pestaña Archivados. No se borra de la base de datos.`;

  const archiveDetails =
    !loadingDependencies && !archiveDependencies?.error && dependencyTotal > 0 ? (
      <ul className="list-disc space-y-1 pl-4">
        <li>{archiveDependencies.empleados} empleado(s) activo(s)</li>
      </ul>
    ) : null;

  function renderActions(role) {
    if (archived) {
      return (
        <IconButton
          label={`Restaurar ${role.nombre}`}
          icon={ArchiveRestore}
          variant="restore"
          onClick={() => handleRestore(role)}
          loading={restoringId === role.id_rol}
        />
      );
    }

    return (
      <>
        <IconButton
          label={`Editar ${role.nombre}`}
          icon={Pencil}
          variant="edit"
          onClick={() => openEdit(role)}
        />
        <IconButton
          label={`Archivar ${role.nombre}`}
          icon={Archive}
          variant="archive"
          onClick={() => openArchive(role)}
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Administra los roles que se asignan al personal de Artextilo."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo rol
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
              placeholder="Buscar por nombre o descripción…"
              className={cn(inputClass(false), 'pl-9')}
              aria-label="Buscar roles"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={archived}
              onChange={setArchived}
              label="Filtrar roles por estado"
              options={[
                { value: false, label: 'Activos' },
                { value: true, label: 'Archivados' },
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
                  onClick={loadRoles}
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
              <div key={row} className="h-14 animate-pulse rounded-xl bg-sand" />
            ))}
          </div>
        ) : error ? null : roles.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={
              archived
                ? 'No hay roles archivados'
                : search
                  ? 'Sin resultados'
                  : 'Aún no hay roles registrados'
            }
            description={
              archived
                ? 'Los roles que archives aparecerán aquí y podrás restaurarlos.'
                : search
                  ? 'No encontramos roles que coincidan con la búsqueda.'
                  : 'Crea el primer rol para empezar a organizar al personal.'
            }
            action={
              !archived &&
              !search && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear primer rol
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-sand/60 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-6">Rol</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Descripción</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-6">
                      {archived ? 'Archivado' : 'Actualizado'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {roles.map((role) => (
                    <tr key={role.id_rol} className="transition hover:bg-sand/40">
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage text-forest">
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <span className="font-semibold text-ink">{role.nombre}</span>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-4 text-muted sm:px-6">
                        <span className="line-clamp-2 break-words">
                          {role.descripcion || 'Sin descripción'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-6">
                        {formatDate(archived ? role.deleted_at : role.updated_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-1">{renderActions(role)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {roles.map((role) => (
                <article key={role.id_rol} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{role.nombre}</p>
                      <p className="mt-1 break-words text-sm leading-6 text-muted">
                        {role.descripcion || 'Sin descripción'}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {archived ? 'Archivado' : 'Actualizado'}:{' '}
                        {formatDate(archived ? role.deleted_at : role.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1">{renderActions(role)}</div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar rol' : 'Nuevo rol'}
        description={
          editing
            ? 'Actualiza el nombre o la descripción del rol.'
            : 'Registra un nuevo rol para el personal.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="role-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}

          <Field label="Nombre" htmlFor="role-nombre" error={fieldErrors.nombre}>
            <input
              id="role-nombre"
              data-field="nombre"
              data-autofocus
              type="text"
              value={form.nombre}
              onChange={(event) => updateField('nombre', event.target.value)}
              className={inputClass(fieldErrors.nombre)}
              placeholder="Ej. Administrador"
              maxLength={50}
              autoComplete="off"
              required
            />
          </Field>

          <Field
            label="Descripción"
            htmlFor="role-descripcion"
            error={fieldErrors.descripcion}
            hint="Máximo 150 caracteres. Opcional."
          >
            <textarea
              id="role-descripcion"
              data-field="descripcion"
              value={form.descripcion}
              onChange={(event) => updateField('descripcion', event.target.value)}
              className={inputClass(fieldErrors.descripcion)}
              placeholder="Describe las responsabilidades del rol."
              rows={3}
              maxLength={150}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archivar rol"
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

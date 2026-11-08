import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import { empleadosApi } from '../api/empleados.js';
import { rolesApi } from '../api/roles.js';
import { sucursalesApi } from '../api/sucursales.js';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';

const EMPTY_FORM = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  correo: '',
  telefono: '',
  contrasena: '',
  horario_entrada: '09:00',
  horario_salida: '18:00',
  id_rol: '',
  id_sucursal: '',
};

function formFromEmpleado(empleado) {
  return {
    nombre: empleado.nombre ?? '',
    apellido_paterno: empleado.apellido_paterno ?? '',
    apellido_materno: empleado.apellido_materno ?? '',
    correo: empleado.correo ?? '',
    telefono: empleado.telefono ?? '',
    contrasena: '',
    horario_entrada: empleado.horario_entrada?.slice(0, 5) ?? '09:00',
    horario_salida: empleado.horario_salida?.slice(0, 5) ?? '18:00',
    id_rol: String(empleado.id_rol ?? ''),
    id_sucursal: String(empleado.id_sucursal ?? ''),
  };
}

function fullName(empleado) {
  return [
    empleado.nombre,
    empleado.apellido_paterno,
    empleado.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ');
}

function isValidPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z\d]/.test(password)
  );
}

export function validateForm(form, { editing }) {
  const errors = {};

  if (!form.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio';
  } else if (form.nombre.trim().length > 50) {
    errors.nombre = 'El nombre no puede exceder 50 caracteres';
  }

  if (!form.apellido_paterno.trim()) {
    errors.apellido_paterno = 'El apellido paterno es obligatorio';
  } else if (form.apellido_paterno.trim().length > 45) {
    errors.apellido_paterno = 'El apellido paterno no puede exceder 45 caracteres';
  }

  if (form.apellido_materno.trim().length > 45) {
    errors.apellido_materno = 'El apellido materno no puede exceder 45 caracteres';
  }

  const correo = form.correo.trim();
  if (!correo) {
    errors.correo = 'El correo es obligatorio';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errors.correo = 'El correo no es válido';
  }

  if (!/^\d{10,15}$/.test(form.telefono)) {
    errors.telefono = 'El teléfono debe tener entre 10 y 15 dígitos';
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.horario_entrada)) {
    errors.horario_entrada = 'Horario inválido';
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.horario_salida)) {
    errors.horario_salida = 'Horario inválido';
  } else if (
    /^([01]\d|2[0-3]):[0-5]\d$/.test(form.horario_entrada) &&
    form.horario_salida <= form.horario_entrada
  ) {
    errors.horario_salida = 'La hora de salida debe ser posterior a la de entrada';
  }

  if ((!editing || form.contrasena) && !isValidPassword(form.contrasena)) {
    errors.contrasena = 'La contraseña es débil';
  }

  if (!form.id_rol) {
    errors.id_rol = 'Selecciona un rol';
  }

  if (!form.id_sucursal) {
    errors.id_sucursal = 'Selecciona una sucursal';
  }

  return errors;
}

const EMPTY_TOUCHED = Object.fromEntries(
  Object.keys(EMPTY_FORM).map((field) => [field, false]),
);

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebouncedValue(search, 300);
  const requestIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState(EMPTY_TOUCHED);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const referencesRequestRef = useRef(0);

  const [estadoTarget, setEstadoTarget] = useState(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState(null);
  const [success, setSuccess] = useState('');

  const loadEmpleados = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await empleadosApi.list(debouncedSearch);
      if (requestId !== requestIdRef.current) return;
      setEmpleados(response.data);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadEmpleados();
  }, [loadEmpleados]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const loadReferences = useCallback(async () => {
    const requestId = ++referencesRequestRef.current;
    setLoadingReferences(true);
    setReferenceError('');

    try {
      const [rolesResponse, sucursalesResponse] = await Promise.all([
        rolesApi.list(),
        sucursalesApi.list(),
      ]);

      if (requestId !== referencesRequestRef.current) return;
      setRoles(rolesResponse.data);
      setSucursales(
        sucursalesResponse.data.filter(
          (sucursal) => sucursal.estado === undefined || sucursal.estado === 'activa',
        ),
      );
    } catch (requestError) {
      if (requestId !== referencesRequestRef.current) return;
      setReferenceError(requestError.message);
    } finally {
      if (requestId === referencesRequestRef.current) setLoadingReferences(false);
    }
  }, []);

  function resetForm(employee = null) {
    const nextForm = employee ? formFromEmpleado(employee) : EMPTY_FORM;
    setForm(nextForm);
    setInitialForm(nextForm);
    setFieldErrors({});
    setTouched({ ...EMPTY_TOUCHED });
    setSubmitAttempted(false);
    setFormError('');
    setReferenceError('');
    setPasswordVisible(false);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setModalOpen(true);
    loadReferences();
  }

  function openEdit(empleado) {
    setEditing(empleado);
    resetForm(empleado);
    setModalOpen(true);
    loadReferences();
  }

  function closeModal() {
    if (saving) return;
    referencesRequestRef.current += 1;
    setLoadingReferences(false);
    setModalOpen(false);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function markTouched(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  const validationErrors = validateForm(form, { editing: Boolean(editing) });
  const visibleFieldErrors = Object.fromEntries(
    Object.keys(EMPTY_FORM)
      .map((field) => [
        field,
        fieldErrors[field] ??
          ((touched[field] || submitAttempted) ? validationErrors[field] : undefined),
      ])
      .filter(([, message]) => Boolean(message)),
  );
  const hasAnyFieldErrors =
    Object.keys(validationErrors).length > 0 || Object.keys(fieldErrors).some(
      (field) => Boolean(fieldErrors[field]),
    );
  const formChanged =
    !editing ||
    form.nombre !== initialForm.nombre ||
    form.apellido_paterno !== initialForm.apellido_paterno ||
    form.apellido_materno !== initialForm.apellido_materno ||
    form.correo !== initialForm.correo ||
    form.telefono !== initialForm.telefono ||
    form.id_rol !== initialForm.id_rol ||
    form.id_sucursal !== initialForm.id_sucursal ||
    form.horario_entrada !== initialForm.horario_entrada ||
    form.horario_salida !== initialForm.horario_salida ||
    form.contrasena !== '';
  const canSave =
    !hasAnyFieldErrors &&
    formChanged &&
    !loadingReferences &&
    !referenceError;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (hasAnyFieldErrors || (editing && !formChanged)) return;
    setSaving(true);
    setFieldErrors({});
    setFormError('');

    const payload = { ...form };
    if (editing && !payload.contrasena) delete payload.contrasena;

    try {
      const response = editing
        ? await empleadosApi.update(editing.id_empleado, payload)
        : await empleadosApi.create(payload);

      setSuccess(
        response.message ||
          (editing
            ? 'Empleado actualizado correctamente'
            : 'Empleado registrado correctamente'),
      );
      setModalOpen(false);
      await loadEmpleados();
    } catch (requestError) {
      if (requestError.details) {
        const nextErrors = {};
        for (const detail of requestError.details) {
          nextErrors[detail.field] = detail.message;
        }
        setFieldErrors(nextErrors);
        setTouched((current) => ({
          ...current,
          ...Object.fromEntries(Object.keys(nextErrors).map((field) => [field, true])),
        }));
        const firstField = Object.keys(nextErrors)[0];
        if (firstField) {
          window.requestAnimationFrame(() => {
            document.querySelector(`[data-field="${firstField}"]`)?.focus();
          });
        }
      } else if (
        requestError.status === 409 &&
        requestError.message === 'Este correo ya está registrado'
      ) {
        setFieldErrors({ correo: requestError.message });
        setTouched((current) => ({ ...current, correo: true }));
        window.requestAnimationFrame(() => {
          document.querySelector('[data-field="correo"]')?.focus();
        });
      } else {
        setFormError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function openDeactivate(empleado) {
    setEstadoTarget(empleado);
  }

  async function updateEstado(empleado, estado) {
    setUpdatingEstadoId(empleado.id_empleado);
    setError('');

    try {
      const response = await empleadosApi.setEstado(empleado.id_empleado, estado);
      setSuccess(
        response.message ||
          (estado === 'activo'
            ? 'Empleado activado correctamente'
            : 'Empleado desactivado correctamente'),
      );
      setEstadoTarget(null);
      await loadEmpleados();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingEstadoId(null);
      setEstadoTarget(null);
    }
  }

  const countLabel = `${empleados.length} empleados`;
  const desactivarMessage = estadoTarget
    ? `${fullName(estadoTarget)} ya no podrá iniciar sesión si desactivas su cuenta.`
    : '';

  function renderEstadoBadge(empleado) {
    const activo = empleado.estado === 'activo';
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
          activo ? 'bg-sage text-forest' : 'bg-danger/10 text-danger',
        )}
      >
        {activo ? 'Activo' : 'Inactivo'}
      </span>
    );
  }

  function renderActions(empleado) {
    const activo = empleado.estado === 'activo';
    return (
      <div className="flex justify-end gap-1">
        <IconButton
          label={`Editar ${fullName(empleado)}`}
          icon={Pencil}
          variant="edit"
          onClick={() => openEdit(empleado)}
        />
        <IconButton
          label={`${activo ? 'Desactivar' : 'Activar'} ${fullName(empleado)}`}
          icon={activo ? UserRoundX : UserRoundCheck}
          variant={activo ? 'archive' : 'restore'}
          onClick={() =>
            activo
              ? openDeactivate(empleado)
              : updateEstado(empleado, 'activo')
          }
          loading={updatingEstadoId === empleado.id_empleado}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Empleados"
        description="Consulta y administra las cuentas del personal de Artextilo."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo empleado
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
              placeholder="Buscar por nombre…"
              className={cn(inputClass(false), 'pl-9')}
              aria-label="Buscar empleados por nombre"
            />
          </div>

          <p className="text-sm text-muted" aria-live="polite">
            {loading ? 'Cargando…' : countLabel}
          </p>
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
                  onClick={loadEmpleados}
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
        ) : error ? null : empleados.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={search ? 'Sin resultados' : 'Aún no hay empleados registrados'}
            description={
              search
                ? 'No encontramos empleados que coincidan con la búsqueda.'
                : 'Registra el primer empleado para empezar a operar.'
            }
            action={
              !search && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear primer empleado
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
                    <th className="px-4 py-3 font-semibold sm:px-6">Empleado</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Contacto</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Rol</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Sucursal</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {empleados.map((empleado) => (
                    <tr
                      key={empleado.id_empleado}
                      className="transition hover:bg-sand/40"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage text-forest">
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <p className="font-semibold text-ink">{fullName(empleado)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted sm:px-6">
                        <p className="break-all">{empleado.correo}</p>
                        <p className="mt-1 whitespace-nowrap text-xs">{empleado.telefono}</p>
                      </td>
                      <td className="px-4 py-4 text-muted sm:px-6">{empleado.rol}</td>
                      <td className="px-4 py-4 text-muted sm:px-6">{empleado.sucursal}</td>
                      <td className="px-4 py-4 sm:px-6">{renderEstadoBadge(empleado)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        {renderActions(empleado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line xl:hidden">
              {empleados.map((empleado) => (
                <article key={empleado.id_empleado} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{fullName(empleado)}</p>
                        {renderEstadoBadge(empleado)}
                      </div>
                      <p className="mt-1 break-all text-sm leading-6 text-muted">
                        {empleado.correo}
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted sm:flex-row sm:flex-wrap sm:gap-x-4">
                        <span>{empleado.telefono}</span>
                        <span>Rol: {empleado.rol}</span>
                        <span>Sucursal: {empleado.sucursal}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">{renderActions(empleado)}</div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar empleado' : 'Registrar empleado'}
        description={
          editing
            ? 'Actualiza los datos del empleado seleccionado.'
            : 'Registra una nueva cuenta para el personal.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="empleado-form"
              loading={saving}
              disabled={!canSave}
            >
              {editing ? 'Guardar cambios' : 'Guardar empleado'}
            </Button>
          </>
        }
      >
        <form
          id="empleado-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {formError && <Alert>{formError}</Alert>}
          {referenceError && (
            <Alert>
              <div className="flex flex-wrap items-center gap-3">
                <span>No se pudieron cargar los roles y sucursales: {referenceError}</span>
                <button
                  type="button"
                  onClick={loadReferences}
                  className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre"
              htmlFor="empleado-nombre"
              error={visibleFieldErrors.nombre}
            >
              <input
                id="empleado-nombre"
                data-field="nombre"
                data-autofocus
                type="text"
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                onBlur={() => markTouched('nombre')}
                className={inputClass(visibleFieldErrors.nombre)}
                maxLength={50}
                autoComplete="given-name"
                required
              />
            </Field>

            <Field
              label="Apellido paterno"
              htmlFor="empleado-apellido-paterno"
              error={visibleFieldErrors.apellido_paterno}
            >
              <input
                id="empleado-apellido-paterno"
                data-field="apellido_paterno"
                type="text"
                value={form.apellido_paterno}
                onChange={(event) => updateField('apellido_paterno', event.target.value)}
                onBlur={() => markTouched('apellido_paterno')}
                className={inputClass(visibleFieldErrors.apellido_paterno)}
                maxLength={45}
                autoComplete="family-name"
                required
              />
            </Field>
          </div>

          <Field
            label="Apellido materno (opcional)"
            htmlFor="empleado-apellido-materno"
            error={visibleFieldErrors.apellido_materno}
          >
            <input
              id="empleado-apellido-materno"
              data-field="apellido_materno"
              type="text"
              value={form.apellido_materno}
              onChange={(event) => updateField('apellido_materno', event.target.value)}
              onBlur={() => markTouched('apellido_materno')}
              className={inputClass(visibleFieldErrors.apellido_materno)}
              maxLength={45}
              autoComplete="additional-name"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Correo"
              htmlFor="empleado-correo"
              error={visibleFieldErrors.correo}
            >
              <input
                id="empleado-correo"
                data-field="correo"
                type="email"
                value={form.correo}
                onChange={(event) => updateField('correo', event.target.value)}
                onBlur={() => markTouched('correo')}
                className={inputClass(visibleFieldErrors.correo)}
                maxLength={100}
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Teléfono"
              htmlFor="empleado-telefono"
              error={visibleFieldErrors.telefono}
              hint="Solo dígitos, de 10 a 15."
            >
              <input
                id="empleado-telefono"
                data-field="telefono"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10,15}"
                value={form.telefono}
                onChange={(event) =>
                  updateField(
                    'telefono',
                    event.target.value.replace(/\D/g, '').slice(0, 15),
                  )
                }
                onBlur={() => markTouched('telefono')}
                className={inputClass(visibleFieldErrors.telefono)}
                maxLength={15}
                autoComplete="tel"
                required
              />
            </Field>
          </div>

          <div className="relative">
            <Field
              label={editing ? 'Contraseña (opcional)' : 'Contraseña'}
              htmlFor="empleado-contrasena"
              error={visibleFieldErrors.contrasena}
              hint="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo"
            >
              <input
                id="empleado-contrasena"
                data-field="contrasena"
                type={passwordVisible ? 'text' : 'password'}
                value={form.contrasena}
                onChange={(event) => updateField('contrasena', event.target.value)}
                onBlur={() => markTouched('contrasena')}
                className={cn(inputClass(visibleFieldErrors.contrasena), 'pr-11')}
                autoComplete="new-password"
                required={!editing}
              />
            </Field>
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute right-1.5 top-7 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-sand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Hora entrada"
              htmlFor="empleado-horario-entrada"
              error={visibleFieldErrors.horario_entrada}
            >
              <input
                id="empleado-horario-entrada"
                data-field="horario_entrada"
                type="time"
                value={form.horario_entrada}
                onChange={(event) =>
                  updateField('horario_entrada', event.target.value)
                }
                onBlur={() => markTouched('horario_entrada')}
                className={inputClass(visibleFieldErrors.horario_entrada)}
                required
              />
            </Field>

            <Field
              label="Hora salida"
              htmlFor="empleado-horario-salida"
              error={visibleFieldErrors.horario_salida}
            >
              <input
                id="empleado-horario-salida"
                data-field="horario_salida"
                type="time"
                value={form.horario_salida}
                onChange={(event) =>
                  updateField('horario_salida', event.target.value)
                }
                onBlur={() => markTouched('horario_salida')}
                className={inputClass(visibleFieldErrors.horario_salida)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Rol"
              htmlFor="empleado-rol"
              error={visibleFieldErrors.id_rol}
            >
              <select
                id="empleado-rol"
                data-field="id_rol"
                value={form.id_rol}
                onChange={(event) => updateField('id_rol', event.target.value)}
                onBlur={() => markTouched('id_rol')}
                className={inputClass(visibleFieldErrors.id_rol)}
                disabled={loadingReferences}
                required
              >
                <option value="">Selecciona un rol</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Sucursal"
              htmlFor="empleado-sucursal"
              error={visibleFieldErrors.id_sucursal}
            >
              <select
                id="empleado-sucursal"
                data-field="id_sucursal"
                value={form.id_sucursal}
                onChange={(event) => updateField('id_sucursal', event.target.value)}
                onBlur={() => markTouched('id_sucursal')}
                className={inputClass(visibleFieldErrors.id_sucursal)}
                disabled={loadingReferences}
                required
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(estadoTarget)}
        title="Desactivar empleado"
        message={desactivarMessage}
        confirmLabel="Desactivar"
        loading={Boolean(estadoTarget && updatingEstadoId === estadoTarget.id_empleado)}
        onCancel={() => setEstadoTarget(null)}
        onConfirm={() => estadoTarget && updateEstado(estadoTarget, 'inactivo')}
      />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { clientesApi } from '../api/clientes.js';
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
  telefono: '',
  correo: '',
  direccion: '',
  ciudad: '',
  estado_republica: '',
  codigo_postal: '',
  tiene_credito: false,
  limite_credito: '',
};

const EMPTY_TOUCHED = Object.fromEntries(
  Object.keys(EMPTY_FORM).map((field) => [field, false]),
);

function fullName(cliente) {
  return [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

function formFromCliente(cliente) {
  return {
    nombre: cliente.nombre ?? '',
    apellido_paterno: cliente.apellido_paterno ?? '',
    apellido_materno: cliente.apellido_materno ?? '',
    telefono: cliente.telefono ?? '',
    correo: cliente.correo ?? '',
    direccion: cliente.direccion ?? '',
    ciudad: cliente.ciudad ?? '',
    estado_republica: cliente.estado_republica ?? '',
    codigo_postal: cliente.codigo_postal ?? '',
    tiene_credito: Boolean(cliente.tiene_credito),
    limite_credito: cliente.tiene_credito ? String(cliente.limite_credito ?? '') : '',
  };
}

export function validateForm(form) {
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

  if (!/^\d{10,15}$/.test(form.telefono)) {
    errors.telefono = 'El teléfono debe tener entre 10 y 15 dígitos';
  }

  if (!form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria';
  } else if (form.direccion.trim().length > 150) {
    errors.direccion = 'La dirección no puede exceder 150 caracteres';
  }

  if (form.correo.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      errors.correo = 'El correo no es válido';
    } else if (form.correo.trim().length > 100) {
      errors.correo = 'El correo no puede exceder 100 caracteres';
    }
  }

  if (form.ciudad.trim().length > 60) {
    errors.ciudad = 'La ciudad no puede exceder 60 caracteres';
  }

  if (form.estado_republica.trim().length > 60) {
    errors.estado_republica = 'El estado no puede exceder 60 caracteres';
  }

  if (form.codigo_postal && !/^\d{5}$/.test(form.codigo_postal)) {
    errors.codigo_postal = 'El código postal debe tener 5 dígitos';
  }

  if (
    form.tiene_credito &&
    (!/^\d+$/.test(form.limite_credito) ||
      Number(form.limite_credito) <= 0 ||
      Number(form.limite_credito) > 99999999)
  ) {
    errors.limite_credito = 'El límite de crédito debe ser mayor a 0';
  }

  return errors;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
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

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');

  const loadClientes = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await clientesApi.list(debouncedSearch);
      if (requestId !== requestIdRef.current) return;
      setClientes(response.data);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return;
    setEditing(null);
    resetForm();
    setModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('nuevo');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function resetForm(cliente = null) {
    const nextForm = cliente ? formFromCliente(cliente) : EMPTY_FORM;
    setForm(nextForm);
    setInitialForm(nextForm);
    setFieldErrors({});
    setTouched({ ...EMPTY_TOUCHED });
    setSubmitAttempted(false);
    setFormError('');
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(cliente) {
    setEditing(cliente);
    resetForm(cliente);
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

  function markTouched(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  const validationErrors = validateForm(form);
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
    Object.keys(validationErrors).length > 0 ||
    Object.keys(fieldErrors).some((field) => Boolean(fieldErrors[field]));
  const formChanged =
    !editing ||
    form.nombre !== initialForm.nombre ||
    form.apellido_paterno !== initialForm.apellido_paterno ||
    form.apellido_materno !== initialForm.apellido_materno ||
    form.telefono !== initialForm.telefono ||
    form.correo !== initialForm.correo ||
    form.direccion !== initialForm.direccion ||
    form.ciudad !== initialForm.ciudad ||
    form.estado_republica !== initialForm.estado_republica ||
    form.codigo_postal !== initialForm.codigo_postal ||
    form.tiene_credito !== initialForm.tiene_credito ||
    form.limite_credito !== initialForm.limite_credito;
  const canSave = !hasAnyFieldErrors && formChanged;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (hasAnyFieldErrors || (editing && !formChanged)) return;

    setSaving(true);
    setFieldErrors({});
    setFormError('');

    const payload = {
      ...form,
      nombre: form.nombre.trim(),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: form.apellido_materno.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim(),
      ciudad: form.ciudad.trim(),
      estado_republica: form.estado_republica.trim(),
      codigo_postal: form.codigo_postal.trim(),
      tiene_credito: form.tiene_credito,
      limite_credito: form.tiene_credito ? Number(form.limite_credito) : 0,
    };

    try {
      const response = editing
        ? await clientesApi.update(editing.id_cliente, payload)
        : await clientesApi.create(payload);

      setSuccess(
        response.message ||
          (editing
            ? 'Cliente actualizado correctamente'
            : 'Cliente registrado correctamente'),
      );
      setModalOpen(false);
      await loadClientes();
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
        requestError.message === 'Error al intentar registrar un cliente duplicado'
      ) {
        setFieldErrors({ telefono: requestError.message });
        setTouched((current) => ({ ...current, telefono: true }));
        window.requestAnimationFrame(() => {
          document.querySelector('[data-field="telefono"]')?.focus();
        });
      } else {
        setFormError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');

    try {
      const response = await clientesApi.remove(deleteTarget.id_cliente);
      setSuccess(response.message || 'Cliente eliminado correctamente');
      setDeleteTarget(null);
      await loadClientes();
    } catch (requestError) {
      setError(requestError.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const countLabel = `${clientes.length} clientes`;

  function renderCreditBadge(cliente) {
    if (!cliente.tiene_credito) return null;
    const amount = Number(cliente.limite_credito).toLocaleString('es-MX');
    return (
      <span className="inline-flex items-center rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-forest">
        Crédito ${amount}
      </span>
    );
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Agenda de clientes de Artextilo."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo cliente
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
              placeholder="Buscar por nombre o teléfono…"
              className={cn(inputClass(false), 'pl-9')}
              aria-label="Buscar clientes por nombre o teléfono"
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
                  onClick={loadClientes}
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
        ) : error ? null : clientes.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={search ? 'Sin resultados' : 'Aún no hay clientes registrados'}
            description={
              search
                ? 'No encontramos clientes que coincidan con la búsqueda.'
                : 'Registra el primer cliente para empezar a crear tu agenda.'
            }
            action={
              !search && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear primer cliente
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
                    <th className="px-4 py-3 font-semibold sm:px-6">Cliente</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Teléfono</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Dirección</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id_cliente} className="transition hover:bg-sand/40">
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage text-forest">
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{fullName(cliente)}</p>
                            {cliente.tiene_credito ? (
                              <div className="mt-1">{renderCreditBadge(cliente)}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-6">
                        {cliente.telefono}
                      </td>
                      <td className="max-w-[28rem] px-4 py-4 text-muted sm:px-6">
                        <span className="inline-flex items-start gap-1.5 break-words leading-6">
                          <MapPin className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {cliente.direccion}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-1">
                          <IconButton
                            label={`Editar ${fullName(cliente)}`}
                            icon={Pencil}
                            variant="edit"
                            onClick={() => openEdit(cliente)}
                          />
                          <IconButton
                            label={`Eliminar ${fullName(cliente)}`}
                            icon={Trash2}
                            variant="archive"
                            onClick={() => setDeleteTarget(cliente)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line xl:hidden">
              {clientes.map((cliente) => (
                <article key={cliente.id_cliente} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{fullName(cliente)}</p>
                        {renderCreditBadge(cliente)}
                      </div>
                      <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted">
                        <span>{cliente.telefono}</span>
                        <span className="inline-flex items-start gap-1.5 break-words">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {cliente.direccion}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <IconButton
                      label={`Editar ${fullName(cliente)}`}
                      icon={Pencil}
                      variant="edit"
                      onClick={() => openEdit(cliente)}
                    />
                    <IconButton
                      label={`Eliminar ${fullName(cliente)}`}
                      icon={Trash2}
                      variant="archive"
                      onClick={() => setDeleteTarget(cliente)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Actualizar datos de cliente' : 'Registrar cliente'}
        description={
          editing
            ? 'Actualiza los datos del cliente seleccionado.'
            : 'Registra un nuevo cliente en la agenda.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="cliente-form"
              loading={saving}
              disabled={!canSave}
            >
              {editing ? 'Guardar cambios' : 'Guardar cliente'}
            </Button>
          </>
        }
      >
        <form
          id="cliente-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {formError && <Alert>{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre(s)"
              htmlFor="cliente-nombre"
              error={visibleFieldErrors.nombre}
            >
              <input
                id="cliente-nombre"
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
              htmlFor="cliente-apellido-paterno"
              error={visibleFieldErrors.apellido_paterno}
            >
              <input
                id="cliente-apellido-paterno"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Apellido materno (opcional)"
              htmlFor="cliente-apellido-materno"
              error={visibleFieldErrors.apellido_materno}
            >
              <input
                id="cliente-apellido-materno"
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

            <Field
              label="Teléfono"
              htmlFor="cliente-telefono"
              error={visibleFieldErrors.telefono}
              hint="Solo dígitos, de 10 a 15."
            >
              <input
                id="cliente-telefono"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ciudad (opcional)"
              htmlFor="cliente-ciudad"
              error={visibleFieldErrors.ciudad}
            >
              <input
                id="cliente-ciudad"
                data-field="ciudad"
                type="text"
                value={form.ciudad}
                onChange={(event) => updateField('ciudad', event.target.value)}
                onBlur={() => markTouched('ciudad')}
                className={inputClass(visibleFieldErrors.ciudad)}
                maxLength={60}
                autoComplete="address-level2"
              />
            </Field>

            <Field
              label="Estado (opcional)"
              htmlFor="cliente-estado-republica"
              error={visibleFieldErrors.estado_republica}
            >
              <input
                id="cliente-estado-republica"
                data-field="estado_republica"
                type="text"
                value={form.estado_republica}
                onChange={(event) => updateField('estado_republica', event.target.value)}
                onBlur={() => markTouched('estado_republica')}
                className={inputClass(visibleFieldErrors.estado_republica)}
                maxLength={60}
                autoComplete="address-level1"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Código postal (opcional)"
              htmlFor="cliente-codigo-postal"
              error={visibleFieldErrors.codigo_postal}
            >
              <input
                id="cliente-codigo-postal"
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
                onBlur={() => markTouched('codigo_postal')}
                className={inputClass(visibleFieldErrors.codigo_postal)}
                maxLength={5}
                autoComplete="postal-code"
              />
            </Field>
          </div>

          <Field
            label="Correo (opcional)"
            htmlFor="cliente-correo"
            error={visibleFieldErrors.correo}
          >
            <input
              id="cliente-correo"
              data-field="correo"
              type="email"
              value={form.correo}
              onChange={(event) => updateField('correo', event.target.value)}
              onBlur={() => markTouched('correo')}
              className={inputClass(visibleFieldErrors.correo)}
              maxLength={100}
              autoComplete="email"
            />
          </Field>

          <Field
            label="Dirección"
            htmlFor="cliente-direccion"
            error={visibleFieldErrors.direccion}
          >
            <textarea
              id="cliente-direccion"
              data-field="direccion"
              value={form.direccion}
              onChange={(event) => updateField('direccion', event.target.value)}
              onBlur={() => markTouched('direccion')}
              className={cn(inputClass(visibleFieldErrors.direccion), 'min-h-24 resize-y')}
              maxLength={150}
              autoComplete="street-address"
              required
            />
          </Field>

          <fieldset className="space-y-4 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Crédito</legend>
            <label
              htmlFor="cliente-tiene-credito"
              className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink"
            >
              <input
                id="cliente-tiene-credito"
                data-field="tiene_credito"
                type="checkbox"
                checked={form.tiene_credito}
                onChange={(event) => {
                  const tieneCredito = event.target.checked;
                  setForm((current) => ({
                    ...current,
                    tiene_credito: tieneCredito,
                    limite_credito: tieneCredito ? current.limite_credito : '',
                  }));
                  setFieldErrors((current) => ({
                    ...current,
                    tiene_credito: undefined,
                    limite_credito: undefined,
                  }));
                  setTouched((current) => ({
                    ...current,
                    tiene_credito: true,
                    limite_credito: tieneCredito ? true : current.limite_credito,
                  }));
                }}
                onBlur={() => markTouched('tiene_credito')}
                className="h-4 w-4 rounded border-line text-clay accent-clay focus:ring-clay"
              />
              Tiene crédito
            </label>

            {form.tiene_credito && (
              <Field
                label="Límite de crédito"
                htmlFor="cliente-limite-credito"
                error={visibleFieldErrors.limite_credito}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
                    $
                  </span>
                  <input
                    id="cliente-limite-credito"
                    data-field="limite_credito"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.limite_credito}
                    onChange={(event) =>
                      updateField(
                        'limite_credito',
                        event.target.value.replace(/\D/g, '').slice(0, 8),
                      )
                    }
                    onBlur={() => markTouched('limite_credito')}
                    className={cn(
                      inputClass(visibleFieldErrors.limite_credito),
                      'pl-7',
                    )}
                    maxLength={8}
                    required
                  />
                </div>
              </Field>
            )}
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar cliente"
        message="El cliente dejará de aparecer en la agenda. Sus pedidos anteriores se conservan."
        confirmLabel="Eliminar"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Users,
  UserPlus,
  UserCheck,
  UserRoundCheck,
  UserRoundX,
  Eye,
  EyeOff,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import IconButton from '../components/IconButton.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { sucursalesApi } from '../api/sucursales.js';
import { empleadosApi } from '../api/empleados.js';
import { rolesApi } from '../api/roles.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { cn } from '../lib/cn.js';
import { formatDate } from '../lib/format.js';
import { formatRole } from '../lib/roles.js';

const EMPTY_FORM = {
  nombre: '',
  direccion: '',
  ciudad: 'Oaxaca de Juárez',
  estado_republica: 'Oaxaca',
  codigo_postal: '',
  telefono: '',
  horario: '',
  empleados_ids: [],
};

const EMPTY_EMPLEADO_FORM = {
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

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebouncedValue(search, 300);
  const requestIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [listaEmpleados, setListaEmpleados] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);

  // Modal para agregar o editar empleado directo en la sucursal seleccionada
  const [empleadoModalOpen, setEmpleadoModalOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [roles, setRoles] = useState([
    { id_rol: 1, nombre: 'administrador' },
    { id_rol: 2, nombre: 'empleado' },
    { id_rol: 4, nombre: 'supervisor' },
  ]);
  const [empleadoForm, setEmpleadoForm] = useState(EMPTY_EMPLEADO_FORM);
  const [empleadoErrors, setEmpleadoErrors] = useState({});
  const [empleadoError, setEmpleadoError] = useState('');
  const [savingEmpleado, setSavingEmpleado] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Modal para asignar empleados registrados a la sucursal seleccionada
  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [searchEmpExistente, setSearchEmpExistente] = useState('');
  const [savingAsignacion, setSavingAsignacion] = useState(false);
  const [asignarError, setAsignarError] = useState('');

  // Para cambio de estado (activar / desactivar empleado)
  const [estadoTarget, setEstadoTarget] = useState(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState(null);

  const [success, setSuccess] = useState('');

  const loadSucursales = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await sucursalesApi.list(debouncedSearch);
      if (requestId !== requestIdRef.current) return;
      setSucursales(Array.isArray(response?.data) ? response.data : []);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setError(requestError.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch]);

  const loadEmpleados = useCallback(async () => {
    try {
      const res = await empleadosApi.list();
      if (Array.isArray(res.data)) {
        setListaEmpleados(res.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadSucursales();
    loadEmpleados();
    rolesApi
      .list()
      .then((res) => {
        if (Array.isArray(res.data)) setRoles(res.data);
      })
      .catch(() => {});
  }, [loadSucursales, loadEmpleados]);

  // Si hay una sucursal seleccionada y la lista de sucursales cambia, actualizarla
  useEffect(() => {
    if (sucursales.length > 0 && !sucursalSeleccionada) {
      setSucursalSeleccionada(sucursales[0]);
    } else if (sucursalSeleccionada) {
      const encontrada = sucursales.find((s) => Number(s.id_sucursal) === Number(sucursalSeleccionada.id_sucursal));
      if (encontrada) setSucursalSeleccionada(encontrada);
    }
  }, [sucursales, sucursalSeleccionada]);

  const empleadosDisponiblesParaAsignar = useMemo(() => {
    if (!sucursalSeleccionada) return [];
    const idActual = Number(sucursalSeleccionada.id_sucursal);
    const ajenos = listaEmpleados.filter((emp) => Number(emp.id_sucursal) !== idActual);
    const q = searchEmpExistente.trim().toLowerCase();
    if (!q) return ajenos;
    return ajenos.filter((emp) => {
      const full = `${emp.nombre || ''} ${emp.apellido_paterno || ''} ${emp.apellido_materno || ''}`.toLowerCase();
      const rol = String(emp.rol || '').toLowerCase();
      const correo = String(emp.correo || '').toLowerCase();
      const sucursal = String(emp.sucursal || '').toLowerCase();
      return full.includes(q) || rol.includes(q) || correo.includes(q) || sucursal.includes(q);
    });
  }, [listaEmpleados, sucursalSeleccionada, searchEmpExistente]);

  function abrirModalAsignarExistente() {
    setSelectedEmpIds([]);
    setSearchEmpExistente('');
    setAsignarError('');
    setAsignarModalOpen(true);
  }

  function toggleSelectEmpExistente(id) {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleGuardarAsignacion(e) {
    e.preventDefault();
    if (!sucursalSeleccionada) return;
    if (selectedEmpIds.length === 0) {
      setAsignarError('Selecciona al menos un empleado para asignar a esta sucursal.');
      return;
    }

    setSavingAsignacion(true);
    setAsignarError('');

    try {
      await Promise.all(
        selectedEmpIds.map((id) =>
          empleadosApi.setSucursal(id, sucursalSeleccionada.id_sucursal),
        ),
      );

      setSuccess(
        `Se ${selectedEmpIds.length === 1 ? 'asignó 1 empleado' : `asignaron ${selectedEmpIds.length} empleados`} a la sucursal ${sucursalSeleccionada.nombre}.`,
      );
      setAsignarModalOpen(false);
      await loadEmpleados();
      await loadSucursales();
    } catch (err) {
      setAsignarError(err.message || 'Error al asignar empleados a la sucursal');
    } finally {
      setSavingAsignacion(false);
    }
  }

  function abrirModalNuevoEmpleado() {
    setEditingEmpleado(null);
    setEmpleadoForm({
      ...EMPTY_EMPLEADO_FORM,
      id_rol: roles[0]?.id_rol ? String(roles[0].id_rol) : '',
      id_sucursal: String(sucursalSeleccionada?.id_sucursal || ''),
    });
    setEmpleadoErrors({});
    setEmpleadoError('');
    setShowPass(false);
    setEmpleadoModalOpen(true);
  }

  function abrirModalEditarEmpleado(emp) {
    setEditingEmpleado(emp);
    setEmpleadoForm({
      nombre: emp.nombre ?? '',
      apellido_paterno: emp.apellido_paterno ?? '',
      apellido_materno: emp.apellido_materno ?? '',
      correo: emp.correo ?? '',
      telefono: emp.telefono ?? '',
      contrasena: '',
      horario_entrada: emp.horario_entrada?.slice(0, 5) ?? '09:00',
      horario_salida: emp.horario_salida?.slice(0, 5) ?? '18:00',
      id_rol: String(emp.id_rol ?? (roles[0]?.id_rol || '')),
      id_sucursal: String(emp.id_sucursal ?? sucursalSeleccionada?.id_sucursal ?? ''),
    });
    setEmpleadoErrors({});
    setEmpleadoError('');
    setShowPass(false);
    setEmpleadoModalOpen(true);
  }

  async function handleGuardarEmpleado(e) {
    e.preventDefault();
    setEmpleadoError('');
    setEmpleadoErrors({});

    const errors = {};
    if (!empleadoForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!empleadoForm.apellido_paterno.trim()) errors.apellido_paterno = 'El apellido es obligatorio';
    if (!empleadoForm.correo.trim()) {
      errors.correo = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empleadoForm.correo.trim())) {
      errors.correo = 'El correo no es válido';
    }
    if (!empleadoForm.telefono.trim()) {
      errors.telefono = 'El teléfono es obligatorio';
    } else if (!/^\d{10,15}$/.test(empleadoForm.telefono.replace(/\D/g, ''))) {
      errors.telefono = 'El teléfono debe tener entre 10 y 15 dígitos';
    }
    if (!empleadoForm.id_rol) errors.id_rol = 'Selecciona un rol';

    if (
      empleadoForm.horario_entrada &&
      empleadoForm.horario_salida &&
      empleadoForm.horario_salida <= empleadoForm.horario_entrada
    ) {
      errors.horario_salida = 'La hora de salida debe ser posterior a la de entrada';
    }

    // Validación de contraseña
    const pass = empleadoForm.contrasena;
    if (!editingEmpleado || pass) {
      if (
        !pass ||
        pass.length < 8 ||
        !/[A-Z]/.test(pass) ||
        !/[a-z]/.test(pass) ||
        !/\d/.test(pass) ||
        !/[^A-Za-z\d]/.test(pass)
      ) {
        errors.contrasena =
          'Debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEmpleadoErrors(errors);
      return;
    }

    setSavingEmpleado(true);
    try {
      if (editingEmpleado) {
        const payload = {
          nombre: empleadoForm.nombre.trim(),
          apellido_paterno: empleadoForm.apellido_paterno.trim(),
          apellido_materno: empleadoForm.apellido_materno?.trim() || null,
          correo: empleadoForm.correo.trim().toLowerCase(),
          telefono: empleadoForm.telefono.trim(),
          id_rol: Number(empleadoForm.id_rol),
          id_sucursal: Number(empleadoForm.id_sucursal || sucursalSeleccionada.id_sucursal),
          horario_entrada: empleadoForm.horario_entrada,
          horario_salida: empleadoForm.horario_salida,
        };
        if (empleadoForm.contrasena) {
          payload.contrasena = empleadoForm.contrasena;
        }
        await empleadosApi.update(editingEmpleado.id_empleado, payload);
        setSuccess('Empleado actualizado correctamente.');
      } else {
        await empleadosApi.create({
          nombre: empleadoForm.nombre.trim(),
          apellido_paterno: empleadoForm.apellido_paterno.trim(),
          apellido_materno: empleadoForm.apellido_materno?.trim() || null,
          correo: empleadoForm.correo.trim().toLowerCase(),
          telefono: empleadoForm.telefono.trim(),
          contrasena: empleadoForm.contrasena,
          id_rol: Number(empleadoForm.id_rol),
          id_sucursal: Number(empleadoForm.id_sucursal || sucursalSeleccionada.id_sucursal),
          horario_entrada: empleadoForm.horario_entrada,
          horario_salida: empleadoForm.horario_salida,
        });
        setSuccess('Empleado registrado y asignado a la sucursal correctamente.');
      }

      setEmpleadoModalOpen(false);
      await loadEmpleados();
    } catch (err) {
      setEmpleadoError(err.message || 'Error al guardar el empleado');
    } finally {
      setSavingEmpleado(false);
    }
  }

  async function handleToggleEstado(empleado, nuevoEstado) {
    setUpdatingEstadoId(empleado.id_empleado);
    try {
      const response = await empleadosApi.setEstado(empleado.id_empleado, nuevoEstado);
      setSuccess(
        response.message ||
          (nuevoEstado === 'activo'
            ? 'Empleado activado correctamente.'
            : 'Empleado desactivado correctamente.'),
      );
      setEstadoTarget(null);
      await loadEmpleados();
    } catch (err) {
      setError(err.message || 'Error al cambiar estado del empleado');
    } finally {
      setUpdatingEstadoId(null);
      setEstadoTarget(null);
    }
  }

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
      ciudad: sucursal.ciudad || 'Oaxaca de Juárez',
      estado_republica: sucursal.estado_republica || 'Oaxaca',
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

  function toggleEmpleadoSelection(idEmpleado) {
    const id = Number(idEmpleado);
    setForm((current) => {
      const selected = current.empleados_ids || [];
      const exists = selected.includes(id);
      return {
        ...current,
        empleados_ids: exists ? selected.filter((item) => item !== id) : [...selected, id],
      };
    });
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

  const countLabel = `${sucursales.length} ${
    sucursales.length === 1 ? 'sucursal activa' : 'sucursales activas'
  }`;

  function renderActions(sucursal) {
    return (
      <IconButton
        label={`Editar ${sucursal.nombre}`}
        icon={Pencil}
        variant="edit"
        onClick={() => openEdit(sucursal)}
      />
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
            title={search ? 'Sin resultados' : 'Aún no hay sucursales registradas'}
            description={
              search
                ? 'No encontramos sucursales que coincidan con la búsqueda.'
                : 'Registra la primera sucursal para empezar a operar.'
            }
            action={
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
                      Actualizada
                    </th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sucursales.map((sucursal) => {
                    const isSelected = sucursalSeleccionada?.id_sucursal === sucursal.id_sucursal;
                    return (
                      <tr
                        key={sucursal.id_sucursal}
                        onClick={() => setSucursalSeleccionada(sucursal)}
                        className={cn(
                          'transition cursor-pointer',
                          isSelected ? 'bg-sage/20 border-l-4 border-l-forest' : 'hover:bg-sand/40',
                        )}
                      >
                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                isSelected ? 'bg-forest text-white' : 'bg-sage text-forest',
                              )}
                            >
                              <Store className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink flex items-center gap-2">
                                {sucursal.nombre}
                                {isSelected && (
                                  <span className="text-[10px] font-bold uppercase bg-forest text-white px-1.5 py-0.5 rounded">
                                    Seleccionada
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 flex items-start gap-1.5 break-words text-xs leading-5 text-muted">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  {sucursal.direccion}
                                  {sucursal.ciudad ? `, ${sucursal.ciudad}` : ''} · CP {sucursal.codigo_postal}
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
                          {formatDate(sucursal.updated_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">{renderActions(sucursal)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line xl:hidden">
              {sucursales.map((sucursal) => {
                const isSelected = sucursalSeleccionada?.id_sucursal === sucursal.id_sucursal;
                return (
                  <article
                    key={sucursal.id_sucursal}
                    onClick={() => setSucursalSeleccionada(sucursal)}
                    className={cn(
                      'p-4 sm:p-5 transition cursor-pointer',
                      isSelected ? 'bg-sage/20 border-l-4 border-l-forest' : 'hover:bg-sand/40',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          isSelected ? 'bg-forest text-white' : 'bg-sage text-forest',
                        )}
                      >
                        <Store className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink flex items-center gap-2">
                          {sucursal.nombre}
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase bg-forest text-white px-1.5 py-0.5 rounded">
                              Seleccionada
                            </span>
                          )}
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 break-words text-sm leading-6 text-muted">
                          <MapPin className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {sucursal.direccion}
                            {sucursal.ciudad ? `, ${sucursal.ciudad}` : ''} · CP {sucursal.codigo_postal}
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
                          Actualizada: {formatDate(sucursal.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {renderActions(sucursal)}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sección de Empleados asignados a la sucursal seleccionada */}
      {sucursalSeleccionada && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between bg-sand/30">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-forest" />
                <h2 className="font-display text-lg font-semibold text-ink">
                  Empleados en {sucursalSeleccionada.nombre}
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Personal asignado a este punto de venta.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={abrirModalAsignarExistente}
              >
                <UserCheck className="h-4 w-4" />
                Asignar empleado registrado
              </Button>
              <Button size="sm" onClick={abrirModalNuevoEmpleado}>
                <UserPlus className="h-4 w-4" />
                Nuevo empleado
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {listaEmpleados.filter((e) => Number(e.id_sucursal) === Number(sucursalSeleccionada.id_sucursal)).length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                <Users className="mx-auto h-8 w-8 text-muted/60 mb-2" />
                <p className="font-semibold text-ink">No hay empleados asignados a esta sucursal</p>
                <p className="mt-1 text-xs">Usa "Asignar empleado registrado" para vincular personal existente o "Nuevo empleado" para dar de alta nuevo personal.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listaEmpleados
                  .filter((e) => Number(e.id_sucursal) === Number(sucursalSeleccionada.id_sucursal))
                  .map((emp) => {
                    const activo = emp.estado === 'activo';
                    return (
                      <div
                        key={emp.id_empleado}
                        className={cn(
                          'rounded-xl border p-4 shadow-xs transition flex flex-col justify-between gap-3',
                          activo
                            ? 'border-line bg-paper hover:border-forest/40'
                            : 'border-line/70 bg-sand/20 opacity-80',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm',
                              activo ? 'bg-sage text-forest' : 'bg-muted/20 text-muted',
                            )}
                          >
                            {emp.nombre?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-ink truncate text-sm">
                                {emp.nombre} {emp.apellido_paterno}
                              </p>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                                  activo ? 'bg-sage text-forest' : 'bg-danger/10 text-danger',
                                )}
                              >
                                {activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-xs text-muted truncate">{emp.correo}</p>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                              <span className="font-medium bg-sand px-2 py-0.5 rounded text-clay">
                                {formatRole(emp.rol)}
                              </span>
                              <span>{emp.telefono}</span>
                            </div>
                            {(emp.horario_entrada || emp.horario_salida) && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                                <Clock className="h-3 w-3" />
                                {emp.horario_entrada?.slice(0, 5)} - {emp.horario_salida?.slice(0, 5)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Acciones de empleado: Editar y Cambiar Estado */}
                        <div className="flex items-center justify-end gap-1 border-t border-line/60 pt-2.5">
                          <IconButton
                            label={`Editar ${emp.nombre}`}
                            icon={Pencil}
                            variant="edit"
                            onClick={() => abrirModalEditarEmpleado(emp)}
                          />
                          <IconButton
                            label={activo ? `Desactivar ${emp.nombre}` : `Activar ${emp.nombre}`}
                            icon={activo ? UserRoundX : UserRoundCheck}
                            variant={activo ? 'archive' : 'restore'}
                            onClick={() => (activo ? setEstadoTarget(emp) : handleToggleEstado(emp, 'activo'))}
                            loading={updatingEstadoId === emp.id_empleado}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      )}

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
              label="Ciudad"
              htmlFor="sucursal-ciudad"
              error={fieldErrors.ciudad}
            >
              <input
                id="sucursal-ciudad"
                data-field="ciudad"
                type="text"
                value={form.ciudad}
                onChange={(event) => updateField('ciudad', event.target.value)}
                className={inputClass(fieldErrors.ciudad)}
                placeholder="Ej. Oaxaca de Juárez"
                maxLength={60}
                required
              />
            </Field>

            <Field
              label="Estado"
              htmlFor="sucursal-estado"
              error={fieldErrors.estado_republica}
            >
              <input
                id="sucursal-estado"
                data-field="estado_republica"
                type="text"
                value={form.estado_republica}
                onChange={(event) => updateField('estado_republica', event.target.value)}
                className={inputClass(fieldErrors.estado_republica)}
                placeholder="Ej. Oaxaca"
                maxLength={60}
                required
              />
            </Field>
          </div>

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

          {!editing && (
            <div className="space-y-2 rounded-xl border border-line bg-sand/30 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  Asignar empleados a esta sucursal (opcional)
                </span>
                <span className="text-[11px] text-muted">
                  {(form.empleados_ids || []).length} seleccionados
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Los empleados marcados serán transferidos y asignados a esta nueva sucursal al momento de crearla.
              </p>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {listaEmpleados.length > 0 ? (
                  listaEmpleados.map((emp) => {
                    const isSelected = (form.empleados_ids || []).includes(emp.id_empleado);
                    return (
                      <label
                        key={emp.id_empleado}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer border transition',
                          isSelected
                            ? 'border-forest/40 bg-forest/10 font-semibold text-forest'
                            : 'border-transparent bg-paper hover:bg-sand/60 text-ink',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEmpleadoSelection(emp.id_empleado)}
                            className="rounded border-line text-forest focus:ring-forest h-3.5 w-3.5"
                          />
                          <span>
                            {emp.nombre} {emp.apellido_paterno}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted">
                          {formatRole(emp.rol)} {emp.sucursal ? `(${emp.sucursal})` : ''}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-center py-2 text-xs text-muted">No hay empleados disponibles para asignar.</p>
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal para registrar o editar un empleado directamente en la sucursal seleccionada */}
      <Modal
        open={empleadoModalOpen}
        onClose={() => !savingEmpleado && setEmpleadoModalOpen(false)}
        title={
          editingEmpleado
            ? `Editar empleado · ${editingEmpleado.nombre} ${editingEmpleado.apellido_paterno}`
            : `Nuevo empleado · ${sucursalSeleccionada?.nombre || ''}`
        }
        description={
          editingEmpleado
            ? 'Actualiza los datos del colaborador o asigna una nueva contraseña si lo deseas.'
            : `Registra un nuevo miembro del equipo y asígnalo directamente a ${sucursalSeleccionada?.nombre || 'la sucursal'}.`
        }
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEmpleadoModalOpen(false)}
              disabled={savingEmpleado}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-empleado-sucursal"
              loading={savingEmpleado}
            >
              {editingEmpleado ? 'Guardar cambios' : 'Registrar empleado'}
            </Button>
          </>
        }
      >
        <form id="form-empleado-sucursal" onSubmit={handleGuardarEmpleado} className="space-y-4">
          {empleadoError && <Alert>{empleadoError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="emp-nombre" error={empleadoErrors.nombre} required>
              <input
                id="emp-nombre"
                type="text"
                value={empleadoForm.nombre}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, nombre: e.target.value })}
                className={inputClass(empleadoErrors.nombre)}
                placeholder="Nombre(s)"
                required
              />
            </Field>

            <Field label="Apellido paterno" htmlFor="emp-apellido-paterno" error={empleadoErrors.apellido_paterno} required>
              <input
                id="emp-apellido-paterno"
                type="text"
                value={empleadoForm.apellido_paterno}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, apellido_paterno: e.target.value })}
                className={inputClass(empleadoErrors.apellido_paterno)}
                placeholder="Apellido paterno"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Apellido materno (opcional)" htmlFor="emp-apellido-materno">
              <input
                id="emp-apellido-materno"
                type="text"
                value={empleadoForm.apellido_materno}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, apellido_materno: e.target.value })}
                className={inputClass()}
                placeholder="Apellido materno"
              />
            </Field>

            <Field label="Rol" htmlFor="emp-rol" error={empleadoErrors.id_rol} required>
              <select
                id="emp-rol"
                value={empleadoForm.id_rol}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, id_rol: e.target.value })}
                className={inputClass(empleadoErrors.id_rol)}
                required
              >
                <option value="">Selecciona un rol</option>
                {roles.map((r) => (
                  <option key={r.id_rol} value={r.id_rol}>
                    {formatRole(r.nombre)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico" htmlFor="emp-correo" error={empleadoErrors.correo} required>
              <input
                id="emp-correo"
                type="email"
                value={empleadoForm.correo}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, correo: e.target.value })}
                className={inputClass(empleadoErrors.correo)}
                placeholder="correo@ejemplo.com"
                required
              />
            </Field>

            <Field label="Teléfono" htmlFor="emp-telefono" error={empleadoErrors.telefono} hint="10 a 15 dígitos" required>
              <input
                id="emp-telefono"
                type="tel"
                value={empleadoForm.telefono}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, telefono: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                className={inputClass(empleadoErrors.telefono)}
                placeholder="9511234567"
                required
              />
            </Field>
          </div>

          <Field
            label="Contraseña"
            htmlFor="emp-pass"
            error={empleadoErrors.contrasena}
            hint={
              editingEmpleado
                ? 'Opcional. Deja en blanco para conservar la actual. Si deseas cambiarla: mín. 8 caracteres, mayúscula, minúscula, número y símbolo.'
                : 'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (ej. Artextilo2026!)'
            }
            required={!editingEmpleado}
          >
            <div className="relative">
              <input
                id="emp-pass"
                type={showPass ? 'text' : 'password'}
                value={empleadoForm.contrasena}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, contrasena: e.target.value })}
                className={cn(inputClass(empleadoErrors.contrasena), 'pr-10')}
                placeholder={editingEmpleado ? '••••••••' : 'Contraseña segura'}
                required={!editingEmpleado}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Horario de entrada" htmlFor="emp-entrada">
              <input
                id="emp-entrada"
                type="time"
                value={empleadoForm.horario_entrada}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, horario_entrada: e.target.value })}
                className={inputClass()}
                required
              />
            </Field>

            <Field label="Horario de salida" htmlFor="emp-salida" error={empleadoErrors.horario_salida}>
              <input
                id="emp-salida"
                type="time"
                value={empleadoForm.horario_salida}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, horario_salida: e.target.value })}
                className={inputClass(empleadoErrors.horario_salida)}
                required
              />
            </Field>
          </div>

          {editingEmpleado && (
            <Field label="Sucursal asignada" htmlFor="emp-sucursal">
              <select
                id="emp-sucursal"
                value={empleadoForm.id_sucursal}
                onChange={(e) => setEmpleadoForm({ ...empleadoForm, id_sucursal: e.target.value })}
                className={inputClass()}
                required
              >
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre} {s.ciudad ? `· ${s.ciudad}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </form>
      </Modal>

      {/* Modal para asignar empleados registrados a la sucursal actual */}
      <Modal
        open={asignarModalOpen}
        onClose={() => !savingAsignacion && setAsignarModalOpen(false)}
        title={`Asignar empleados a ${sucursalSeleccionada?.nombre || ''}`}
        description="Selecciona los empleados ya registrados en el sistema para asignarlos o transferirlos a este punto de venta."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAsignarModalOpen(false)}
              disabled={savingAsignacion}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarAsignacion}
              loading={savingAsignacion}
              disabled={selectedEmpIds.length === 0}
            >
              Asignar seleccionados ({selectedEmpIds.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {asignarError && <Alert>{asignarError}</Alert>}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, rol o sucursal actual..."
              value={searchEmpExistente}
              onChange={(e) => setSearchEmpExistente(e.target.value)}
              className={cn(inputClass(), 'pl-9 text-sm')}
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {empleadosDisponiblesParaAsignar.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                {listaEmpleados.filter((e) => Number(e.id_sucursal) !== Number(sucursalSeleccionada?.id_sucursal)).length === 0
                  ? 'Todos los empleados registrados ya están asignados a esta sucursal.'
                  : 'No se encontraron empleados que coincidan con la búsqueda.'}
              </div>
            ) : (
              empleadosDisponiblesParaAsignar.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id_empleado);
                const activo = emp.estado === 'activo';
                return (
                  <label
                    key={emp.id_empleado}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl p-3 border cursor-pointer transition select-none',
                      isSelected
                        ? 'border-forest/50 bg-forest/10 text-forest'
                        : 'border-line/70 bg-paper hover:bg-sand/30 text-ink',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectEmpExistente(emp.id_empleado)}
                        className="rounded border-line text-forest focus:ring-forest h-4 w-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {emp.nombre} {emp.apellido_paterno} {emp.apellido_materno || ''}
                        </p>
                        <p className="text-xs text-muted truncate">{emp.correo} · {emp.telefono}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className="inline-block text-[11px] font-medium bg-sand px-2 py-0.5 rounded text-clay">
                        {formatRole(emp.rol)}
                      </span>
                      <p className="text-[10px] text-muted truncate max-w-[140px]">
                        Actual: <strong>{emp.sucursal || 'Sin sucursal'}</strong>
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmación para desactivar empleado */}
      <ConfirmDialog
        open={Boolean(estadoTarget)}
        title="¿Desactivar empleado?"
        message={
          estadoTarget
            ? `${estadoTarget.nombre} ${estadoTarget.apellido_paterno} ya no podrá iniciar sesión en el sistema si desactivas su cuenta.`
            : ''
        }
        confirmLabel="Desactivar empleado"
        onCancel={() => setEstadoTarget(null)}
        onConfirm={() => handleToggleEstado(estadoTarget, 'inactivo')}
        loading={updatingEstadoId === estadoTarget?.id_empleado}
      />

    </div>
  );
}

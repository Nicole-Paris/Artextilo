import { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  BarChart3,
  LayoutDashboard,
  Menu,
  Contact,
  Store,
  Users,
  X,
  Tag,
  ShoppingBag,
  Package,
  Boxes,
  Receipt,
  Wallet,
  RotateCcw,
  LogOut,
  User,
  Settings,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authApi } from '../api/auth.js';
import { sucursalesApi } from '../api/sucursales.js';
import { globalValuesApi } from '../api/global-values.js';
import Field, { inputClass } from './Field.jsx';
import Alert from './Alert.jsx';

import { cn } from '../lib/cn.js';
import { useDialogFocus } from '../hooks/useDialogFocus.js';
import Modal from './Modal.jsx';

const navigation = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/pos', label: 'Punto de venta', icon: ShoppingBag },
  { to: '/pedidos', label: 'Pedidos', icon: Receipt },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/clientes', label: 'Clientes', icon: Contact },
  { to: '/sucursales', label: 'Sucursales', icon: Store },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/caja', label: 'Corte de caja', icon: Wallet },
  { to: '/global-values', label: 'Valores Globales', icon: Settings },
];

const routeTitles = {
  '/': 'Inicio',
  '/pos': 'Punto de Venta',
  '/pedidos': 'Pedidos y Pagos',
  '/reportes': 'Reportes y Analíticas',
  '/clientes': 'Clientes',
  '/sucursales': 'Sucursales',
  '/productos': 'Catálogo de Productos',
  '/inventario': 'Control de Inventario y Movimientos',
  '/caja': 'Corte de Caja',
  '/global-values': 'Valores Globales',
};

function SidebarContent({ onNavigate, logoUrl }) {
  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex flex-col items-center justify-center py-5 px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
      >
        <div className="flex h-36 w-36 items-center justify-center">
          <img
            src={logoUrl || '/logo-artextilo.jpeg'}
            alt="Artextilo, hilando con amor"
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logo-artextilo.jpeg';
            }}
          />
        </div>
        <span className="mt-2 text-lg font-bold tracking-wider text-white">
          Artextilo
        </span>
      </Link>

      <nav
        className="flex-1 px-3 py-4"
        aria-label="Navegación principal"
      >
        <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cream/45">
        </p>

        <div className="space-y-1">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-clay text-white shadow-sm'
                    : 'text-cream/70 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-6 pb-6" aria-hidden="true">
        <div className="stitch-line text-cream/50" />
      </div>
    </>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    correo: '',
    contrasena_actual: '',
    nueva_contrasena: '',
    confirmar_contrasena: '',
  });
  const [showActualPass, setShowActualPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [logoUrl, setLogoUrl] = useState(
    () => localStorage.getItem('artextilo_logo') || '/logo-artextilo.jpeg',
  );

  const mobileAsideRef = useRef(null);
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleLogoChange(e) {
      const updated =
        e?.detail || localStorage.getItem('artextilo_logo') || '/logo-artextilo.jpeg';
      setLogoUrl(updated);
    }

    window.addEventListener('artextilo_logo_updated', handleLogoChange);
    window.addEventListener('storage', handleLogoChange);

    globalValuesApi
      .getLogo()
      .then((res) => {
        if (res?.data?.logo) {
          setLogoUrl(res.data.logo);
          localStorage.setItem('artextilo_logo', res.data.logo);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('artextilo_logo_updated', handleLogoChange);
      window.removeEventListener('storage', handleLogoChange);
    };
  }, []);

  useEffect(() => {
    try {
      const datos = localStorage.getItem('artextilo_empleado');
      const emp = datos ? JSON.parse(datos) : null;
      setEmpleado(emp);

      if (emp) {
        // Cargar sucursales si tiene lista en su perfil o si es admin / tiene acceso a varias
        if (Array.isArray(emp.sucursales) && emp.sucursales.length > 0) {
          setSucursalesDisponibles(emp.sucursales);
        } else {
          // Intentar obtener las sucursales del sistema
          sucursalesApi
            .list()
            .then((list) => {
              const rawList = Array.isArray(list) ? list : (list?.data || []);
              if (Array.isArray(rawList)) {
                const activas = rawList.filter((s) => s.estado === 'activa');
                // Si el usuario es admin o supervisor, tiene acceso a todas las activas
                const rol = String(emp.rol || '').toLowerCase();
                if (rol.includes('admin') || rol.includes('supervisor') || rol.includes('gerente')) {
                  setSucursalesDisponibles(activas);
                } else if (emp.sucursales && emp.sucursales.length > 0) {
                  setSucursalesDisponibles(emp.sucursales);
                } else if (emp.id_sucursal) {
                  const actual = activas.find((s) => Number(s.id_sucursal) === Number(emp.id_sucursal));
                  if (actual) setSucursalesDisponibles([actual]);
                }
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      localStorage.removeItem('artextilo_token');
      localStorage.removeItem('artextilo_empleado');
      setEmpleado(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  function handleCambioSucursal(e) {
    const nuevoId = Number(e.target.value);
    const sucursalSel = sucursalesDisponibles.find((s) => Number(s.id_sucursal) === nuevoId);
    if (!sucursalSel || !empleado) return;

    const updated = {
      ...empleado,
      id_sucursal: sucursalSel.id_sucursal,
      sucursal: sucursalSel.nombre,
    };

    localStorage.setItem('artextilo_empleado', JSON.stringify(updated));
    setEmpleado(updated);
    // Notificar o recargar para sincronizar inventario, cortes de caja y pedidos
    window.dispatchEvent(new Event('storage'));
  }

  function handleLogout() {
    localStorage.removeItem('artextilo_token');
    localStorage.removeItem('artextilo_empleado');
    setEmpleado(null);

    navigate('/login', { replace: true });
  }

  function openProfileModal() {
    setIsEditingProfile(false);
    setProfileError('');
    setProfileSuccess('');
    setProfileForm({
      correo: empleado?.correo || '',
      contrasena_actual: '',
      nueva_contrasena: '',
      confirmar_contrasena: '',
    });
    setProfileOpen(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.correo.trim()) {
      setProfileError('El correo electrónico no puede estar vacío');
      return;
    }

    if (profileForm.nueva_contrasena) {
      if (!profileForm.contrasena_actual) {
        setProfileError('Ingresa tu contraseña actual para autorizar el cambio de contraseña');
        return;
      }
      if (profileForm.nueva_contrasena.length < 6) {
        setProfileError('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (profileForm.nueva_contrasena !== profileForm.confirmar_contrasena) {
        setProfileError('La nueva contraseña y su confirmación no coinciden');
        return;
      }
    }

    setProfileLoading(true);
    try {
      const resp = await authApi.actualizarPerfil({
        id_empleado: empleado.id_empleado,
        correo: profileForm.correo.trim(),
        contrasena_actual: profileForm.contrasena_actual || undefined,
        nueva_contrasena: profileForm.nueva_contrasena || undefined,
      });

      const updated = {
        ...empleado,
        ...resp.data,
      };

      localStorage.setItem('artextilo_empleado', JSON.stringify(updated));
      setEmpleado(updated);
      setProfileSuccess('Perfil actualizado correctamente');
      setIsEditingProfile(false);
      setProfileForm((prev) => ({
        ...prev,
        contrasena_actual: '',
        nueva_contrasena: '',
        confirmar_contrasena: '',
      }));
    } catch (err) {
      setProfileError(err.message || 'Error al actualizar el perfil');
    } finally {
      setProfileLoading(false);
    }
  }

  useDialogFocus({
    active: sidebarOpen,
    containerRef: mobileAsideRef,
    onClose: () => setSidebarOpen(false),
    inertSelector: '[data-app-shell]',
  });

  useEffect(() => {
    setSidebarOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    const section =
      routeTitles[location.pathname] ?? 'Página no encontrada';

    document.title = `${section} · Artextilo`;
  }, [location.pathname]);

  const nombreCompleto = empleado
    ? `${empleado.nombre} ${empleado.apellido_paterno || ''}`.trim()
    : 'Usuario';

  const inicial = empleado?.nombre?.charAt(0)?.toUpperCase() || 'U';
  const nombrePerfil = empleado
    ? [empleado.nombre, empleado.apellido_paterno]
      .filter(Boolean)
      .join(' ')
    : '';
  const datosPerfil = [
    ['Nombre completo', nombrePerfil],
    ['Correo', empleado?.correo],
    ['Teléfono', empleado?.telefono],
    ['Rol', empleado?.rol],
    ['Horario de entrada', empleado?.horario_entrada],
    ['Horario de salida', empleado?.horario_salida],
  ].filter(([, value]) => value != null && String(value).trim() !== '');

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-forest lg:flex print:hidden">
        <SidebarContent logoUrl={logoUrl} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div
            className="absolute inset-0 bg-forest-strong/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          <aside
            ref={mobileAsideRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            tabIndex={-1}
            className="relative flex h-full w-64 flex-col bg-forest shadow-soft outline-none"
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-5 flex h-10 w-10 items-center justify-center rounded-xl text-cream/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              aria-label="Cerrar menú"
              data-autofocus
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarContent
              onNavigate={() => setSidebarOpen(false)}
              logoUrl={logoUrl}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0" data-app-shell>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur lg:px-8 print:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-strong transition hover:bg-sand hover:text-ink lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-muted">
              Panel administrativo
            </p>
          </div>

          <div className="flex items-center gap-3">
            {sucursalesDisponibles.length > 1 ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-sand/40 px-2.5 py-1.5">
                <Store className="h-4 w-4 shrink-0 text-clay" aria-hidden="true" />
                <select
                  value={empleado?.id_sucursal || ''}
                  onChange={handleCambioSucursal}
                  className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer focus:ring-0"
                  aria-label="Seleccionar sucursal activa"
                >
                  {sucursalesDisponibles.map((s) => (
                    <option key={s.id_sucursal} value={s.id_sucursal}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : empleado?.sucursal ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-line bg-sand/30 px-2.5 py-1.5 text-xs font-medium text-muted-strong">
                <Store className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span>{empleado.sucursal}</span>
              </div>
            ) : null}

            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold text-ink">
                {nombreCompleto}
              </p>

              <p className="text-xs text-muted">
                {empleado?.rol || 'Empleado'}
              </p>
            </div>

            <div ref={accountMenuRef} className="relative">
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-bold text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-label="Abrir menú de la cuenta"
              >
                {inicial}
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-paper p-3 shadow-soft"
                >
                  <div className="mb-2 rounded-xl bg-cream px-4 py-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-xl font-bold text-clay">
                      {inicial}
                    </div>
                    <p className="mt-3 break-words font-semibold text-ink">
                      {nombreCompleto}
                    </p>
                    {empleado?.correo && (
                      <p className="mt-1 break-all text-xs text-muted">
                        {empleado.correo}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {empleado?.rol || 'Empleado'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        openProfileModal();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-strong transition hover:bg-sand hover:text-clay"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Ver perfil
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-strong transition hover:bg-sand hover:text-clay"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8 print:p-0 print:max-w-none"
        >
          <Outlet />
        </main>
      </div>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={isEditingProfile ? "Editar mi perfil" : "Mi perfil"}
        size="md"
        footer={
          isEditingProfile ? (
            <div className="flex w-full items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError('');
                }}
                disabled={profileLoading}
                className="min-h-11 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-edit-perfil"
                disabled={profileLoading}
                className="min-h-11 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
              >
                {profileLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(true);
                  setProfileError('');
                  setProfileSuccess('');
                  setProfileForm({
                    correo: empleado?.correo || '',
                    contrasena_actual: '',
                    nueva_contrasena: '',
                    confirmar_contrasena: '',
                  });
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-sand px-4 py-2.5 text-sm font-semibold text-clay transition hover:bg-clay hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                <Pencil className="h-4 w-4" />
                Editar perfil
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="min-h-11 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Cerrar
              </button>
            </div>
          )
        }
      >
        {profileSuccess && (
          <div className="mb-4">
            <Alert type="success">{profileSuccess}</Alert>
          </div>
        )}

        {profileError && (
          <div className="mb-4">
            <Alert type="danger">{profileError}</Alert>
          </div>
        )}

        {isEditingProfile ? (
          <form id="form-edit-perfil" onSubmit={handleSaveProfile} className="space-y-4">
            <Field label="Correo electrónico" required>
              <input
                type="email"
                value={profileForm.correo}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, correo: e.target.value })
                }
                className={inputClass()}
                required
              />
            </Field>

            <div className="rounded-xl border border-line/60 bg-cream/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-strong">
                Cambio de contraseña (opcional)
              </p>
              <p className="text-xs text-muted">
                Déjalo vacío si solo deseas actualizar tu correo.
              </p>

              <Field label="Contraseña actual">
                <div className="relative">
                  <input
                    type={showActualPass ? 'text' : 'password'}
                    value={profileForm.contrasena_actual}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        contrasena_actual: e.target.value,
                      })
                    }
                    placeholder="Solo si cambiarás la contraseña"
                    className={cn(inputClass(), 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowActualPass(!showActualPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showActualPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Nueva contraseña">
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={profileForm.nueva_contrasena}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        nueva_contrasena: e.target.value,
                      })
                    }
                    placeholder="Mínimo 6 caracteres"
                    className={cn(inputClass(), 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirmar nueva contraseña">
                <input
                  type="password"
                  value={profileForm.confirmar_contrasena}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      confirmar_contrasena: e.target.value,
                    })
                  }
                  placeholder="Repite la nueva contraseña"
                  className={inputClass()}
                />
              </Field>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            {datosPerfil.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold text-muted">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Menu,
  Contact,
  Scissors,
  ShieldCheck,
  Store,
  Users,
  X,
  Tag,
  Package,
  Boxes,
} from 'lucide-react';
import { cn } from '../lib/cn.js';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

const navigation = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Contact },
  { to: '/empleados', label: 'Empleados', icon: Users },
  { to: '/sucursales', label: 'Sucursales', icon: Store },
  { to: '/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/categorias', label: 'Categorías', icon: Tag },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
];

const routeTitles = {
  '/': 'Inicio',
  '/clientes': 'Clientes',
  '/empleados': 'Empleados',
  '/sucursales': 'Sucursales',
  '/roles': 'Roles',
  '/categorias': 'Categorías de Productos',
  '/productos': 'Catálogo de Productos',
  '/inventario': 'Control de Inventario y Movimientos',
};

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex h-20 items-center gap-3 px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay text-white">
          <Scissors className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-tight text-cream">
            Artextilo
          </p>
          <p className="text-xs text-cream/60">Gestión administrativa</p>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-4" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cream/45">
          Operación
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
  const mobileAsideRef = useRef(null);
  const location = useLocation();

  useDialogFocus({
    active: sidebarOpen,
    containerRef: mobileAsideRef,
    onClose: () => setSidebarOpen(false),
    inertSelector: '[data-app-shell]',
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const section = routeTitles[location.pathname] ?? 'Página no encontrada';
    document.title = `${section} · Artextilo`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-forest lg:flex">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
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
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64" data-app-shell>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur lg:px-8">
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

          <div className="flex items-center gap-2 text-sm text-muted-strong">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-xs font-bold text-clay">
              AD
            </div>
            <span className="hidden font-medium sm:inline">Administrador</span>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

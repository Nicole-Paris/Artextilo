import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { authApi } from '../api/auth.js';
import { globalValuesApi } from '../api/global-values.js';
import Alert from '../components/Alert.jsx';
import RecuperarPasswordModal from '../components/RecuperarPasswordModal.jsx';

export default function LoginPage() {
  const navigate = useNavigate();

  const [logoUrl, setLogoUrl] = useState(
    () => localStorage.getItem('artextilo_logo') || '/logo-artextilo.jpeg',
  );
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [modalRecuperarOpen, setModalRecuperarOpen] = useState(false);

  useEffect(() => {
    globalValuesApi
      .getLogo()
      .then((res) => {
        if (res?.data?.logo) {
          setLogoUrl(res.data.logo);
          localStorage.setItem('artextilo_logo', res.data.logo);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setExitoMensaje('');

    if (!correo.trim() || !contrasena) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setCargando(true);

      const response = await authApi.login({
        correo: correo.trim(),
        contrasena,
      });

      if (!response?.data) {
        throw new Error('No se recibieron los datos del empleado.');
      }

      if (response.data.token) {
        localStorage.setItem('artextilo_token', response.data.token);
      }
      localStorage.setItem('artextilo_empleado', JSON.stringify(response.data));

      const rol = String(response.data.rol || '').trim().toLowerCase();
      if (['administrador', 'admin'].includes(rol)) {
        navigate('/', { replace: true });
      } else {
        navigate('/pos', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* SECCIÓN IZQUIERDA: FONDO NEGRO CON TEXTO Y LOGOTIPO */}
      <section className="relative flex flex-col justify-between bg-black px-8 py-10 sm:px-12 md:py-16 lg:px-16 text-white min-h-[380px] md:min-h-screen">
        {/* PARTE SUPERIOR: BIENVENIDO */}
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.2em] text-[#AF9241] uppercase">
            Bienvenido
          </h1>
        </div>

        {/* PARTE CENTRAL: LOGOTIPO DE ARTEXTILO */}
        <div className="my-auto flex flex-col items-center justify-center py-6">
          <div className="flex h-56 w-56 sm:h-72 sm:w-72 lg:h-80 lg:w-80 items-center justify-center">
            <img
              src={logoUrl || '/logo-artextilo.jpeg'}
              alt="Artextilo"
              className="max-h-full max-w-full object-contain filter drop-shadow-xl"
              onError={(e) => {
                e.currentTarget.src = '/logo-artextilo.jpeg';
              }}
            />
          </div>

          {/* LÍNEA DIVISORIA DORADA */}
          <div className="mt-8 w-28 sm:w-36 border-t-2 border-[#AF9241]" />
        </div>

        {/* PIE DE PÁGINA IZQUIERDO */}
        <div className="pt-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Artextilo · Hilando con amor</p>
        </div>
      </section>

      {/* SECCIÓN DERECHA: FONDO BLANCO CON FORMULARIO DE ACCESO */}
      <section className="flex flex-col justify-center items-center px-6 py-12 sm:px-12 md:px-16 lg:px-20 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* TÍTULO INICIAR SESIÓN CON SUBRAYADO */}
          <div className="text-center">
            <h2 className="font-sans text-xl sm:text-2xl font-semibold tracking-wider text-black uppercase">
              Iniciar Sesión
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-24 bg-black" />
          </div>

          {/* ALERTA DE ÉXITO O ERROR */}
          {exitoMensaje && (
            <Alert type="success">{exitoMensaje}</Alert>
          )}

          {error && (
            <Alert type="error">{error}</Alert>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CORREO ELECTRÓNICO */}
            <div className="space-y-2">
              <label
                htmlFor="correo"
                className="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Correo Electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="ejemplo@artextilo.com"
                autoComplete="username"
                required
                disabled={cargando}
                className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100"
              />
            </div>

            {/* CONTRASEÑA */}
            <div className="space-y-2">
              <label
                htmlFor="contrasena"
                className="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={cargando}
                  className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 pr-11 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100"
                />

                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  disabled={cargando}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black transition"
                  aria-label={
                    mostrarContrasena
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarContrasena ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* ENLACE DE RECUPERACIÓN */}
              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setExitoMensaje('');
                    setModalRecuperarOpen(true);
                  }}
                  disabled={cargando}
                  className="text-xs font-semibold text-[#AF9241] transition hover:text-[#8A7232] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {/* BOTÓN INICIAR SESIÓN NEGRO */}
            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-xs text-neutral-400">
              Acceso exclusivo para personal y colaboradores autorizados.
            </p>
          </div>
        </div>
      </section>

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA */}
      <RecuperarPasswordModal
        open={modalRecuperarOpen}
        onClose={() => setModalRecuperarOpen(false)}
        initialEmail={correo}
        onPasswordChanged={(correoActualizado) => {
          setCorreo(correoActualizado);
          setContrasena('');
          setExitoMensaje(
            '¡Contraseña restablecida con éxito! Ingresa tu nueva contraseña para acceder.',
          );
        }}
      />
    </main>
  );
}

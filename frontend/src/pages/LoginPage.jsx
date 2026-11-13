import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Scissors, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { authApi } from '../api/auth.js';
import RecuperarPasswordModal from '../components/RecuperarPasswordModal.jsx';

export default function LoginPage() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [modalRecuperarOpen, setModalRecuperarOpen] = useState(false);

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

      localStorage.setItem(
        'artextilo_empleado',
        JSON.stringify(response.data),
      );

      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F9F9] px-4 py-10">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black shadow-lg">
            <Scissors className="h-8 w-8 text-[#AF9241]" />
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-black">
            Artextilo
          </h1>

          <p className="mt-2 text-sm text-[#766E65]">
            Sistema de gestión administrativa
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-7 shadow-xl sm:p-9">
          <div className="mb-7">
            <h2 className="font-display text-2xl font-semibold text-black">
              Bienvenido
            </h2>
            <p className="mt-1 text-sm text-[#766E65]">
              Ingresa tus datos para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label
                htmlFor="correo"
                className="mb-2 block text-sm font-semibold text-black"
              >
                Correo electrónico
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#766E65]" />

                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="empleado@artextilo.com"
                  autoComplete="username"
                  required
                  disabled={cargando}
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white py-3 pl-11 pr-4 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="contrasena"
                  className="block text-sm font-semibold text-black"
                >
                  Contraseña
                </label>

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

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#766E65]" />

                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                  disabled={cargando}
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white py-3 pl-11 pr-12 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  disabled={cargando}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#766E65] transition hover:text-[#AF9241]"
                  aria-label={
                    mostrarContrasena
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarContrasena
                    ? <EyeOff className="h-5 w-5" />
                    : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {exitoMensaje && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium leading-relaxed"
              >
                {exitoMensaje}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AF9241] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#8A7232] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-7">
            <div className="h-px bg-[#E5E5E5]" />
            <p className="mt-5 text-center text-xs text-[#766E65]">
              Acceso exclusivo para personal autorizado.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#766E65]">
          © {new Date().getFullYear()} Artextilo · Todos los derechos reservados.
        </p>
      </div>

      <RecuperarPasswordModal
        open={modalRecuperarOpen}
        onClose={() => setModalRecuperarOpen(false)}
        initialEmail={correo}
        onPasswordChanged={(correoActualizado) => {
          setCorreo(correoActualizado);
          setContrasena('');
          setExitoMensaje('¡Contraseña restablecida con éxito! Ingresa tu nueva contraseña para acceder.');
        }}
      />
    </main>
  );
}

import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  KeyRound,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  LoaderCircle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { authApi } from '../api/auth.js';

export default function RecuperarPasswordModal({
  open,
  onClose,
  onPasswordChanged,
  initialEmail = '',
}) {
  const [paso, setPaso] = useState(1);
  const [correo, setCorreo] = useState(initialEmail);
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeInfo, setMensajeInfo] = useState('');
  const [segundosRestantes, setSegundosRestantes] = useState(600);

  useEffect(() => {
    if (open) {
      setPaso(1);
      setCorreo(initialEmail || '');
      setCodigo('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setError('');
      setMensajeInfo('');
      setSegundosRestantes(600);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    let timer;
    if (paso === 2 && segundosRestantes > 0) {
      timer = setInterval(() => {
        setSegundosRestantes((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paso, segundosRestantes]);

  if (!open) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const tiempoFormateado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

  async function handleSolicitar(e) {
    e.preventDefault();
    setError('');
    setMensajeInfo('');

    if (!correo.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    try {
      setCargando(true);
      const res = await authApi.solicitarRecuperacion({ correo: correo.trim() });
      setMensajeInfo(res.message || 'Código enviado a tu correo electrónico.');
      setSegundosRestantes((res.data?.expiraEnMinutos || 10) * 60);
      setPaso(2);
    } catch (err) {
      setError(err.message || 'No fue posible solicitar el código.');
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    setError('');
    setMensajeInfo('');
    try {
      setCargando(true);
      const res = await authApi.solicitarRecuperacion({ correo: correo.trim() });
      setMensajeInfo(res.message || 'Código reenviado.');
      setSegundosRestantes((res.data?.expiraEnMinutos || 10) * 60);
      setCodigo('');
    } catch (err) {
      setError(err.message || 'Error al reenviar el código.');
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificar(e) {
    e.preventDefault();
    setError('');

    const cleanCodigo = codigo.trim();
    if (!cleanCodigo || cleanCodigo.length !== 6) {
      setError('Ingresa el código numérico completo de 6 dígitos.');
      return;
    }

    try {
      setCargando(true);
      await authApi.verificarCodigo({
        correo: correo.trim(),
        codigo: cleanCodigo,
      });
      setPaso(3);
    } catch (err) {
      setError(err.message || 'Código de verificación inválido o expirado.');
    } finally {
      setCargando(false);
    }
  }

  async function handleCambiarPassword(e) {
    e.preventDefault();
    setError('');

    if (!nuevaContrasena) {
      setError('Ingresa la nueva contraseña.');
      return;
    }
    if (nuevaContrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setCargando(true);
      await authApi.restablecerPassword({
        correo: correo.trim(),
        codigo: codigo.trim(),
        nueva_contrasena: nuevaContrasena,
        confirmar_contrasena: confirmarContrasena,
      });
      setPaso(4);
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  function handleTerminar() {
    if (onPasswordChanged) {
      onPasswordChanged(correo);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <div className="flex items-center gap-2">
            {paso > 1 && paso < 4 && (
              <button
                type="button"
                onClick={() => setPaso((prev) => prev - 1)}
                disabled={cargando}
                className="mr-1 rounded-lg p-1 text-[#766E65] transition hover:bg-gray-100 hover:text-black"
                title="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="font-display text-lg font-bold text-black">
              Recuperar Contraseña
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="rounded-lg p-1.5 text-[#766E65] transition hover:bg-gray-100 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {paso < 4 && (
          <div className="flex border-b border-gray-100 bg-gray-50/50 px-6 py-2.5 text-xs text-[#766E65]">
            <span
              className={`font-semibold ${paso === 1 ? 'text-[#AF9241]' : 'text-gray-400'
                }`}
            >
              1. Correo
            </span>
            <span className="mx-2 text-gray-300">›</span>
            <span
              className={`font-semibold ${paso === 2 ? 'text-[#AF9241]' : 'text-gray-400'
                }`}
            >
              2. Código
            </span>
            <span className="mx-2 text-gray-300">›</span>
            <span
              className={`font-semibold ${paso === 3 ? 'text-[#AF9241]' : 'text-gray-400'
                }`}
            >
              3. Nueva Contraseña
            </span>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {mensajeInfo && paso === 2 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
              {mensajeInfo}
            </div>
          )}

          {paso === 1 && (
            <form onSubmit={handleSolicitar} className="space-y-4">
              <p className="text-xs text-[#766E65]">
                Ingresa el correo electrónico registrado con tu cuenta de empleado. Te enviaremos un código de verificación de 6 dígitos.
              </p>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-black">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766E65]" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="empleado@artextilo.com"
                    required
                    disabled={cargando}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-10 pr-3 text-sm text-black outline-none focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AF9241] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8A7232] disabled:opacity-60"
              >
                {cargando ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  'Enviar código de verificación'
                )}
              </button>
            </form>
          )}

          {paso === 2 && (
            <form onSubmit={handleVerificar} className="space-y-4">
              <p className="text-xs text-[#766E65]">
                Ingresa el código numérico de 6 dígitos que enviamos a <strong>{correo}</strong>.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-black">
                    Código de 6 dígitos
                  </label>
                  <span
                    className={`font-mono text-xs font-semibold ${segundosRestantes < 60 ? 'text-red-600 animate-pulse' : 'text-[#766E65]'
                      }`}
                  >
                    Expira en: {tiempoFormateado}
                  </span>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766E65]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    disabled={cargando}
                    className="w-full text-center tracking-[8px] font-mono font-bold text-lg rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-10 pr-3 text-black outline-none focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando || codigo.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AF9241] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8A7232] disabled:opacity-60"
              >
                {cargando ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Validando código...
                  </>
                ) : (
                  'Verificar código'
                )}
              </button>

              <div className="text-center pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleReenviar}
                  disabled={cargando}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#AF9241] hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" /> ¿No te llegó el correo? Reenviar código
                </button>
              </div>
            </form>
          )}

          {paso === 3 && (
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <p className="text-xs text-[#766E65]">
                Código verificado exitosamente. Ahora define tu nueva contraseña de acceso.
              </p>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-black">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766E65]" />
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    disabled={cargando}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-10 pr-10 text-sm text-black outline-none focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#766E65] hover:text-[#AF9241]"
                  >
                    {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-black">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766E65]" />
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={6}
                    disabled={cargando}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 pl-10 pr-10 text-sm text-black outline-none focus:border-[#AF9241] focus:ring-2 focus:ring-[#AF9241]/20 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AF9241] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8A7232] disabled:opacity-60"
              >
                {cargando ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Actualizando contraseña...
                  </>
                ) : (
                  'Restablecer contraseña'
                )}
              </button>
            </form>
          )}

          {paso === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h4 className="font-display text-lg font-bold text-black">
                  ¡Contraseña actualizada!
                </h4>
                <p className="mt-1 text-xs text-[#766E65] leading-relaxed">
                  Tu contraseña se ha cambiado con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTerminar}
                className="w-full rounded-xl bg-[#AF9241] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8A7232]"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


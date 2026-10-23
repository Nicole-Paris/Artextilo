import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand text-clay">
        <SearchX className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-clay">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        La sección que buscas no existe o fue movida. Regresa al panel principal
        para continuar.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>
    </div>
  );
}

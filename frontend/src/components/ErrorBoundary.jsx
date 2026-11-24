import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sand flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-soft text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                Ocurrió un problema inesperado
              </h2>
              <p className="mt-1 text-xs text-muted">
                {this.state.error?.message ||
                  'No se pudo cargar este módulo debido a un error temporal.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-clay-strong transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar página
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-sand px-4 py-2.5 text-xs font-semibold text-ink hover:bg-line transition"
              >
                <Home className="h-3.5 w-3.5" />
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

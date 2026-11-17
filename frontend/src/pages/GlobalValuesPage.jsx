import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Settings } from 'lucide-react';

import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { globalValuesApi } from '../api/global-values.js';
import { cn } from '../lib/cn.js';

const TIPO_ORDEN = ['general', 'ventas', 'inventario', 'seguridad'];

const TIPO_LABELS = {
  general: 'General',
  ventas: 'Ventas',
  inventario: 'Inventario',
  seguridad: 'Seguridad',
};

const TIPO_DESCRIPTIONS = {
  general: 'Configuración base de la tienda.',
  ventas: 'Reglas de anticipos, mayoreo y descuentos.',
  inventario: 'Parámetros para el control de existencias.',
  seguridad: 'Límites de acceso y recuperación de cuentas.',
};

const VALUE_LABELS = {
  moneda: 'Moneda',
  stock_minimo_default: 'Stock mínimo por defecto',
  codigo_recuperacion_minutos: 'Vigencia del código de recuperación',
  intentos_login_max: 'Intentos de inicio de sesión permitidos',
  anticipo_porcentaje: 'Porcentaje de anticipo',
  descuento_mayoreo_porcentaje: 'Descuento por mayoreo',
  mayoreo_minimo_piezas: 'Piezas mínimas para mayoreo',
};

const VALUE_UNITS = {
  codigo_recuperacion_minutos: 'min',
  intentos_login_max: 'intentos',
  anticipo_porcentaje: '%',
  descuento_mayoreo_porcentaje: '%',
  mayoreo_minimo_piezas: 'pzas',
};

const NUMERIC_VALUES = new Set([
  'stock_minimo_default',
  'codigo_recuperacion_minutos',
  'intentos_login_max',
  'anticipo_porcentaje',
  'descuento_mayoreo_porcentaje',
  'mayoreo_minimo_piezas',
]);

const PERCENTAGE_VALUES = new Set([
  'anticipo_porcentaje',
  'descuento_mayoreo_porcentaje',
]);

function valueLabel(item) {
  return (
    VALUE_LABELS[item.nombre] ??
    item.nombre
      .replaceAll('_', ' ')
      .replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

export default function GlobalValuesPage() {
  const [values, setValues] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadValues = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await globalValuesApi.getAll();
      const data = (response.data || []).filter(
        (item) => item.tipo !== 'empresa',
      );
      setValues(data);
      setDraft(
        Object.fromEntries(
          data.map((item) => [item.id_global_value, item.valor ?? '']),
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  const groups = useMemo(() => {
    const grouped = TIPO_ORDEN.map((tipo) => ({
      tipo,
      items: values.filter((item) => item.tipo === tipo),
    })).filter((group) => group.items.length > 0);

    const otros = values.filter((item) => !TIPO_ORDEN.includes(item.tipo));
    if (otros.length > 0) {
      grouped.push({ tipo: 'otros', items: otros });
    }

    return grouped;
  }, [values]);

  const changedValues = useMemo(
    () =>
      values.filter(
        (item) =>
          String(draft[item.id_global_value] ?? '') !== String(item.valor ?? ''),
      ),
    [values, draft],
  );

  const hasChanges = changedValues.length > 0;

  function handleChange(id, value) {
    setDraft((current) => ({ ...current, [id]: value }));
    setError('');
    setSuccess('');
  }

  function handleReset() {
    setDraft(
      Object.fromEntries(
        values.map((item) => [item.id_global_value, item.valor ?? '']),
      ),
    );
    setError('');
    setSuccess('');
  }

  async function handleSave(event) {
    event.preventDefault();

    for (const item of changedValues) {
      const value = String(draft[item.id_global_value] ?? '').trim();

      if (!value) {
        setError(`El valor de "${valueLabel(item)}" no puede estar vacío.`);
        return;
      }

      if (NUMERIC_VALUES.has(item.nombre) && !/^\d+$/.test(value)) {
        setError(`El valor de "${valueLabel(item)}" debe ser un número entero.`);
        return;
      }

      if (
        PERCENTAGE_VALUES.has(item.nombre) &&
        Number(value) > 100
      ) {
        setError(`El valor de "${valueLabel(item)}" no puede exceder 100.`);
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (const item of changedValues) {
        await globalValuesApi.update(item.id_global_value, {
          tipo: item.tipo,
          nombre: item.nombre,
          valor: String(draft[item.id_global_value] ?? '').trim(),
          descripcion: item.descripcion ?? null,
        });
      }

      setSuccess('Valores globales actualizados correctamente.');
      await loadValues();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Valores Globales"
        description="Configura los valores operativos que usa el sistema. Solo se editan los valores existentes."
      />

      {error && (
        <div className="mb-5">
          <Alert>
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadValues}
                className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </Alert>
        </div>
      )}

      {success && (
        <div className="mb-5">
          <Alert type="success">{success}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-sand" />
          ))}
        </div>
      ) : values.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-10 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-forest">
            <Settings className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-ink">
            No hay valores globales configurados
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
            Carga los valores iniciales de la base de datos para poder editarlos.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {groups.map((group) => (
            <section
              key={group.tipo}
              className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft"
            >
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {TIPO_LABELS[group.tipo] ?? 'Otros'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {TIPO_DESCRIPTIONS[group.tipo] ??
                    'Valores adicionales del sistema.'}
                </p>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                {group.items.map((item) => {
                  const numeric = NUMERIC_VALUES.has(item.nombre);
                  const unit = VALUE_UNITS[item.nombre];
                  const inputId = `global-value-${item.id_global_value}`;

                  return (
                    <Field
                      key={item.id_global_value}
                      label={valueLabel(item)}
                      htmlFor={inputId}
                      hint={item.descripcion || undefined}
                    >
                      <div className="relative">
                        <input
                          id={inputId}
                          type={numeric ? 'number' : 'text'}
                          inputMode={numeric ? 'numeric' : undefined}
                          min={numeric ? 0 : undefined}
                          max={
                            PERCENTAGE_VALUES.has(item.nombre) ? 100 : undefined
                          }
                          step={numeric ? 1 : undefined}
                          value={draft[item.id_global_value] ?? ''}
                          onChange={(event) =>
                            handleChange(item.id_global_value, event.target.value)
                          }
                          className={cn(inputClass(), unit && 'pr-16')}
                          required
                        />
                        {unit && (
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted">
                            {unit}
                          </span>
                        )}
                      </div>
                    </Field>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              Descartar cambios
            </Button>
            <Button type="submit" loading={saving} disabled={!hasChanges || saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar cambios
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

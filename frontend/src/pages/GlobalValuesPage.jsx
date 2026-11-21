import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Upload,
} from 'lucide-react';

import Alert from '../components/Alert.jsx';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { globalValuesApi } from '../api/global-values.js';
import { cn } from '../lib/cn.js';

const TIPO_ORDEN = ['ventas', 'inventario', 'general'];

const TIPO_LABELS = {
  ventas: 'Ventas',
  inventario: 'Inventario',
  general: 'General',
};

const TIPO_DESCRIPTIONS = {
  ventas: 'Reglas de anticipos, mayoreo y descuentos.',
  inventario: 'Parámetros para el control de existencias.',
  general: 'Configuración base de la tienda.',
};

const VALUE_LABELS = {
  stock_minimo_default: 'Stock mínimo por defecto',
  anticipo_porcentaje: 'Porcentaje de anticipo',
  descuento_mayoreo_porcentaje: 'Descuento por mayoreo',
  mayoreo_minimo_piezas: 'Piezas mínimas para mayoreo',
};

const VALUE_UNITS = {
  anticipo_porcentaje: '%',
  descuento_mayoreo_porcentaje: '%',
  mayoreo_minimo_piezas: 'pzas',
};

const NUMERIC_VALUES = new Set([
  'stock_minimo_default',
  'anticipo_porcentaje',
  'descuento_mayoreo_porcentaje',
  'mayoreo_minimo_piezas',
]);

const PERCENTAGE_VALUES = new Set([
  'anticipo_porcentaje',
  'descuento_mayoreo_porcentaje',
]);

const DEFAULT_LOGO = '/logo-artextilo.jpeg';

function formatTipoLabel(tipo) {
  if (TIPO_LABELS[tipo]) return TIPO_LABELS[tipo];
  return tipo
    .replaceAll('_', ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatTipoDescription(tipo) {
  if (TIPO_DESCRIPTIONS[tipo]) return TIPO_DESCRIPTIONS[tipo];
  return `Parámetros y reglas operativas de ${tipo.replaceAll('_', ' ')}.`;
}

function valueLabel(item) {
  return (
    VALUE_LABELS[item.nombre] ??
    item.nombre
      .replaceAll('_', ' ')
      .replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(
        new Error(
          'El archivo seleccionado debe ser una imagen válida (PNG, JPG, SVG, WebP).',
        ),
      );
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(format, 0.92));
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export default function GlobalValuesPage() {
  const [values, setValues] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado del modal para agregar nuevo valor global
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    tipo: 'ventas',
    tipoCustom: '',
    nombre: '',
    valor: '',
    descripcion: '',
  });

  // Estado del logotipo
  const [savedLogo, setSavedLogo] = useState(
    () => localStorage.getItem('artextilo_logo') || DEFAULT_LOGO,
  );
  const [previewLogo, setPreviewLogo] = useState(
    () => localStorage.getItem('artextilo_logo') || DEFAULT_LOGO,
  );
  const [savingLogo, setSavingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const loadValues = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [valuesRes, logoRes] = await Promise.allSettled([
        globalValuesApi.getAll(),
        globalValuesApi.getLogo(),
      ]);

      if (valuesRes.status === 'fulfilled') {
        const data = (valuesRes.value.data || []).filter(
          (item) =>
            item.tipo !== 'empresa' &&
            item.tipo !== 'seguridad' &&
            item.nombre !== 'moneda' &&
            item.nombre !== 'logo_empresa',
        );
        setValues(data);
        setDraft(
          Object.fromEntries(
            data.map((item) => [item.id_global_value, item.valor ?? '']),
          ),
        );
      } else {
        throw valuesRes.reason;
      }

      if (logoRes.status === 'fulfilled' && logoRes.value?.data?.logo) {
        const logo = logoRes.value.data.logo;
        setSavedLogo(logo);
        setPreviewLogo(logo);
        localStorage.setItem('artextilo_logo', logo);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  // Lista dinámica de todas las categorías disponibles
  const availableCategories = useMemo(() => {
    const list = [...TIPO_ORDEN];
    values.forEach((v) => {
      if (
        v.tipo &&
        !list.includes(v.tipo) &&
        v.tipo !== 'seguridad' &&
        v.tipo !== 'empresa'
      ) {
        list.push(v.tipo);
      }
    });
    return list;
  }, [values]);

  // Agrupamiento dinámico: cada categoría tiene su propia sección con su nombre
  const groups = useMemo(() => {
    const distinctTipos = Array.from(
      new Set(
        values
          .map((v) => v.tipo)
          .filter((t) => t && t !== 'seguridad' && t !== 'empresa'),
      ),
    );

    distinctTipos.sort((a, b) => {
      const idxA = TIPO_ORDEN.indexOf(a);
      const idxB = TIPO_ORDEN.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return distinctTipos
      .map((tipo) => ({
        tipo,
        label: formatTipoLabel(tipo),
        description: formatTipoDescription(tipo),
        items: values.filter(
          (item) =>
            item.tipo === tipo &&
            item.nombre !== 'moneda' &&
            item.nombre !== 'logo_empresa',
        ),
      }))
      .filter((group) => group.items.length > 0);
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
  const logoHasChanges = previewLogo !== savedLogo;

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

  async function handleLogoFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const dataUrl = await processImageFile(file);
      setPreviewLogo(dataUrl);
    } catch (err) {
      setError(err.message || 'No fue posible cargar el archivo.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleResetLogoDefault() {
    setPreviewLogo(DEFAULT_LOGO);
    setError('');
    setSuccess('');
  }

  function handleCancelLogoChange() {
    setPreviewLogo(savedLogo);
    setError('');
    setSuccess('');
  }

  async function handleSaveLogo() {
    setSavingLogo(true);
    setError('');
    setSuccess('');

    try {
      const response = await globalValuesApi.updateLogo(previewLogo);
      const newLogo = response?.data?.logo || previewLogo;

      setSavedLogo(newLogo);
      setPreviewLogo(newLogo);
      localStorage.setItem('artextilo_logo', newLogo);

      window.dispatchEvent(
        new CustomEvent('artextilo_logo_updated', { detail: newLogo }),
      );
      window.dispatchEvent(new Event('storage'));

      setSuccess('Logotipo de la empresa actualizado correctamente.');
    } catch (requestError) {
      setError(requestError.message || 'Error al guardar el nuevo logotipo.');
    } finally {
      setSavingLogo(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateError('');

    const resolvedTipo =
      createForm.tipo === 'otro'
        ? createForm.tipoCustom.trim().toLowerCase().replace(/[\s-]+/g, '_')
        : createForm.tipo.trim().toLowerCase();

    if (!resolvedTipo) {
      setCreateError('Indica la categoría o tipo del valor global.');
      return;
    }

    if (resolvedTipo === 'seguridad' || resolvedTipo === 'empresa') {
      setCreateError('Esa categoría no está disponible.');
      return;
    }

    const rawNombre = createForm.nombre
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!rawNombre) {
      setCreateError('Ingresa un nombre o identificador válido.');
      return;
    }

    const rawValor = createForm.valor.trim();
    if (!rawValor) {
      setCreateError('El valor inicial no puede estar vacío.');
      return;
    }

    setCreating(true);
    try {
      await globalValuesApi.create({
        tipo: resolvedTipo,
        nombre: rawNombre,
        valor: rawValor,
        descripcion: createForm.descripcion.trim() || null,
      });

      setSuccess(
        `Valor global "${rawNombre}" agregado correctamente en "${formatTipoLabel(resolvedTipo)}".`,
      );
      setModalCreateOpen(false);
      setCreateForm({
        tipo: 'ventas',
        tipoCustom: '',
        nombre: '',
        valor: '',
        descripcion: '',
      });
      await loadValues();
    } catch (err) {
      setCreateError(err.message || 'Error al agregar el valor global.');
    } finally {
      setCreating(false);
    }
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

      if (PERCENTAGE_VALUES.has(item.nombre) && Number(value) > 100) {
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
    <div className="space-y-6">
      <PageHeader
        title="Valores Globales"
        description="Configura los valores operativos y la identidad visual que usa el sistema."
      >
        <Button
          type="button"
          onClick={() => {
            setCreateForm({
              tipo: 'ventas',
              tipoCustom: '',
              nombre: '',
              valor: '',
              descripcion: '',
            });
            setCreateError('');
            setModalCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-clay text-white shadow-sm hover:bg-clay/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar valor global
        </Button>
      </PageHeader>

      {error && (
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
      )}

      {success && <Alert type="success">{success}</Alert>}

      {/* SECCIÓN: LOGOTIPO DE LA EMPRESA */}
      <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay/10 text-clay">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Logotipo de la Empresa
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Personaliza la imagen que identifica a la tienda en el menú
                lateral y la pantalla de acceso.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Contenedor de previsualización */}
            <div className="relative flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-clay/40 bg-sand/40 p-2 shadow-inner">
              <img
                src={previewLogo}
                alt="Vista previa del logotipo"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_LOGO;
                }}
              />
              {logoHasChanges && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-clay px-2 py-0.5 text-[0.65rem] font-bold text-white shadow">
                  Previsualización
                </span>
              )}
            </div>

            {/* Opciones y controles de carga */}
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleLogoFileSelect}
                className="hidden"
                id="logo-file-input"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Subir nuevo logo
                </Button>

                {previewLogo !== DEFAULT_LOGO && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResetLogoDefault}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Restablecer logo original
                  </Button>
                )}
              </div>

              <p className="text-xs leading-relaxed text-muted">
                Formatos permitidos:{' '}
                <strong className="font-semibold text-ink">
                  PNG, JPG, WebP o SVG
                </strong>
                . Tamaño sugerido: 500 × 500 px. La imagen se optimiza
                automáticamente.
              </p>

              {logoHasChanges && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-clay/30 bg-clay/5 p-3">
                  <span className="text-xs font-medium text-clay">
                    Tienes un nuevo logo pendiente de guardar.
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelLogoChange}
                      disabled={savingLogo}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveLogo}
                      loading={savingLogo}
                      className="bg-clay text-white hover:bg-clay/90"
                    >
                      <Save className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Guardar logotipo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: VALORES GLOBALES (CONFIGURACIÓN OPERATIVA) */}
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
            No hay otros valores globales configurados
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
            Puedes agregar nuevos parámetros operativos usando el botón "Agregar
            valor global" en la esquina superior.
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
                  {group.label}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {group.description}
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
            <Button
              type="submit"
              loading={saving}
              disabled={!hasChanges || saving}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar valores
            </Button>
          </div>
        </form>
      )}

      {/* MODAL: AGREGAR NUEVO VALOR GLOBAL */}
      <Modal
        open={modalCreateOpen}
        onClose={() => setModalCreateOpen(false)}
        title="Agregar nuevo valor global"
        description="Registra un parámetro operativo en la base de datos para controlar reglas del negocio."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && <Alert>{createError}</Alert>}

          <Field label="Categoría / Tipo" htmlFor="create-tipo" required>
            <select
              id="create-tipo"
              value={createForm.tipo}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, tipo: e.target.value }))
              }
              className={inputClass()}
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatTipoLabel(cat)}
                </option>
              ))}
              <option value="otro">+ Nueva categoría personalizada...</option>
            </select>
          </Field>

          {createForm.tipo === 'otro' && (
            <Field
              label="Nombre de la nueva categoría"
              htmlFor="create-tipo-custom"
              required
            >
              <input
                id="create-tipo-custom"
                type="text"
                placeholder="ej. envios, facturacion, pedidos"
                value={createForm.tipoCustom}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    tipoCustom: e.target.value,
                  }))
                }
                className={inputClass()}
                required
              />
            </Field>
          )}

          <Field
            label="Identificador / Nombre"
            htmlFor="create-nombre"
            hint="Se guardará en minúsculas con guiones bajos (ej. dias_tolerancia_apartado)."
            required
          >
            <input
              id="create-nombre"
              type="text"
              placeholder="ej. dias_tolerancia_apartado"
              value={createForm.nombre}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  nombre: e.target.value,
                }))
              }
              className={inputClass()}
              required
            />
          </Field>

          <Field label="Valor inicial" htmlFor="create-valor" required>
            <input
              id="create-valor"
              type="text"
              placeholder="ej. 15"
              value={createForm.valor}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  valor: e.target.value,
                }))
              }
              className={inputClass()}
              required
            />
          </Field>

          <Field
            label="Descripción explicativa"
            htmlFor="create-descripcion"
            hint="Explica para qué sirve este parámetro dentro del sistema (opcional)."
          >
            <input
              id="create-descripcion"
              type="text"
              placeholder="ej. Días máximos para liquidar y recoger una prenda apartada."
              value={createForm.descripcion}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  descripcion: e.target.value,
                }))
              }
              className={inputClass()}
            />
          </Field>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={creating}
              className="bg-clay text-white hover:bg-clay/90"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Guardar valor global
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { getSupabaseClient, isSupabaseConfigured } from './client.ts';

export const SGI_DATASET_KEYS = {
  acompanamiento: 'acompanamiento_presencial',
  comportamientos: 'comportamientos_inseguros',
  incapacidades: 'incapacidades_bd',
  formacion: 'formacion_bd',
  incapInformeEdits: 'incap_informe_edits',
  formacionInformeEdits: 'formacion_informe_edits'
} as const;

export type SgiDatasetKey = (typeof SGI_DATASET_KEYS)[keyof typeof SGI_DATASET_KEYS];

export type SgiPersistedDatasets = {
  acompanamiento: unknown[];
  comportamientos: unknown[];
  incapacidades: unknown[];
  formacion: unknown[];
  incapInformeEdits: Record<string, unknown>;
  formacionInformeEdits: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

const reviveDates = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (!value || typeof value !== 'object') return value;

  const record = value as JsonRecord;
  const next: JsonRecord = {};

  Object.entries(record).forEach(([key, entry]) => {
    if (
      typeof entry === 'string' &&
      (key === 'date' ||
        key === 'notificationDate' ||
        key === 'incapDate' ||
        key === 'entryDate' ||
        key === 'startDate' ||
        key === 'endDate') &&
      /^\d{4}-\d{2}-\d{2}T/.test(entry)
    ) {
      const parsed = new Date(entry);
      next[key] = Number.isNaN(parsed.getTime()) ? entry : parsed;
      return;
    }
    next[key] = reviveDates(entry);
  });

  return next;
};

const serializeForStorage = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeForStorage);
  if (!value || typeof value !== 'object') return value;

  const record = value as JsonRecord;
  const next: JsonRecord = {};
  Object.entries(record).forEach(([key, entry]) => {
    next[key] = serializeForStorage(entry);
  });
  return next;
};

export async function registerUserEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from('registered_users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('registered_users')
      .update({ last_login_at: now })
      .eq('email', normalizedEmail);
    if (updateError) return { ok: false, error: updateError.message };
    return { ok: true };
  }

  const { error: insertError } = await supabase.from('registered_users').insert({
    email: normalizedEmail,
    registered_at: now,
    last_login_at: now
  });

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}

async function loadDataset(key: SgiDatasetKey): Promise<unknown | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('sgi_datasets')
    .select('data')
    .eq('dataset_key', key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.data ?? null;
}

async function saveDataset(key: SgiDatasetKey, payload: unknown, updatedByEmail: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from('sgi_datasets').upsert(
    {
      dataset_key: key,
      data: serializeForStorage(payload),
      updated_at: new Date().toISOString(),
      updated_by_email: updatedByEmail
    },
    { onConflict: 'dataset_key' }
  );

  if (error) throw new Error(error.message);
}

const hasArrayData = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;

const hasObjectData = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

export async function loadSgiDatasetsFromSupabase(
  baselines: SgiPersistedDatasets
): Promise<SgiPersistedDatasets> {
  if (!isSupabaseConfigured()) return baselines;

  const [
    acompanamientoRaw,
    comportamientosRaw,
    incapacidadesRaw,
    formacionRaw,
    incapInformeEditsRaw,
    formacionInformeEditsRaw
  ] = await Promise.all([
    loadDataset(SGI_DATASET_KEYS.acompanamiento),
    loadDataset(SGI_DATASET_KEYS.comportamientos),
    loadDataset(SGI_DATASET_KEYS.incapacidades),
    loadDataset(SGI_DATASET_KEYS.formacion),
    loadDataset(SGI_DATASET_KEYS.incapInformeEdits),
    loadDataset(SGI_DATASET_KEYS.formacionInformeEdits)
  ]);

  const acompanamiento = hasArrayData(acompanamientoRaw)
    ? (reviveDates(acompanamientoRaw) as unknown[])
    : baselines.acompanamiento;
  const comportamientos = hasArrayData(comportamientosRaw)
    ? (reviveDates(comportamientosRaw) as unknown[])
    : baselines.comportamientos;
  const incapacidades = hasArrayData(incapacidadesRaw)
    ? (reviveDates(incapacidadesRaw) as unknown[])
    : baselines.incapacidades;
  const formacion = hasArrayData(formacionRaw)
    ? (reviveDates(formacionRaw) as unknown[])
    : baselines.formacion;
  const incapInformeEdits = hasObjectData(incapInformeEditsRaw)
    ? (incapInformeEditsRaw as Record<string, unknown>)
    : baselines.incapInformeEdits;
  const formacionInformeEdits = hasObjectData(formacionInformeEditsRaw)
    ? (formacionInformeEditsRaw as Record<string, unknown>)
    : baselines.formacionInformeEdits;

  const loaded: SgiPersistedDatasets = {
    acompanamiento,
    comportamientos,
    incapacidades,
    formacion,
    incapInformeEdits,
    formacionInformeEdits
  };

  const seedPayload: Partial<SgiPersistedDatasets> = {};
  if (!hasArrayData(acompanamientoRaw)) seedPayload.acompanamiento = baselines.acompanamiento;
  if (!hasArrayData(comportamientosRaw)) seedPayload.comportamientos = baselines.comportamientos;
  if (!hasArrayData(incapacidadesRaw)) seedPayload.incapacidades = baselines.incapacidades;
  if (!hasArrayData(formacionRaw)) seedPayload.formacion = baselines.formacion;
  if (!hasObjectData(incapInformeEditsRaw)) seedPayload.incapInformeEdits = baselines.incapInformeEdits;
  if (!hasObjectData(formacionInformeEditsRaw)) seedPayload.formacionInformeEdits = baselines.formacionInformeEdits;

  if (Object.keys(seedPayload).length > 0) {
    await persistSgiDatasetsToSupabase(
      {
        acompanamiento: seedPayload.acompanamiento ?? loaded.acompanamiento,
        comportamientos: seedPayload.comportamientos ?? loaded.comportamientos,
        incapacidades: seedPayload.incapacidades ?? loaded.incapacidades,
        formacion: seedPayload.formacion ?? loaded.formacion,
        incapInformeEdits: seedPayload.incapInformeEdits ?? loaded.incapInformeEdits,
        formacionInformeEdits: seedPayload.formacionInformeEdits ?? loaded.formacionInformeEdits
      },
      'system@emprestur.com'
    );
  }

  return loaded;
}

export async function persistSgiDatasetsToSupabase(
  datasets: SgiPersistedDatasets,
  updatedByEmail: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await Promise.all([
    saveDataset(SGI_DATASET_KEYS.acompanamiento, datasets.acompanamiento, updatedByEmail),
    saveDataset(SGI_DATASET_KEYS.comportamientos, datasets.comportamientos, updatedByEmail),
    saveDataset(SGI_DATASET_KEYS.incapacidades, datasets.incapacidades, updatedByEmail),
    saveDataset(SGI_DATASET_KEYS.formacion, datasets.formacion, updatedByEmail),
    saveDataset(SGI_DATASET_KEYS.incapInformeEdits, datasets.incapInformeEdits, updatedByEmail),
    saveDataset(SGI_DATASET_KEYS.formacionInformeEdits, datasets.formacionInformeEdits, updatedByEmail)
  ]);
}

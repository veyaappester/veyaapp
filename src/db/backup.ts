import { blobToDataURL, dataURLToBlob } from './images';
import { clearAll, dataTables, db } from './schema';

interface BackupFile {
  app: 'veya';
  version: 1;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** JSON backup of everything, with receipt images embedded as base64 data URLs. */
export async function exportBackup(): Promise<Blob> {
  const tables: Record<string, unknown[]> = {};
  for (const name of dataTables) {
    if (name === 'receiptImages') continue;
    tables[name] = await db.table(name).toArray();
  }
  const images = await db.receiptImages.toArray();
  tables.receiptImages = await Promise.all(
    images.map(async (img) => ({ id: img.id, blob: await blobToDataURL(img.blob), thumb: await blobToDataURL(img.thumb) })),
  );
  const file: BackupFile = { app: 'veya', version: 1, exportedAt: new Date().toISOString(), tables };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/** Replaces all data with the contents of a backup file. Throws a Danish message on bad input. */
export async function importBackup(file: Blob): Promise<void> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Filen kunne ikke læses. Er det en Veya-backup (.json)?');
  }
  if (parsed?.app !== 'veya' || !parsed.tables || !Array.isArray(parsed.tables.profile)) {
    throw new Error('Filen er ikke en Veya-backup.');
  }
  const images = await Promise.all(
    ((parsed.tables.receiptImages ?? []) as { id: string; blob: string; thumb: string }[]).map(async (img) => ({
      id: img.id,
      blob: await dataURLToBlob(img.blob),
      thumb: await dataURLToBlob(img.thumb),
    })),
  );
  await clearAll();
  await db.transaction('rw', dataTables.map((t) => db.table(t)), async () => {
    for (const name of dataTables) {
      const rows = name === 'receiptImages' ? images : parsed.tables[name];
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkPut(rows);
    }
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

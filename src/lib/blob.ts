import { put, list, del, copy } from "@vercel/blob"
import { Branca, BRANCA_CODICE, AllegatoFile } from "@/types"

export type { AllegatoFile }

/** Estrae i numeri di 4 cifre dal nome del file e li concatena. Es. "Bilancio 2026-2027" → "20262027" */
export function parseAnnoFromFileName(name: string): string {
  const years = name.match(/\d{4}/g) || []
  return years.join("")
}

function notaPrefix(anno: string, branca: Branca, idNota: string): string {
  return `allegati/${anno}/${BRANCA_CODICE[branca]}/${idNota}/`
}

export async function uploadAllegato(
  anno: string,
  branca: Branca,
  idNota: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<AllegatoFile> {
  const pathname = `${notaPrefix(anno, branca, idNota)}${filename}`
  const blob = await put(pathname, buffer, {
    access: "private",
    contentType: mimeType,
  })
  return { id: blob.url, name: filename, mimeType }
}

function mimeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "application/pdf"
  if (ext === "png") return "image/png"
  return "image/jpeg"
}

export async function listAllegati(anno: string, branca: Branca, idNota: string): Promise<AllegatoFile[]> {
  const prefix = notaPrefix(anno, branca, idNota)
  const { blobs } = await list({ prefix })
  return blobs.map(b => {
    const name = b.pathname.split("/").pop() || b.pathname
    return { id: b.url, name, mimeType: mimeFromExt(name) }
  })
}

export async function listAllegatiCancellati(anno: string, idNota: string): Promise<AllegatoFile[]> {
  const { blobs } = await list({ prefix: `allegati/${anno}/cancellazioni/${idNota}/` })
  return blobs.map(b => {
    const name = b.pathname.split("/").pop() || b.pathname
    return { id: b.url, name, mimeType: mimeFromExt(name) }
  })
}

export async function deleteArchivedAllegati(anno: string, idNota: string): Promise<void> {
  const { blobs } = await list({ prefix: `allegati/${anno}/cancellazioni/${idNota}/` })
  if (blobs.length > 0) await del(blobs.map(b => b.url))
}

export async function deleteAllegato(url: string): Promise<void> {
  await del(url)
}

/** Sposta gli allegati di una nota cancellata in allegati/{anno}/cancellazioni/{idNota}/ (copia, poi elimina l'originale). */
export async function archiveNotaAllegati(anno: string, branca: Branca, idNota: string): Promise<void> {
  const { blobs } = await list({ prefix: notaPrefix(anno, branca, idNota) })
  for (const b of blobs) {
    const name = b.pathname.split("/").pop() || b.pathname
    await copy(b.url, `allegati/${anno}/cancellazioni/${idNota}/${name}`, { access: "private", addRandomSuffix: false, allowOverwrite: true })
    await del(b.url)
  }
}

import { put, list, del } from "@vercel/blob"
import { Branca, BRANCA_CODICE } from "@/types"

export interface AllegatoFile {
  id: string    // URL pubblico del blob (usato come identificatore univoco)
  name: string
  mimeType: string
}

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
    access: "public",
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

export async function deleteAllegato(url: string): Promise<void> {
  await del(url)
}

/** Elimina tutti gli allegati di una nota (quando si cancella il movimento). */
export async function deleteNotaAllegati(anno: string, branca: Branca, idNota: string): Promise<void> {
  const prefix = notaPrefix(anno, branca, idNota)
  const { blobs } = await list({ prefix })
  if (blobs.length > 0) {
    await del(blobs.map(b => b.url))
  }
}

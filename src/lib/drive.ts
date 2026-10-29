import { getDriveClient } from "./google-auth"
import { Branca, BRANCA_CODICE } from "@/types"
import { Readable } from "stream"

const DRIVE_ALLEGATI_FOLDER_ID = process.env.DRIVE_ALLEGATI_FOLDER_ID!

export interface FileAnno {
  id: string
  name: string
}

export async function getFilesAnno(folderId?: string): Promise<FileAnno[]> {
  const drive = getDriveClient()
  const query = folderId
    ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    : `name contains 'Bilancio' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    orderBy: "name",
  })

  return (response.data.files || []) as FileAnno[]
}

export async function backupFile(fileId: string, fileName: string): Promise<string> {
  const drive = getDriveClient()
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 16).replace("T", "_").replace(":", "-")
  const backupName = `${fileName}_backup_${timestamp}`

  const file = await drive.files.get({ fileId, fields: "parents" })
  const parents = file.data.parents || []

  const copied = await drive.files.copy({
    fileId,
    requestBody: {
      name: backupName,
      parents,
    },
  })

  return copied.data.id!
}

export async function getBackups(fileName: string): Promise<FileAnno[]> {
  const drive = getDriveClient()
  const baseName = fileName.replace(" ", "_").split("_")[0]

  const response = await drive.files.list({
    q: `name contains '${baseName}' and name contains '_backup_' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name desc",
  })

  return (response.data.files || []) as FileAnno[]
}

// ─── Allegati ────────────────────────────────────────────────────────────────

export interface AllegatoFile {
  id: string
  name: string
  mimeType: string
}

/** Estrae i numeri di 4 cifre dal nome del file e li concatena. Es. "Bilancio 2026-2027" → "20262027" */
export function parseAnnoFromFileName(name: string): string {
  const years = name.match(/\d{4}/g) || []
  return years.join("")
}

async function getOrCreateFolder(
  drive: ReturnType<typeof getDriveClient>,
  name: string,
  parentId: string
): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  if (res.data.files?.length) return res.data.files[0].id!

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  })
  return created.data.id!
}

/** Crea (se non esiste) la cartella allegati/{anno}/{BRANCA_CODICE}/{idNota} e restituisce il suo ID. */
export async function getOrCreateNotaFolder(
  branca: Branca,
  idNota: string,
  annoFolderName: string
): Promise<string> {
  const drive = getDriveClient()
  const brancaCode = BRANCA_CODICE[branca]
  const annoFolderId = await getOrCreateFolder(drive, annoFolderName, DRIVE_ALLEGATI_FOLDER_ID)
  const brancaFolderId = await getOrCreateFolder(drive, brancaCode, annoFolderId)
  return getOrCreateFolder(drive, idNota, brancaFolderId)
}

export async function uploadAllegato(
  notaFolderId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<AllegatoFile> {
  const drive = getDriveClient()
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [notaFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  })
  return { id: res.data.id!, name: res.data.name!, mimeType: res.data.mimeType! }
}

export async function listAllegati(notaFolderId: string): Promise<AllegatoFile[]> {
  const drive = getDriveClient()
  const res = await drive.files.list({
    q: `'${notaFolderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType)",
    orderBy: "name",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  return (res.data.files || []) as AllegatoFile[]
}

export async function deleteAllegato(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

/** Elimina la cartella {idNota} (e tutto il suo contenuto) in Drive. */
export async function deleteNotaFolder(
  branca: Branca,
  idNota: string,
  annoFolderName: string
): Promise<void> {
  const drive = getDriveClient()
  const brancaCode = BRANCA_CODICE[branca]
  const listOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true }

  const annoRes = await drive.files.list({
    q: `name='${annoFolderName}' and '${DRIVE_ALLEGATI_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  const annoFolderId = annoRes.data.files?.[0]?.id
  if (!annoFolderId) return

  const brancaRes = await drive.files.list({
    q: `name='${brancaCode}' and '${annoFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  const brancaFolderId = brancaRes.data.files?.[0]?.id
  if (!brancaFolderId) return

  const notaRes = await drive.files.list({
    q: `name='${idNota}' and '${brancaFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  const notaFolderId = notaRes.data.files?.[0]?.id
  if (!notaFolderId) return

  await drive.files.delete({ fileId: notaFolderId, supportsAllDrives: true })
}

/** Trova l'ID della cartella nota se esiste già (senza crearla). */
export async function findNotaFolder(
  branca: Branca,
  idNota: string,
  annoFolderName: string
): Promise<string | null> {
  const drive = getDriveClient()
  const brancaCode = BRANCA_CODICE[branca]
  const listOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true }

  const annoRes = await drive.files.list({
    q: `name='${annoFolderName}' and '${DRIVE_ALLEGATI_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  const annoFolderId = annoRes.data.files?.[0]?.id
  if (!annoFolderId) return null

  const brancaRes = await drive.files.list({
    q: `name='${brancaCode}' and '${annoFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  const brancaFolderId = brancaRes.data.files?.[0]?.id
  if (!brancaFolderId) return null

  const notaRes = await drive.files.list({
    q: `name='${idNota}' and '${brancaFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    ...listOpts,
  })
  return notaRes.data.files?.[0]?.id || null
}

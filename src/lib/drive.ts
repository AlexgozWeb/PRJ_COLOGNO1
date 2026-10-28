import { getDriveClient } from "./google-auth"

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

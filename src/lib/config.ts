import { getSheetsClient, getDriveClient } from "./google-auth"
import { Config, Permessi, Branca } from "@/types"

const CONFIG_SHEET_ID = process.env.APP_CONFIG_SHEET_ID!
const BRANCHE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa']

export async function getConfig(): Promise<Config> {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG_SHEET_ID,
    range: "Impostazioni!A1:B2",
  })
  const rows = (response.data.values || []) as string[][]

  const annoAttivo = rows[0]?.[1] || ""
  const adminEmails = (rows[1]?.[1] || "")
    .split(",")
    .map(e => e.trim())
    .filter(Boolean)

  return { annoAttivo, adminEmails }
}

export async function getAnnoAttivoName(fileId: string): Promise<string> {
  if (!fileId) return ""
  try {
    const drive = getDriveClient()
    const res = await drive.files.get({ fileId, fields: "name" })
    return res.data.name || fileId
  } catch {
    return fileId
  }
}

export async function listBilanci(): Promise<{ id: string; name: string }[]> {
  try {
    const drive = getDriveClient()
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains 'Bilancio'",
      fields: "files(id,name)",
      orderBy: "name desc",
    })
    return (res.data.files || []).map(f => ({ id: f.id!, name: f.name! }))
  } catch {
    return []
  }
}

export async function setAnnoAttivo(fileId: string): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG_SHEET_ID,
    range: "Impostazioni!B1",
    valueInputOption: "RAW",
    requestBody: { values: [[fileId]] },
  })
}

export async function getPermessi(): Promise<Permessi> {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG_SHEET_ID,
    range: "Permessi!A:G",
  })
  const rows = (response.data.values || []) as string[][]
  if (rows.length < 2) return {}

  const permessi: Permessi = {}
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const email = row[0]
    if (!email) continue
    const entry: Record<Branca, boolean> = {} as Record<Branca, boolean>
    BRANCHE.forEach((branca, idx) => {
      entry[branca] = row[idx + 1] === "TRUE" || row[idx + 1] === "✅" || row[idx + 1] === "true"
    })
    permessi[email] = entry
  }
  return permessi
}

export async function setPermessi(email: string, branche: Partial<Record<Branca, boolean>>): Promise<void> {
  const sheets = getSheetsClient()
  const current = await getPermessi()
  const existing = current[email] || { LC: false, CdA: false, EG: false, Novi: false, Clan: false, CoCa: false }
  const updated = { ...existing, ...branche }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG_SHEET_ID,
    range: "Permessi!A:A",
  })
  const emailCol = (response.data.values || []) as string[][]
  let rowIndex = emailCol.findIndex((r, i) => i > 0 && r[0] === email)

  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG_SHEET_ID,
      range: "Permessi!A:G",
      valueInputOption: "RAW",
      requestBody: {
        values: [[email, ...BRANCHE.map(b => updated[b] ? "TRUE" : "FALSE")]],
      },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG_SHEET_ID,
      range: `Permessi!A${rowIndex + 1}:G${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[email, ...BRANCHE.map(b => updated[b] ? "TRUE" : "FALSE")]],
      },
    })
  }
}

export async function isAdmin(email: string): Promise<boolean> {
  const config = await getConfig()
  return config.adminEmails.includes(email)
}

export async function getUserPermessi(email: string): Promise<Record<Branca, boolean>> {
  const permessi = await getPermessi()
  return permessi[email] || { LC: false, CdA: false, EG: false, Novi: false, Clan: false, CoCa: false }
}

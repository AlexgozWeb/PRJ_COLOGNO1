import { getSheetsClient, getDriveClient } from "./google-auth"
import { unstable_cache, revalidateTag } from "next/cache"
import { Config, Permessi, Branca } from "@/types"

const CONFIG_SHEET_ID = process.env.APP_CONFIG_SHEET_ID!
const BRANCHE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']
const DEFAULT_MAX_ATTACHMENT_MB = 1

export const getConfig = unstable_cache(
  async (): Promise<Config> => {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG_SHEET_ID,
      range: "Impostazioni!A:B",
    })
    const rows = (response.data.values || []) as string[][]

    const annoAttivo = rows[0]?.[1] || ""
    const adminEmails = (rows[1]?.[1] || "")
      .split(",")
      .map(e => e.trim())
      .filter(Boolean)

    const maxRaw = rows.find(r => r[0]?.trim().toLowerCase() === "max_attachment_size_mb")?.[1]
    const maxParsed = parseFloat((maxRaw || "").replace(",", "."))
    const maxAttachmentSizeMb = maxParsed > 0 ? maxParsed : DEFAULT_MAX_ATTACHMENT_MB

    return { annoAttivo, adminEmails, maxAttachmentSizeMb }
  },
  ["config"],
  { revalidate: 60, tags: ["config"] }
)

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
  revalidateTag("config", { expire: 0 })
}

export const getPermessi = unstable_cache(
  async (): Promise<Permessi> => {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG_SHEET_ID,
      range: "Permessi!A:H",
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
  },
  ["permessi"],
  { revalidate: 60, tags: ["permessi"] }
)

export async function setPermessi(email: string, branche: Partial<Record<Branca, boolean>>): Promise<void> {
  const sheets = getSheetsClient()
  const current = await getPermessi()
  const existing = current[email] || { LC: false, CdA: false, EG: false, Novi: false, Clan: false, CoCa: false, Gruppo: false }
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
      range: "Permessi!A:H",
      valueInputOption: "RAW",
      requestBody: {
        values: [[email, ...BRANCHE.map(b => updated[b] ? "TRUE" : "FALSE")]],
      },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG_SHEET_ID,
      range: `Permessi!A${rowIndex + 1}:H${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[email, ...BRANCHE.map(b => updated[b] ? "TRUE" : "FALSE")]],
      },
    })
  }
  revalidateTag("permessi", { expire: 0 })
}

export async function isAdmin(email: string): Promise<boolean> {
  const config = await getConfig()
  return config.adminEmails.includes(email)
}

export async function getUserPermessi(email: string): Promise<Record<Branca, boolean>> {
  const permessi = await getPermessi()
  return permessi[email] || { LC: false, CdA: false, EG: false, Novi: false, Clan: false, CoCa: false, Gruppo: false }
}

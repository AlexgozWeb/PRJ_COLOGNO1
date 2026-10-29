import { getSheetsClient, getDriveClient } from "./google-auth"
import { unstable_cache, revalidateTag } from "next/cache"
import { Config, Permessi, Branca, ListeValori, ValoreLista } from "@/types"

const CONFIG_SHEET_ID = process.env.APP_CONFIG_SHEET_ID!
const BRANCHE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']
const DEFAULT_MAX_ATTACHMENT_MB = 1

const plain = (...valori: string[]): ValoreLista[] => valori.map(valore => ({ valore, textColor: "", bgColor: "" }))

// Usate solo se il foglio "Lista Valori" non è leggibile o non contiene una colonna
const DEFAULT_LISTE: ListeValori = {
  inOut: [
    { valore: "Entrata", textColor: "#047857", bgColor: "#D1FAE5" },
    { valore: "Uscita", textColor: "#B91C1C", bgColor: "#FEE2E2" },
  ],
  modalita: plain("Carta", "Contanti"),
  fondo: plain("Distintivi", "Materiale", "Pernotti", "VdB", "Altro"),
}

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i

function normalizeKey(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
}

export const getListeValori = unstable_cache(
  async (): Promise<ListeValori> => {
    try {
      const sheets = getSheetsClient()
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG_SHEET_ID,
        range: "'Lista Valori'!A:D",
      })
      const rows = ((response.data.values || []) as string[][]).slice(1)
      const liste: ListeValori = { inOut: [], modalita: [], fondo: [] }
      const keys: Record<string, keyof ListeValori> = { "in/out": "inOut", modalita: "modalita", fondo: "fondo" }

      for (const row of rows) {
        const target = keys[normalizeKey(row[0] || "")]
        const valore = (row[1] || "").trim()
        // "—" è la voce vuota, che l'app aggiunge sempre da sola
        if (!target || !valore || valore === "—" || valore === "-") continue
        const color = (c?: string) => (c && HEX_COLOR.test(c.trim()) ? c.trim() : "")
        liste[target].push({ valore, textColor: color(row[2]), bgColor: color(row[3]) })
      }

      return {
        inOut: liste.inOut.length ? liste.inOut : DEFAULT_LISTE.inOut,
        modalita: liste.modalita.length ? liste.modalita : DEFAULT_LISTE.modalita,
        fondo: liste.fondo.length ? liste.fondo : DEFAULT_LISTE.fondo,
      }
    } catch {
      return DEFAULT_LISTE
    }
  },
  ["liste-valori"],
  { revalidate: 10, tags: ["liste-valori"] }
)

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

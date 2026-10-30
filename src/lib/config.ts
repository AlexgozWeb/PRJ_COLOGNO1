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

const LISTA_KEYS: Record<string, keyof ListeValori> = { "in/out": "inOut", modalita: "modalita", fondo: "fondo" }

export interface RigaListaValori {
  riga: number            // riga 1-based nel foglio "Lista Valori"
  colonna: keyof ListeValori
  valore: string
  textColor: string
  bgColor: string
}

export interface PaletteColori {
  testo: string[]
  sfondo: string[]
}

function colLetter(i: number): string {
  let s = ""
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

// Le colonne dei colori si trovano dall'intestazione; se mancano valgono C e D
async function leggiLista() {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG_SHEET_ID,
    range: "'Lista Valori'!A:Z",
  })
  const rows = (response.data.values || []) as string[][]
  const headers = (rows[0] || []).map(h => normalizeKey(h || "").replace(/\s+/g, " "))
  const find = (pred: (h: string) => boolean) => headers.findIndex(pred)
  const isDefault = (h: string) => h.includes("default")
  const cText = Math.max(find(h => /^text? color$/.test(h)), -1)
  const cBg = Math.max(find(h => h === "bg color"), -1)
  return {
    rows,
    cText: cText >= 0 ? cText : 2,
    cBg: cBg >= 0 ? cBg : 3,
    cTextDef: find(h => /^text? color/.test(h) && isDefault(h)),
    cBgDef: find(h => h.startsWith("bg color") && isDefault(h)),
  }
}

const uniqueHex = (values: (string | undefined)[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const hex = (v || "").trim()
    if (HEX_COLOR.test(hex) && !seen.has(hex.toUpperCase())) {
      seen.add(hex.toUpperCase())
      out.push(hex)
    }
  }
  return out
}

// Ordine alfabetico; "Altro" resta sempre in fondo. In/Out mantiene l'ordine del foglio.
function ordinaValori<T extends { valore: string }>(colonna: keyof ListeValori, items: T[]): T[] {
  if (colonna === "inOut") return items
  const isAltro = (v: string) => v.trim().toLowerCase() === "altro"
  return [...items].sort((a, b) => {
    if (isAltro(a.valore) !== isAltro(b.valore)) return isAltro(a.valore) ? 1 : -1
    return a.valore.localeCompare(b.valore, "it", { sensitivity: "base" })
  })
}

// Lettura diretta (senza cache) per la console admin; "—" è la voce vuota e viene esclusa
export async function getListeValoriRighe(): Promise<{ righe: RigaListaValori[]; palette: PaletteColori }> {
  const { rows, cText, cBg, cTextDef, cBgDef } = await leggiLista()
  const righe: RigaListaValori[] = []
  rows.forEach((row, i) => {
    if (i === 0) return
    const colonna = LISTA_KEYS[normalizeKey(row[0] || "")]
    const valore = (row[1] || "").trim()
    if (!colonna || !valore || valore === "—" || valore === "-") return
    righe.push({ riga: i + 1, colonna, valore, textColor: (row[cText] || "").trim(), bgColor: (row[cBg] || "").trim() })
  })
  const body = rows.slice(1)
  const palette: PaletteColori = {
    testo: cTextDef >= 0 ? uniqueHex(body.map(r => r[cTextDef])) : [],
    sfondo: cBgDef >= 0 ? uniqueHex(body.map(r => r[cBgDef])) : [],
  }
  const ordinate = (Object.keys(LISTA_LABEL) as (keyof ListeValori)[]).flatMap(k =>
    ordinaValori(k, righe.filter(r => r.colonna === k))
  )
  return { righe: ordinate, palette }
}

const LISTA_LABEL: Record<keyof ListeValori, string> = { inOut: "In/Out", modalita: "Modalità", fondo: "Fondo" }

// Svuota solo le celle della voce (non elimina la riga, per non spostare le palette "Default")
export async function deleteValoreLista(input: { riga: number; colonna: string; valore: string }): Promise<void> {
  const colonna = LISTA_KEYS[normalizeKey(input.colonna)]
  if (colonna !== "modalita" && colonna !== "fondo") throw new Error("Colonna non valida")
  if (!Number.isInteger(input.riga) || input.riga < 2) throw new Error("Riga non valida")
  const { righe } = await getListeValoriRighe()
  const r = righe.find(a => a.riga === input.riga)
  if (!r || r.valore !== input.valore || r.colonna !== colonna) {
    throw new Error("Il foglio Lista Valori è cambiato: ricarica la pagina e riprova")
  }
  const { cText, cBg } = await leggiLista()
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: CONFIG_SHEET_ID,
    requestBody: {
      ranges: [...new Set([0, 1, cText, cBg])].map(c => `'Lista Valori'!${colLetter(c)}${input.riga}`),
    },
  })
  revalidateTag("liste-valori", { expire: 0 })
}

// Aggiunge una riga in coda al foglio "Lista Valori" (solo Modalità e Fondo)
export async function addValoreLista(input: {
  colonna: string; valore: string; textColor: string; bgColor: string
}): Promise<void> {
  const colonna = LISTA_KEYS[normalizeKey(input.colonna)]
  if (colonna !== "modalita" && colonna !== "fondo") throw new Error("Colonna non valida")
  const valore = input.valore.trim()
  if (!valore || valore === "—" || valore === "-") throw new Error("Valore non valido")
  if (valore.length > 40) throw new Error("Valore troppo lungo (max 40 caratteri)")
  for (const c of [input.textColor, input.bgColor]) {
    if (c && !HEX_COLOR.test(c)) throw new Error(`Colore non valido: ${c}`)
  }

  const { rows, cText, cBg } = await leggiLista()
  const duplicato = rows.slice(1).some(r =>
    LISTA_KEYS[normalizeKey(r[0] || "")] === colonna && (r[1] || "").trim().toLowerCase() === valore.toLowerCase()
  )
  if (duplicato) throw new Error(`Il valore "${valore}" esiste già`)

  const label = rows.slice(1).find(r => LISTA_KEYS[normalizeKey(r[0] || "")] === colonna)?.[0] || LISTA_LABEL[colonna]
  const width = Math.max(cText, cBg) + 1
  const newRow: string[] = Array(width).fill("")
  newRow[0] = label
  newRow[1] = valore
  newRow[cText] = input.textColor
  newRow[cBg] = input.bgColor

  const sheets = getSheetsClient()
  const riga = rows.length + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG_SHEET_ID,
    range: `'Lista Valori'!A${riga}:${colLetter(width - 1)}${riga}`,
    valueInputOption: "RAW",
    requestBody: { values: [newRow] },
  })
  revalidateTag("liste-valori", { expire: 0 })
}

export async function setColoriListeValori(
  updates: { riga: number; colonna: string; valore: string; textColor: string; bgColor: string }[]
): Promise<void> {
  for (const u of updates) {
    if (!Number.isInteger(u.riga) || u.riga < 2) throw new Error("Riga non valida")
    for (const c of [u.textColor, u.bgColor]) {
      if (c && !HEX_COLOR.test(c)) throw new Error(`Colore non valido: ${c}`)
    }
  }
  const { righe: attuali } = await getListeValoriRighe()
  // La riga deve ancora contenere lo stesso valore (il foglio potrebbe essere stato modificato)
  for (const u of updates) {
    const r = attuali.find(a => a.riga === u.riga)
    if (!r || r.valore !== u.valore || r.colonna !== LISTA_KEYS[normalizeKey(u.colonna)]) {
      throw new Error(`Il foglio Lista Valori è cambiato (riga ${u.riga}): ricarica la pagina e riprova`)
    }
  }
  if (updates.length === 0) return

  const { cText, cBg } = await leggiLista()
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: CONFIG_SHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates.flatMap(u => [
        { range: `'Lista Valori'!${colLetter(cText)}${u.riga}`, values: [[u.textColor]] },
        { range: `'Lista Valori'!${colLetter(cBg)}${u.riga}`, values: [[u.bgColor]] },
      ]),
    },
  })
  revalidateTag("liste-valori", { expire: 0 })
}

export const getListeValori = unstable_cache(
  async (): Promise<ListeValori> => {
    try {
      const { rows, cText, cBg } = await leggiLista()
      const liste: ListeValori = { inOut: [], modalita: [], fondo: [] }

      for (const row of rows.slice(1)) {
        const target = LISTA_KEYS[normalizeKey(row[0] || "")]
        const valore = (row[1] || "").trim()
        // "—" è la voce vuota, che l'app aggiunge sempre da sola
        if (!target || !valore || valore === "—" || valore === "-") continue
        const color = (c?: string) => (c && HEX_COLOR.test(c.trim()) ? c.trim() : "")
        liste[target].push({ valore, textColor: color(row[cText]), bgColor: color(row[cBg]) })
      }

      return {
        inOut: liste.inOut.length ? liste.inOut : DEFAULT_LISTE.inOut,
        modalita: liste.modalita.length ? ordinaValori("modalita", liste.modalita) : DEFAULT_LISTE.modalita,
        fondo: liste.fondo.length ? ordinaValori("fondo", liste.fondo) : DEFAULT_LISTE.fondo,
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

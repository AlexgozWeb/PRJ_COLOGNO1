import { getSheetsClient } from "./google-auth"
import { Movimento, MovimentoStorico, Branca, BRANCA_CODICE } from "@/types"


function parseImporto(raw: string): number {
  if (!raw) return 0
  let s = raw.replace(/[€$\s]/g, "")
  if (s.includes(",") && s.includes(".")) {
    // es. "2,000.00" → virgola = migliaia, punto = decimale
    s = s.replace(/,/g, "")
  } else if (s.includes(",")) {
    // es. "15,00" → virgola = decimale (formato italiano)
    s = s.replace(",", ".")
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function isDataRow(row: string[]): boolean {
  const dateCell = row[1] || ""
  // Esclude righe vuote e righe intestazione (dove la cella data contiene testo non-data)
  if (!dateCell || dateCell.toLowerCase() === "data") return false
  // Almeno un campo significativo deve essere valorizzato
  return !!(row[1] || row[7] || row[5])
}

function rowToMovimento(row: string[], sheetRowIndex: number): Movimento {
  return {
    id: sheetRowIndex + 1, // riga 1-based nel foglio (sheetRowIndex è 0-based dall'inizio lettura A1)
    numero: Number(row[0]) || 0,
    data: row[1] || "",
    inOut: row[2] || "",
    modalita: row[3] || "",
    fondo: row[4] || "",
    importo: parseImporto(row[5]),
    codice: row[6] || "",
    note: row[7] || "",
    status: row[8] || "",
    idNota: row[9] || "",
    allegati: (row[10] || "").trim().toUpperCase() === "TRUE",
    modificatoDa: row[11] || "",
    modificatoIl: row[12] || "",
    creatoDa: row[13] || "",
    creatoIl: row[14] || "",
  }
}

function userName(email: string): string {
  return email
}

function todayIt(): string {
  return new Date().toLocaleString("it-IT", {
    timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(",", "")
}

// L'ID è il massimo della stessa branca tra note presenti e storico, più 1
function generateIdNota(branca: Branca, existing: Movimento[], archivedIds: string[]): string {
  const prefix = BRANCA_CODICE[branca]
  const nums = [...existing.map(m => m.idNota), ...archivedIds]
    .map(id => (id?.startsWith(prefix) ? parseInt(id.slice(prefix.length)) || 0 : 0))
  const max = Math.max(0, ...nums)
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}

const STORICO_TITLE = "storico cancellazioni"
const STORICO_FIRST_ROW = 4

async function getStoricoTitle(spreadsheetId: string): Promise<string> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: "properties.title,sheets.properties.title" })
  const title = (res.data.sheets || []).map(s => s.properties?.title || "").find(t => t.trim().toLowerCase() === STORICO_TITLE)
  if (!title) throw new Error(`Per il file "${res.data.properties?.title || spreadsheetId}" la cancellazione non è prevista (manca il foglio "Storico Cancellazioni"). Nota non eliminata.`)
  return title
}

// ID nota già archiviati: servono perché un ID cancellato non venga riassegnato a una nuova nota
async function getArchivedIdNota(spreadsheetId: string): Promise<string[]> {
  try {
    const title = await getStoricoTitle(spreadsheetId)
    const res = await getSheetsClient().spreadsheets.values.get({ spreadsheetId, range: `'${title}'!J${STORICO_FIRST_ROW}:J` })
    return ((res.data.values || []) as string[][]).map(r => (r[0] || "").trim()).filter(Boolean)
  } catch {
    return []
  }
}

// Copia la nota (valori grezzi di B:H e J:O) nello storico, con branca, autore e data della cancellazione
async function archiviaNota(spreadsheetId: string, branca: Branca, rowNumber: number, userEmail: string): Promise<void> {
  const sheets = getSheetsClient()
  const title = await getStoricoTitle(spreadsheetId)

  const src = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${branca}!B${rowNumber}:O${rowNumber}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  })
  const row = ((src.data.values?.[0]) || []) as unknown[]
  if (row.every(c => c === "" || c == null)) return
  const cell = (i: number) => row[i] ?? ""

  // Le righe dello storico sono preformattate: si cerca la prima libera in B/J invece di usare append
  const used = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!B${STORICO_FIRST_ROW}:J` })
  const usedRows = (used.data.values || []) as string[][]
  let last = 0
  usedRows.forEach((r, i) => { if (r.some(c => String(c ?? "").trim() !== "")) last = i + 1 })
  const target = STORICO_FIRST_ROW + last

  // B:H dati, I branca, J:O (ID_NOTA, Allegati, audit), P cancellato da, Q cancellato il
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!B${target}:Q${target}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        cell(0), cell(1), cell(2), cell(3), cell(4), cell(5), cell(6),
        branca,
        cell(8), cell(9), cell(10), cell(11), cell(12), cell(13),
        userName(userEmail), todayIt(),
      ]],
    },
  })
}

// Elenco delle branche con un foglio nel file; se la lettura fallisce le considera tutte presenti
export async function getBrancheDisponibili(spreadsheetId: string, branche: Branca[]): Promise<Set<Branca>> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" })
    const titles = new Set((res.data.sheets || []).map(s => (s.properties?.title || "").trim().toLowerCase()))
    return new Set(branche.filter(b => titles.has(b.toLowerCase())))
  } catch {
    return new Set(branche)
  }
}

export async function hasStorico(spreadsheetId: string): Promise<boolean> {
  try {
    await getStoricoTitle(spreadsheetId)
    return true
  } catch {
    return false
  }
}

export async function getStorico(spreadsheetId: string): Promise<MovimentoStorico[]> {
  const title = await getStoricoTitle(spreadsheetId)
  const response = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A1:Q`,
  })
  const rows = (response.data.values || []) as string[][]
  return rows
    .map((row, index) => ({ row, sheetRow: index + 1 }))
    .filter(({ row }) => isDataRow(row))
    .map(({ row, sheetRow }) => ({
      ...rowToMovimento(row, sheetRow - 1),
      status: "",
      branca: (row[8] || "").trim(),
      cancellatoDa: row[15] || "",
      cancellatoIl: row[16] || "",
    }))
}

// Cancellazione definitiva di una riga dello storico: le righe sotto scorrono in su su B:Q, l'ultima viene svuotata
export async function deleteStoricoRow(spreadsheetId: string, rowNumber: number, expectedIdNota: string): Promise<void> {
  const sheets = getSheetsClient()
  const title = await getStoricoTitle(spreadsheetId)

  const check = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!J${rowNumber}` })
  const current = (check.data.values?.[0]?.[0] ?? "").toString().trim()
  if (current !== expectedIdNota) throw new StaleRowError()

  const rows = await getStorico(spreadsheetId)
  const last = Math.max(rows.length > 0 ? rows[rows.length - 1].id : rowNumber, rowNumber)

  let below: unknown[][] = []
  if (last > rowNumber) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${title}'!B${rowNumber + 1}:Q${last}`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
    below = (res.data.values || []) as unknown[][]
  }

  const block: unknown[][] = []
  for (let i = 0; i <= last - rowNumber; i++) {
    const src = below[i]
    block.push(Array.from({ length: 16 }, (_, c) => src?.[c] ?? ""))
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!B${rowNumber}:Q${last}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: block },
  })
}

export async function getMovimenti(spreadsheetId: string, branca: Branca): Promise<Movimento[]> {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${branca}!A1:O`,
  })
  const rows = (response.data.values || []) as string[][]
  return rows
    .map((row, index) => ({ row, sheetRow: index + 1 }))
    .filter(({ row }) => isDataRow(row))
    .map(({ row, sheetRow }) => rowToMovimento(row, sheetRow - 1))
}

export async function addMovimento(
  spreadsheetId: string,
  branca: Branca,
  data: Pick<Movimento, "data" | "inOut" | "modalita" | "fondo" | "importo" | "codice" | "note">,
  userEmail: string
): Promise<{ idNota: string }> {
  const sheets = getSheetsClient()
  const existing = await getMovimenti(spreadsheetId, branca)
  const nextNum = existing.length + 1
  const idNota = generateIdNota(branca, existing, await getArchivedIdNota(spreadsheetId))

  const lastId = existing.length > 0 ? existing[existing.length - 1].id : 3
  const targetRow = lastId + 1

  // Scrivi A:H (dati) e J (ID_NOTA) in un colpo solo, lasciando I (Status, formula) intatta
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${branca}!A${targetRow}:H${targetRow}`,
          values: [[
            nextNum,
            data.data,
            data.inOut,
            data.modalita,
            data.fondo,
            data.importo,
            data.codice,
            data.note,
          ]],
        },
        {
          range: `${branca}!J${targetRow}`,
          values: [[idNota]],
        },
        {
          range: `${branca}!L${targetRow}:O${targetRow}`,
          values: [["-", "-", userName(userEmail), todayIt()]],
        },
      ],
    },
  })

  return { idNota }
}

export async function setAllegatiFlag(
  spreadsheetId: string,
  branca: Branca,
  idNota: string,
  hasAllegati: boolean
): Promise<void> {
  const movimenti = await getMovimenti(spreadsheetId, branca)
  const movimento = movimenti.find(m => m.idNota === idNota)
  if (!movimento || movimento.allegati === hasAllegati) return

  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${branca}!K${movimento.id}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[hasAllegati]] },
  })
}

export async function updateMovimento(
  spreadsheetId: string,
  branca: Branca,
  rowNumber: number,
  data: Partial<Pick<Movimento, "data" | "inOut" | "modalita" | "fondo" | "importo" | "codice" | "note">>,
  userEmail: string
): Promise<void> {
  const sheets = getSheetsClient()
  // Aggiorna B:H (dati) e L:M (Modificato da/il); lascia intatte I (formula), J (ID_NOTA), K, N, O
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${branca}!B${rowNumber}:H${rowNumber}`,
          values: [[
            data.data ?? "",
            data.inOut ?? "",
            data.modalita ?? "",
            data.fondo ?? "",
            data.importo ?? 0,
            data.codice ?? "",
            data.note ?? "",
          ]],
        },
        {
          range: `${branca}!L${rowNumber}:M${rowNumber}`,
          values: [[userName(userEmail), todayIt()]],
        },
      ],
    },
  })
}

export async function deleteMovimento(
  spreadsheetId: string,
  branca: Branca,
  rowNumber: number,
  userEmail: string,
  expectedIdNota?: string
): Promise<void> {
  const sheets = getSheetsClient()

  // La pagina può essere obsoleta: la riga deve ancora contenere la nota attesa
  if (expectedIdNota) {
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${branca}!J${rowNumber}`,
    })
    const current = (check.data.values?.[0]?.[0] ?? "").toString().trim()
    if (current !== expectedIdNota) throw new StaleRowError()
  }

  // Se l'archiviazione fallisce la nota non viene toccata
  await archiviaNota(spreadsheetId, branca, rowNumber, userEmail)

  const movimenti = await getMovimenti(spreadsheetId, branca)
  const lastDataRow = movimenti.length > 0 ? movimenti[movimenti.length - 1].id : rowNumber
  const last = Math.max(lastDataRow, rowNumber)

  // Valori grezzi di B:O dalla riga successiva a quella eliminata fino all'ultima nota
  let below: unknown[][] = []
  if (last > rowNumber) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${branca}!B${rowNumber + 1}:O${last}`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
    below = (res.data.values || []) as unknown[][]
  }

  // Colonne B:O → B:H (dati) e J:O (ID_NOTA, Allegati, audit); I (Status, formula) non viene toccata
  const cell = (row: unknown[] | undefined, i: number) => row?.[i] ?? ""
  const count = last - rowNumber + 1
  const dataBlock: unknown[][] = []
  const idBlock: unknown[][] = []
  for (let i = 0; i < count; i++) {
    const src = below[i] // undefined per l'ultima riga: viene svuotata
    dataBlock.push([0, 1, 2, 3, 4, 5, 6].map(c => cell(src, c)))
    idBlock.push([8, 9, 10, 11, 12, 13].map(c => cell(src, c)))
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: `${branca}!B${rowNumber}:H${last}`, values: dataBlock },
        { range: `${branca}!J${rowNumber}:O${last}`, values: idBlock },
      ],
    },
  })
}

export class StaleRowError extends Error {
  constructor() {
    super("Impossibile cancellare la transazione: la posizione delle note è cambiata per un accesso simultaneo di un altro utente. Chiudi la finestra, attendi l'aggiornamento della pagina e riprova.")
    this.name = "StaleRowError"
  }
}

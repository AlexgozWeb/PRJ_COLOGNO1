import { getSheetsClient } from "./google-auth"
import { Movimento, Branca, BRANCA_CODICE } from "@/types"


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
  }
}

function generateIdNota(branca: Branca, existing: Movimento[]): string {
  const prefix = BRANCA_CODICE[branca]
  const nums = existing
    .map(m => {
      if (!m.idNota?.startsWith(prefix)) return 0
      return parseInt(m.idNota.slice(prefix.length)) || 0
    })
    .filter(n => n > 0)
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}

export async function getMovimenti(spreadsheetId: string, branca: Branca): Promise<Movimento[]> {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${branca}!A1:K`,
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
  data: Pick<Movimento, "data" | "inOut" | "modalita" | "fondo" | "importo" | "codice" | "note">
): Promise<{ idNota: string }> {
  const sheets = getSheetsClient()
  const existing = await getMovimenti(spreadsheetId, branca)
  const nextNum = existing.length + 1
  const idNota = generateIdNota(branca, existing)

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
  data: Partial<Pick<Movimento, "data" | "inOut" | "modalita" | "fondo" | "importo" | "codice" | "note">>
): Promise<void> {
  const sheets = getSheetsClient()
  // Aggiorna solo B:H (dati), lascia intatta I (Status = formula) e J (ID_NOTA, immutabile)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${branca}!B${rowNumber}:H${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
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
  })
}

export async function deleteMovimento(
  spreadsheetId: string,
  branca: Branca,
  rowNumber: number,
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

  const movimenti = await getMovimenti(spreadsheetId, branca)
  const lastDataRow = movimenti.length > 0 ? movimenti[movimenti.length - 1].id : rowNumber
  const last = Math.max(lastDataRow, rowNumber)

  // Valori grezzi di B:K dalla riga successiva a quella eliminata fino all'ultima nota
  let below: unknown[][] = []
  if (last > rowNumber) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${branca}!B${rowNumber + 1}:K${last}`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
    below = (res.data.values || []) as unknown[][]
  }

  // Colonne B:K → B:H (dati) e J:K (ID_NOTA, Allegati); I (Status, formula) non viene toccata
  const cell = (row: unknown[] | undefined, i: number) => row?.[i] ?? ""
  const count = last - rowNumber + 1
  const dataBlock: unknown[][] = []
  const idBlock: unknown[][] = []
  for (let i = 0; i < count; i++) {
    const src = below[i] // undefined per l'ultima riga: viene svuotata
    dataBlock.push([0, 1, 2, 3, 4, 5, 6].map(c => cell(src, c)))
    idBlock.push([8, 9].map(c => cell(src, c)))
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: `${branca}!B${rowNumber}:H${last}`, values: dataBlock },
        { range: `${branca}!J${rowNumber}:K${last}`, values: idBlock },
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

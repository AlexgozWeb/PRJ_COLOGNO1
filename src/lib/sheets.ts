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
    range: `${branca}!A1:J`,
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
  rowNumber: number
): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === branca)
  const sheetId = sheet?.properties?.sheetId

  if (sheetId === undefined) throw new Error(`Sheet ${branca} non trovato`)

  // 1. Cancella la riga
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNumber - 1, // 0-based
            endIndex: rowNumber,
          },
        },
      }],
    },
  })

  // 2. Reinserisci una riga vuota dopo l'ultimo dato (ripristina le righe pre-formattate)
  //    inheritFromBefore: false → copia formato dalla riga sotto (prima riga pre-formattata)
  const remaining = await getMovimenti(spreadsheetId, branca)
  const lastDataRow = remaining.length > 0 ? remaining[remaining.length - 1].id : rowNumber - 1
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: lastDataRow, // 0-based = inserisce alla riga 1-based lastDataRow+1
            endIndex: lastDataRow + 1,
          },
          inheritFromBefore: false, // copia formato dalla riga pre-formattata sotto
        },
      }],
    },
  })

  // 3. Rinumera la colonna A (righe dati + nuova riga vuota appena inserita)
  const newEmptyRow = lastDataRow + 1 // riga 1-based della nuova riga vuota inserita
  const renumberData = remaining.map((m, i) => ({
    range: `${branca}!A${m.id}`,
    values: [[i + 1]],
  }))
  renumberData.push({
    range: `${branca}!A${newEmptyRow}`,
    values: [[remaining.length + 1]],
  })
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: renumberData,
    },
  })
}

import { getSheetsClient } from "./google-auth"

const CONFIG_SHEET_ID = process.env.APP_CONFIG_SHEET_ID!
const LOG_SHEET = "Log"
const HEADERS = ["Timestamp", "Tipo", "Route", "Branca", "Utente", "Messaggio", "Stack"]

export type LogTipo = "Drive" | "Sheets" | "Auth" | "App"

export interface LogEntry {
  timestamp: string
  tipo: string
  route: string
  branca: string
  utente: string
  messaggio: string
  stack: string
}

function rowToEntry(row: string[]): LogEntry {
  return {
    timestamp: row[0] || "",
    tipo:      row[1] || "",
    route:     row[2] || "",
    branca:    row[3] || "",
    utente:    row[4] || "",
    messaggio: row[5] || "",
    stack:     row[6] || "",
  }
}

async function ensureLogSheet(): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: CONFIG_SHEET_ID })
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === LOG_SHEET)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: CONFIG_SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: LOG_SHEET } } }],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG_SHEET_ID,
    range: `${LOG_SHEET}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  })
}

export async function logError(params: {
  tipo?: LogTipo
  route?: string
  branca?: string
  utente?: string
  messaggio: string
  stack?: string
}): Promise<void> {
  try {
    await ensureLogSheet()
    const sheets = getSheetsClient()
    const ts = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG_SHEET_ID,
      range: `${LOG_SHEET}!A:G`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          ts,
          params.tipo || "App",
          params.route || "",
          params.branca || "",
          params.utente || "",
          params.messaggio,
          params.stack || "",
        ]],
      },
    })
  } catch {
    // logging non deve mai bloccare l'app
    console.error("[logger] impossibile scrivere log:", params.messaggio)
  }
}

export async function getAllLogs(): Promise<LogEntry[]> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG_SHEET_ID,
      range: `${LOG_SHEET}!A:G`,
    })
    const rows = (res.data.values || []) as string[][]
    // riga 0 = header, rest = dati (più recenti alla fine → invertiti per display)
    return rows.slice(1).reverse().map(rowToEntry)
  } catch {
    return []
  }
}

export async function getRecentLogs(n: number): Promise<LogEntry[]> {
  const all = await getAllLogs()
  return all.slice(0, n)
}

export async function clearLogs(): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.clear({
    spreadsheetId: CONFIG_SHEET_ID,
    range: `${LOG_SHEET}!A2:G`,
  })
}

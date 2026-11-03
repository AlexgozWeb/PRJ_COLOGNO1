// Impostazioni e permessi del chatbot. Tutto isolato: per disinstallare la funzione si elimina src/features/chatbot.
import { unstable_cache, revalidateTag } from "next/cache"
import { getSheetsClient } from "@/lib/google-auth"
import { isAdmin } from "@/lib/config"

const CONFIG_SHEET_ID = process.env.APP_CONFIG_SHEET_ID!
const SETTING_KEY = "chatbot_abilitato"
const USER_COLUMN_INDEX = 8 // colonna I "Chatbot_AI" del foglio Permessi

const isTrue = (v: unknown) => ["TRUE", "✅"].includes(String(v ?? "").trim().toUpperCase())

const MODEL_KEY = "chatbot_modello"
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash"

const readSetting = unstable_cache(
  async (key: string): Promise<string> => {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: CONFIG_SHEET_ID, range: "Impostazioni!A:B" })
    const rows = (res.data.values || []) as string[][]
    const row = rows.find(r => r[0]?.trim().toLowerCase() === key)
    return String(row?.[1] ?? "").trim()
  },
  ["chatbot-setting"],
  { revalidate: 10, tags: ["chatbot"] }
)

async function writeSetting(key: string, value: string): Promise<void> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: CONFIG_SHEET_ID, range: "Impostazioni!A:A" })
  const rows = (res.data.values || []) as string[][]
  const idx = rows.findIndex(r => r[0]?.trim().toLowerCase() === key)
  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: CONFIG_SHEET_ID,
      range: "Impostazioni!A:B",
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG_SHEET_ID,
      range: `Impostazioni!B${idx + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[value]] },
    })
  }
  revalidateTag("chatbot", { expire: 0 })
}

export async function getChatbotEnabled(): Promise<boolean> {
  return isTrue(await readSetting(SETTING_KEY))
}

export const setChatbotEnabled = (enabled: boolean) => writeSetting(SETTING_KEY, enabled ? "TRUE" : "FALSE")

export async function getChatbotModel(): Promise<string> {
  try {
    return (await readSetting(MODEL_KEY)) || DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}

export const setChatbotModel = (model: string) => writeSetting(MODEL_KEY, model)

// Modelli Gemini disponibili per la chiave in uso (interrogando l'API di Google)
export const listChatbotModels = unstable_cache(
  async (): Promise<string[]> => {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
    })
    if (!res.ok) throw new Error(`ListModels ${res.status}`)
    const data = await res.json()
    const excluded = /tts|image|embed|live|audio|robotics|computer|aqa|imagen|veo|learnlm/i
    return (data.models || [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
        m.name.startsWith("models/gemini") && m.supportedGenerationMethods?.includes("generateContent") && !excluded.test(m.name))
      .map((m: { name: string }) => m.name.replace("models/", ""))
      .sort()
  },
  ["chatbot-models"],
  { revalidate: 3600, tags: ["chatbot-models"] }
)

export async function setChatbotUser(email: string, enabled: boolean): Promise<boolean> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: CONFIG_SHEET_ID, range: "Permessi!A:A" })
  const rows = (res.data.values || []) as string[][]
  const idx = rows.findIndex((r, i) => i > 0 && r[0]?.trim().toLowerCase() === email.trim().toLowerCase())
  if (idx === -1) return false
  await sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG_SHEET_ID,
    range: `Permessi!I${idx + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[enabled]] },
  })
  revalidateTag("chatbot", { expire: 0 })
  return true
}

export const getChatbotUsers = unstable_cache(
  async (): Promise<string[]> => {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: CONFIG_SHEET_ID, range: "Permessi!A:I" })
    const rows = (res.data.values || []) as string[][]
    return rows
      .slice(1)
      .filter(r => r[0] && isTrue(r[USER_COLUMN_INDEX]))
      .map(r => r[0].trim().toLowerCase())
  },
  ["chatbot-users"],
  { revalidate: 30, tags: ["chatbot"] }
)

// Interruttore generale acceso, e utente admin oppure abilitato nella colonna Chatbot_AI
export async function canUseChatbot(email: string): Promise<boolean> {
  try {
    if (!(await getChatbotEnabled())) return false
    if (await isAdmin(email)) return true
    return (await getChatbotUsers()).includes(email.trim().toLowerCase())
  } catch {
    return false
  }
}

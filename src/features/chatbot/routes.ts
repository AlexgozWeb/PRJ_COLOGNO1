import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/config"
import { logError } from "@/lib/logger"
import { canUseChatbot, setChatbotEnabled, setChatbotModel, setChatbotUser } from "./settings"
import { runChat, testModel } from "./agent"

const MAX_MESSAGES = 12
const MAX_CHARS = 2000

type Msg = { role: "user" | "assistant"; content: string }

export async function handleChat(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return Response.json({ error: "Non autorizzato" }, { status: 401 })
  if (!(await canUseChatbot(email))) return Response.json({ error: "Chatbot non abilitato" }, { status: 403 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "Chatbot non configurato" }, { status: 503 })

  try {
    const body = await req.json()
    const raw: Partial<Msg>[] = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : []
    const messages: Msg[] = raw
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as Msg["role"], content: (m.content as string).slice(0, MAX_CHARS) }))
    if (messages.length === 0 || messages[messages.length - 1].role !== "user")
      return Response.json({ error: "Messaggio mancante" }, { status: 400 })

    const reply = await runChat(messages)
    return Response.json({ reply })
  } catch (e) {
    await logError({ tipo: "App", route: "POST /api/chatbot", messaggio: e instanceof Error ? e.message : "Errore interno", stack: e instanceof Error ? e.stack : undefined })
    return Response.json({ error: "Il chatbot non è riuscito a rispondere. Riprova tra poco." }, { status: 500 })
  }
}

export async function handleUsers(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email || !(await isAdmin(email))) return Response.json({ error: "Non autorizzato" }, { status: 401 })
  const { email: target, enabled } = await req.json()
  if (typeof target !== "string" || typeof enabled !== "boolean") return Response.json({ error: "Valore non valido" }, { status: 400 })
  try {
    if (!(await setChatbotUser(target, enabled))) return Response.json({ error: "Utente non trovato nel foglio Permessi" }, { status: 404 })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: "POST /api/chatbot/users", messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return Response.json({ error: msg.slice(0, 200) }, { status: 500 })
  }
}

export async function handleSettings(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email || !(await isAdmin(email))) return Response.json({ error: "Non autorizzato" }, { status: 401 })
  const { enabled, model } = await req.json()
  if (typeof enabled === "boolean") {
    await setChatbotEnabled(enabled)
  } else if (typeof model === "string" && /^[a-z0-9][a-z0-9.\-]{1,60}$/.test(model)) {
    if (!process.env.GEMINI_API_KEY) return Response.json({ error: "GEMINI_API_KEY non configurata" }, { status: 503 })
    try {
      await testModel(model)
    } catch (e) {
      const dettaglio = e instanceof Error ? e.message : "errore sconosciuto"
      return Response.json({ error: `Il modello non risponde: ${dettaglio}`.slice(0, 300) }, { status: 422 })
    }
    await setChatbotModel(model)
  } else {
    return Response.json({ error: "Valore non valido" }, { status: 400 })
  }
  return Response.json({ success: true })
}

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName } from "@/lib/config"
import {
  getOrCreateNotaFolder,
  findNotaFolder,
  uploadAllegato,
  listAllegati,
  parseAnnoFromFileName,
} from "@/lib/drive"
import { Branca } from "@/types"

const BRANCHE_VALIDE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "application/pdf"])
const MAX_SIZE = 1 * 1024 * 1024 // 1 MB

function errResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}

async function checkAuth(branca: Branca, requireWrite = false) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const email = session.user.email
  const admin = await isAdmin(email)
  if (admin) return { email, isAdmin: true }
  if (requireWrite) {
    const permessi = await getUserPermessi(email)
    if (!permessi[branca]) return null
  }
  return { email, isAdmin: false }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string }> }
) {
  try {
    const { branca, idNota } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)
    const auth = await checkAuth(branca as Branca)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const spreadsheetName = await getAnnoAttivoName(config.annoAttivo)
    const annoFolder = parseAnnoFromFileName(spreadsheetName)
    if (!annoFolder) return Response.json({ allegati: [] })

    const folderId = await findNotaFolder(branca as Branca, idNota, annoFolder)
    if (!folderId) return Response.json({ allegati: [] })

    const allegati = await listAllegati(folderId)
    return Response.json({ allegati })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string }> }
) {
  try {
    const { branca, idNota } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)
    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return errResponse("File mancante", 400)

    if (!ALLOWED_MIME.has(file.type)) return errResponse("Tipo file non ammesso (solo JPG, PNG, PDF)", 400)
    if (file.size > MAX_SIZE) return errResponse("File troppo grande (max 1 MB)", 400)

    const spreadsheetName = await getAnnoAttivoName(config.annoAttivo)
    const annoFolder = parseAnnoFromFileName(spreadsheetName)
    if (!annoFolder) return errResponse("Impossibile determinare l'anno dal file attivo")

    const folderId = await getOrCreateNotaFolder(branca as Branca, idNota, annoFolder)
    const buffer = Buffer.from(await file.arrayBuffer())
    const allegato = await uploadAllegato(folderId, file.name, file.type, buffer)

    return Response.json({ success: true, allegato })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

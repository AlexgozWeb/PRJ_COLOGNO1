import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName } from "@/lib/config"
import { uploadAllegato, listAllegati, deleteAllegato, parseAnnoFromFileName } from "@/lib/blob"
import { logError } from "@/lib/logger"
import { setAllegatiFlag } from "@/lib/sheets"
import { Branca } from "@/types"

const BRANCHE_VALIDE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "application/pdf"])

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

async function getAnno(annoAttivoId: string): Promise<string | null> {
  const name = await getAnnoAttivoName(annoAttivoId)
  const anno = parseAnnoFromFileName(name)
  return anno || null
}

// Un errore sul flag non deve annullare un'operazione sugli allegati già riuscita
async function syncAllegatiFlag(spreadsheetId: string, branca: Branca, idNota: string, value: boolean) {
  try {
    await setAllegatiFlag(spreadsheetId, branca, idNota, value)
  } catch (e) {
    await logError({ tipo: "Sheets", route: `allegati flag ${branca}/${idNota}`, branca, messaggio: `Aggiornamento colonna Allegati fallito: ${e instanceof Error ? e.message : "errore"}`, stack: e instanceof Error ? e.stack : undefined })
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string }> }
) {
  const { branca, idNota } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)
    const auth = await checkAuth(branca as Branca)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const anno = await getAnno(config.annoAttivo)
    if (!anno) return Response.json({ allegati: [] })

    const allegati = await listAllegati(anno, branca as Branca, idNota)
    return Response.json({ allegati })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "App", route: `GET /api/allegati/${branca}/${idNota}`, branca, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string }> }
) {
  const { branca, idNota } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)
    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return errResponse("File mancante", 400)

    if (!ALLOWED_MIME.has(file.type)) return errResponse("Tipo file non ammesso (solo JPG, PNG, PDF)", 400)
    if (file.size > config.maxAttachmentSizeMb * 1024 * 1024)
      return errResponse(`File troppo grande (max ${config.maxAttachmentSizeMb} MB)`, 400)

    const anno = await getAnno(config.annoAttivo)
    if (!anno) return errResponse("Impossibile determinare l'anno dal file attivo")

    const buffer = Buffer.from(await file.arrayBuffer())
    const allegato = await uploadAllegato(anno, branca as Branca, idNota, file.name, file.type, buffer)
    await syncAllegatiFlag(config.annoAttivo, branca as Branca, idNota, true)

    return Response.json({ success: true, allegato })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "App", route: `POST /api/allegati/${branca}/${idNota}`, branca, messaggio: `Upload fallito: ${msg}`, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string }> }
) {
  const { branca, idNota } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)
    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const { fileUrl } = await req.json()
    if (!fileUrl) return errResponse("fileUrl mancante", 400)

    await deleteAllegato(fileUrl)

    const config = await getConfig()
    const anno = config.annoAttivo ? await getAnno(config.annoAttivo) : null
    if (anno) {
      const rimasti = await listAllegati(anno, branca as Branca, idNota)
      await syncAllegatiFlag(config.annoAttivo, branca as Branca, idNota, rimasti.length > 0)
    }
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "App", route: `DELETE /api/allegati/${branca}`, branca, messaggio: `Eliminazione allegato fallita: ${msg}`, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

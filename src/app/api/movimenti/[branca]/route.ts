import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName, getListeValori } from "@/lib/config"
import { getMovimenti, addMovimento, updateMovimento, deleteMovimento, StaleRowError } from "@/lib/sheets"
import { deleteNotaAllegati, parseAnnoFromFileName } from "@/lib/blob"
import { logError } from "@/lib/logger"
import { Branca } from "@/types"

const BRANCHE_VALIDE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']

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

function errResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}

async function inOutValido(v: unknown): Promise<boolean> {
  if (typeof v !== "string" || !v) return false
  const { inOut } = await getListeValori()
  return inOut.some(x => x.valore.toLowerCase() === v.toLowerCase())
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  const { branca } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const movimenti = await getMovimenti(config.annoAttivo, branca as Branca)
    return Response.json({ movimenti })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: `GET /api/movimenti/${branca}`, branca, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  const { branca } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const body = await req.json()
    if (!(await inOutValido(body.inOut))) return errResponse("In/Out obbligatorio (scegli un valore della lista)", 400)
    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const { idNota } = await addMovimento(config.annoAttivo, branca as Branca, body)
    return Response.json({ success: true, idNota })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: `POST /api/movimenti/${branca}`, branca, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  const { branca } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const { rowNumber, ...data } = await req.json()
    if (!rowNumber) return errResponse("rowNumber mancante", 400)
    if (!(await inOutValido(data.inOut))) return errResponse("In/Out obbligatorio (scegli un valore della lista)", 400)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await updateMovimento(config.annoAttivo, branca as Branca, rowNumber, data)
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: `PUT /api/movimenti/${branca}`, branca, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  const { branca } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const { rowNumber, idNota } = await req.json()
    if (!rowNumber) return errResponse("rowNumber mancante", 400)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await deleteMovimento(config.annoAttivo, branca as Branca, rowNumber, idNota || undefined)

    let warning: string | undefined
    if (idNota) {
      try {
        const spreadsheetName = await getAnnoAttivoName(config.annoAttivo)
        const annoFolder = parseAnnoFromFileName(spreadsheetName)
        if (annoFolder) await deleteNotaAllegati(annoFolder, branca as Branca, idNota)
      } catch (e) {
        warning = `Nota eliminata, ma gli allegati (${idNota}) non sono stati rimossi da Vercel Blob. Contatta l'amministratore.`
        await logError({ tipo: "App", route: `DELETE /api/movimenti/${branca}`, branca, messaggio: `Eliminazione allegati blob fallita per ${idNota}`, stack: e instanceof Error ? e.stack : undefined })
      }
    }

    return Response.json({ success: true, warning })
  } catch (e) {
    if (e instanceof StaleRowError) return errResponse(e.message, 409)
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: `DELETE /api/movimenti/${branca}`, branca, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getUserPermessi } from "@/lib/config"
import { getMovimenti, addMovimento, updateMovimento, deleteMovimento } from "@/lib/sheets"
import { Branca } from "@/types"

const BRANCHE_VALIDE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa']

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
  console.error(`[movimenti API] ${msg}`)
  return Response.json({ error: msg }, { status })
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  try {
    const { branca } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca)
    if (!auth) return errResponse("Non autorizzato", 401)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    const movimenti = await getMovimenti(config.annoAttivo, branca as Branca)
    return Response.json({ movimenti })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  try {
    const { branca } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const body = await req.json()
    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await addMovimento(config.annoAttivo, branca as Branca, body)
    return Response.json({ success: true })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  try {
    const { branca } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const { rowNumber, ...data } = await req.json()
    if (!rowNumber) return errResponse("rowNumber mancante", 400)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await updateMovimento(config.annoAttivo, branca as Branca, rowNumber, data)
    return Response.json({ success: true })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<'/api/movimenti/[branca]'>
) {
  try {
    const { branca } = await ctx.params
    if (!BRANCHE_VALIDE.includes(branca as Branca))
      return errResponse("Branca non valida", 400)

    const auth = await checkAuth(branca as Branca, true)
    if (!auth) return errResponse("Non autorizzato", 401)

    const { rowNumber } = await req.json()
    if (!rowNumber) return errResponse("rowNumber mancante", 400)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await deleteMovimento(config.annoAttivo, branca as Branca, rowNumber)
    return Response.json({ success: true })
  } catch (e) {
    return errResponse(e instanceof Error ? e.message : "Errore interno")
  }
}

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, getConfig, getAnnoAttivoName } from "@/lib/config"
import { listAllegatiCancellati, parseAnnoFromFileName } from "@/lib/blob"
import { logError } from "@/lib/logger"

function errResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}

// Allegati archiviati in allegati/{anno}/cancellazioni/{idNota}/ (solo admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !(await isAdmin(session.user.email))) return errResponse("Non autorizzato", 401)

    const idNota = req.nextUrl.searchParams.get("idNota") || ""
    if (!/^[A-Za-z0-9_-]+$/.test(idNota)) return errResponse("ID nota non valido", 400)

    const config = await getConfig()
    const fileId = req.nextUrl.searchParams.get("fileId") || config.annoAttivo
    if (!fileId) return errResponse("Anno non configurato")

    const anno = parseAnnoFromFileName(await getAnnoAttivoName(fileId))
    if (!anno) return Response.json({ allegati: [] })

    return Response.json({ allegati: await listAllegatiCancellati(anno, idNota) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "App", route: "GET /api/storico/allegati", messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

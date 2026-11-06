import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getAnnoAttivoName } from "@/lib/config"
import { deleteStoricoRow, StaleRowError } from "@/lib/sheets"
import { deleteArchivedAllegati, parseAnnoFromFileName } from "@/lib/blob"
import { logError } from "@/lib/logger"

function errResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}

// Cancellazione definitiva di una nota dallo storico e dei suoi allegati archiviati (solo admin, solo annata attiva)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !(await isAdmin(session.user.email))) return errResponse("Non autorizzato", 401)

    const { rowNumber, idNota } = await req.json()
    if (!Number.isInteger(rowNumber) || rowNumber < 4) return errResponse("Riga non valida", 400)
    if (typeof idNota !== "string" || !/^[A-Za-z0-9_-]+$/.test(idNota)) return errResponse("ID nota non valido", 400)

    const config = await getConfig()
    if (!config.annoAttivo) return errResponse("Anno attivo non configurato")

    await deleteStoricoRow(config.annoAttivo, rowNumber, idNota)

    let warning: string | undefined
    try {
      const anno = parseAnnoFromFileName(await getAnnoAttivoName(config.annoAttivo))
      if (anno) await deleteArchivedAllegati(anno, idNota)
    } catch (e) {
      warning = `Nota eliminata, ma gli allegati (${idNota}) non sono stati rimossi dall'archivio cancellazioni. Contatta l'amministratore.`
      await logError({ tipo: "App", route: "DELETE /api/storico", messaggio: `Eliminazione allegati archiviati fallita per ${idNota}`, stack: e instanceof Error ? e.stack : undefined })
    }
    return Response.json({ success: true, warning })
  } catch (e) {
    if (e instanceof StaleRowError) return errResponse(e.message, 409)
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: "DELETE /api/storico", messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

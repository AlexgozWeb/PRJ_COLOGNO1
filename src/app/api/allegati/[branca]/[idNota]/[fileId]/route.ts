import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, getUserPermessi } from "@/lib/config"
import { deleteAllegato } from "@/lib/drive"
import { logError } from "@/lib/logger"
import { Branca } from "@/types"

const BRANCHE_VALIDE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']

function errResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ branca: string; idNota: string; fileId: string }> }
) {
  const { branca, fileId } = await ctx.params
  try {
    if (!BRANCHE_VALIDE.includes(branca as Branca)) return errResponse("Branca non valida", 400)

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return errResponse("Non autorizzato", 401)

    const email = session.user.email
    const admin = await isAdmin(email)
    if (!admin) {
      const permessi = await getUserPermessi(email)
      if (!permessi[branca as Branca]) return errResponse("Non autorizzato", 401)
    }

    await deleteAllegato(fileId)
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Drive", route: `DELETE /api/allegati/${branca}/${fileId}`, branca, messaggio: `Eliminazione allegato fallita: ${msg}`, stack: e instanceof Error ? e.stack : undefined })
    return errResponse(msg)
  }
}

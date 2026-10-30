import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { addValoreLista, deleteValoreLista, isAdmin, setColoriListeValori } from "@/lib/config"
import { logError } from "@/lib/logger"

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const admin = await isAdmin(session.user.email)
  return admin ? session.user.email : null
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { colonna, valore, textColor, bgColor } = await req.json()
    if (typeof colonna !== "string" || typeof valore !== "string") {
      return Response.json({ error: "Dati non validi" }, { status: 400 })
    }
    await addValoreLista({ colonna, valore, textColor: textColor || "", bgColor: bgColor || "" })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: "POST /api/admin/liste-valori", utente: admin, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { riga, colonna, valore } = await req.json()
    if (typeof riga !== "number" || typeof colonna !== "string" || typeof valore !== "string") {
      return Response.json({ error: "Dati non validi" }, { status: 400 })
    }
    await deleteValoreLista({ riga, colonna, valore })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: "DELETE /api/admin/liste-valori", utente: admin, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { updates } = await req.json()
    if (!Array.isArray(updates)) return Response.json({ error: "Dati non validi" }, { status: 400 })
    await setColoriListeValori(updates)
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno"
    await logError({ tipo: "Sheets", route: "PUT /api/admin/liste-valori", utente: admin, messaggio: msg, stack: e instanceof Error ? e.stack : undefined })
    return Response.json({ error: msg }, { status: 500 })
  }
}

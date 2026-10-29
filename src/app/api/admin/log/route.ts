import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/config"
import { getAllLogs, clearLogs } from "@/lib/logger"

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const admin = await isAdmin(session.user.email)
  return admin ? session.user.email : null
}

export async function GET(_req: NextRequest) {
  try {
    const email = await checkAdmin()
    if (!email) return Response.json({ error: "Non autorizzato" }, { status: 401 })
    const logs = await getAllLogs()
    return Response.json({ logs })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const email = await checkAdmin()
    if (!email) return Response.json({ error: "Non autorizzato" }, { status: 401 })
    await clearLogs()
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 500 })
  }
}

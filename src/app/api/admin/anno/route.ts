import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, setAnnoAttivo } from "@/lib/config"

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return false
  return isAdmin(session.user.email)
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const { fileId } = await req.json()
  if (!fileId) return Response.json({ error: "fileId mancante" }, { status: 400 })

  await setAnnoAttivo(fileId)
  return Response.json({ success: true })
}

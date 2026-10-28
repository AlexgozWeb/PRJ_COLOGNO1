import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, getPermessi, setPermessi } from "@/lib/config"
import { Branca } from "@/types"

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const admin = await isAdmin(session.user.email)
  return admin ? session.user.email : null
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const permessi = await getPermessi()
  return Response.json({ permessi })
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const { email, branche }: { email: string; branche: Partial<Record<Branca, boolean>> } = await req.json()
  if (!email) return Response.json({ error: "Email mancante" }, { status: 400 })

  await setPermessi(email, branche)
  return Response.json({ success: true })
}

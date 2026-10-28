import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getConfig, isAdmin, getUserPermessi } from "@/lib/config"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const email = session.user.email
  const [config, admin, permessi] = await Promise.all([
    getConfig(),
    isAdmin(email),
    getUserPermessi(email),
  ])

  return Response.json({
    annoAttivo: config.annoAttivo,
    isAdmin: admin,
    permessi,
  })
}

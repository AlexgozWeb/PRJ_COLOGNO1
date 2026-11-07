export const instant = false

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  await connection()
  const session = await getServerSession(authOptions)
  redirect(session ? "/dashboard" : "/login")
}

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return Response.json({ error: "url mancante" }, { status: 400 })

  // Accetta solo URL del blob store Vercel
  if (!url.includes("vercel-storage.com") && !url.includes("blob.vercel.app")) {
    return Response.json({ error: "URL non valido" }, { status: 400 })
  }

  const filename = decodeURIComponent(url.split("/").pop() || "allegato")

  const upstream = await fetch(url)
  if (!upstream.ok) return Response.json({ error: "File non trovato" }, { status: 404 })

  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  const buffer = await upstream.arrayBuffer()

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

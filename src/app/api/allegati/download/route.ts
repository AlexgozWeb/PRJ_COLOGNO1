import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return Response.json({ error: "url mancante" }, { status: 400 })

  // Accetta solo URL https del blob store Vercel, nella cartella degli allegati
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Response.json({ error: "URL non valido" }, { status: 400 })
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
    !parsed.pathname.startsWith("/allegati/")
  ) {
    return Response.json({ error: "URL non valido" }, { status: 400 })
  }

  let filename = "allegato"
  try {
    filename = decodeURIComponent(parsed.pathname.split("/").pop() || "allegato")
  } catch {}
  const asciiName = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\;]/g, "_")

  const upstream = await fetch(parsed.toString(), { redirect: "manual" })
  if (!upstream.ok) return Response.json({ error: "File non trovato" }, { status: 404 })

  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  const buffer = await upstream.arrayBuffer()

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

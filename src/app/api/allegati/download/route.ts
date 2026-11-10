import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { get } from "@vercel/blob"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/config"

const INLINE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"])

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return Response.json({ error: "Non autorizzato" }, { status: 401 })

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return Response.json({ error: "url mancante" }, { status: 400 })

  // Accetta solo URL https del blob store privato Vercel, nella cartella degli allegati
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Response.json({ error: "URL non valido" }, { status: 400 })
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".private.blob.vercel-storage.com") ||
    !parsed.pathname.startsWith("/allegati/") ||
    parsed.pathname.includes("..")
  ) {
    return Response.json({ error: "URL non valido" }, { status: 400 })
  }

  // Gli allegati delle note cancellate (archivio) sono visibili solo agli admin
  if (/^\/allegati\/[^/]+\/cancellazioni\//.test(parsed.pathname) && !(await isAdmin(session.user.email))) {
    return Response.json({ error: "Non autorizzato" }, { status: 403 })
  }

  let filename = "allegato"
  try {
    filename = decodeURIComponent(parsed.pathname.split("/").pop() || "allegato")
  } catch {}
  const asciiName = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\;]/g, "_")

  let result
  try {
    result = await get(parsed.toString(), { access: "private" })
  } catch {
    return Response.json({ error: "File non trovato" }, { status: 404 })
  }
  if (!result || result.statusCode !== 200) return Response.json({ error: "File non trovato" }, { status: 404 })

  // Solo i tipi ammessi in upload possono essere mostrati nel browser; il resto è sempre scaricato
  const contentType = result.blob.contentType || "application/octet-stream"
  const inline = req.nextUrl.searchParams.get("inline") === "1" && INLINE_TYPES.has(contentType)

  return new Response(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
}

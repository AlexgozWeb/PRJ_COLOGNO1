"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LogEntry } from "@/lib/logger"

interface Props {
  logs: LogEntry[]
}

export default function LogActions({ logs }: Props) {
  const router = useRouter()
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function downloadCsv() {
    const headers = ["Timestamp", "Tipo", "Route", "Branca", "Utente", "Messaggio", "Stack"]
    const rows = logs.map(l => [
      l.timestamp, l.tipo, l.route, l.branca, l.utente,
      l.messaggio.replace(/"/g, '""'),
      (l.stack || "").replace(/"/g, '""').replace(/\n/g, " "),
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(","))
      .join("\n")

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `log_errori_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearLog() {
    if (!confirm("Sei sicuro di voler cancellare tutti i log? L'operazione non è reversibile.")) return
    setClearing(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/log", { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error || "Errore")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore")
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      {logs.length > 0 && (
        <button
          onClick={downloadCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          ⬇ Scarica CSV
        </button>
      )}
      <button
        onClick={clearLog}
        disabled={clearing || logs.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {clearing ? "Cancellazione…" : "🗑 Svuota log"}
      </button>
    </div>
  )
}

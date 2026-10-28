"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface Bilancio {
  id: string
  name: string
}

interface Props {
  bilanci: Bilancio[]
  annoAttivoId: string
  annoAttivoName: string
}

export default function AnnoAttivoSelector({ bilanci, annoAttivoId, annoAttivoName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState(annoAttivoId)

  async function handleChange(fileId: string) {
    if (fileId === annoAttivoId) return
    setSelected(fileId)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/anno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Errore nel salvataggio")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto")
      setSelected(annoAttivoId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {annoAttivoName && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Anno corrente:</span>
          <span className="text-sm font-semibold text-blue-700">{annoAttivoName}</span>
        </div>
      )}

      {bilanci.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Nessun file Bilancio trovato su Drive. Assicurati che il Service Account abbia accesso ai file.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <select
            value={selected}
            onChange={e => handleChange(e.target.value)}
            disabled={saving || isPending}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="" disabled>Seleziona anno bilancio…</option>
            {bilanci.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {(saving || isPending) && (
            <span className="text-xs text-blue-600 whitespace-nowrap">Salvataggio…</span>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

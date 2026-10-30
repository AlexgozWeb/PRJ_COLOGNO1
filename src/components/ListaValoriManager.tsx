"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { RigaListaValori, PaletteColori } from "@/lib/config"

interface Props {
  righe: RigaListaValori[]
  palette: PaletteColori
}

const COLONNE: { key: RigaListaValori["colonna"]; titolo: string }[] = [
  { key: "inOut", titolo: "In/Out" },
  { key: "modalita", titolo: "Modalità" },
  { key: "fondo", titolo: "Fondo" },
]

type Colori = { textColor: string; bgColor: string }

function ColorSelect({ value, palette, onChange, label }: {
  value: string
  palette: string[]
  onChange: (v: string) => void
  label: string
}) {
  // Un colore del foglio fuori elenco viene aggiunto, così la selezione iniziale resta fedele
  const known = !value || palette.some(hex => hex.toLowerCase() === value.toLowerCase())
  const options = known ? palette : [...palette, value]
  const current = options.find(hex => hex.toLowerCase() === value.toLowerCase()) ?? ""

  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block w-4 h-4 rounded border border-slate-300 dark:border-slate-500 flex-shrink-0"
        style={{ backgroundColor: value || "transparent" }}
      />
      <select
        aria-label={label}
        value={current}
        onChange={e => onChange(e.target.value)}
        className="text-xs border border-slate-200 dark:border-slate-600 rounded-md px-1 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 max-w-[140px]"
      >
        <option value="">Nessun colore</option>
        {options.map(hex => <option key={hex} value={hex} style={{ backgroundColor: hex }}>{hex.toUpperCase()}</option>)}
      </select>
    </div>
  )
}

export default function ListaValoriManager({ righe, palette }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState<Record<number, Colori>>(
    () => Object.fromEntries(righe.map(r => [r.riga, { textColor: r.textColor, bgColor: r.bgColor }]))
  )
  const [draft, setDraft] = useState<Record<number, Colori>>(saved)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const colori = (r: RigaListaValori): Colori => draft[r.riga] ?? { textColor: r.textColor, bgColor: r.bgColor }
  const changed = righe.filter(r => {
    const a = saved[r.riga] ?? { textColor: r.textColor, bgColor: r.bgColor }, b = colori(r)
    return a.textColor !== b.textColor || a.bgColor !== b.bgColor
  })

  const [nuovo, setNuovo] = useState<Record<string, { valore: string } & Colori>>({})
  const [adding, setAdding] = useState<string | null>(null)
  const nuovoDi = (k: string) => nuovo[k] ?? { valore: "", textColor: "", bgColor: "" }

  async function handleAdd(colonna: string) {
    const n = nuovoDi(colonna)
    setAdding(colonna)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/liste-valori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colonna, ...n }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Errore nel salvataggio (HTTP ${res.status})`)
      }
      setNuovo(s => ({ ...s, [colonna]: { valore: "", textColor: "", bgColor: "" } }))
      setMessage({ ok: true, text: `Valore "${n.valore.trim()}" aggiunto.` })
      router.refresh()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Errore sconosciuto" })
    } finally {
      setAdding(null)
    }
  }

  async function handleDelete(r: RigaListaValori) {
    if (!window.confirm(`Eliminare il valore "${r.valore}" dalla lista ${COLONNE.find(c => c.key === r.colonna)?.titolo}?\n\nLe note già salvate con questo valore non vengono modificate.`)) return
    setMessage(null)
    try {
      const res = await fetch("/api/admin/liste-valori", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riga: r.riga, colonna: r.colonna, valore: r.valore }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Errore nell'eliminazione (HTTP ${res.status})`)
      }
      setMessage({ ok: true, text: `Valore "${r.valore}" eliminato.` })
      router.refresh()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Errore sconosciuto" })
    }
  }

  function setColor(riga: number, field: keyof Colori, value: string) {
    setMessage(null)
    setDraft(d => ({ ...d, [riga]: { ...colori(righe.find(r => r.riga === riga)!), ...d[riga], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/liste-valori", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: changed.map(r => ({
            riga: r.riga, colonna: r.colonna, valore: r.valore, ...colori(r),
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Errore nel salvataggio (HTTP ${res.status})`)
      }
      setSaved(s => ({ ...s, ...Object.fromEntries(changed.map(r => [r.riga, colori(r)])) }))
      setMessage({ ok: true, text: "Salvato. Le modifiche saranno visibili agli utenti entro pochi secondi." })
      router.refresh()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Errore sconosciuto" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COLONNE.map(col => (
          <div key={col.key}>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{col.titolo}</h3>
            <ul className="space-y-2">
              {righe.filter(r => r.colonna === col.key).map(r => {
                const c = colori(r)
                const hasColor = c.textColor || c.bgColor
                return (
                  <li key={r.riga} className="flex flex-col gap-1 border border-slate-100 dark:border-slate-700 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span
                        style={hasColor ? { color: c.textColor || undefined, backgroundColor: c.bgColor || undefined } : undefined}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasColor ? "" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
                      >
                        {r.valore}
                      </span>
                      {col.key !== "inOut" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          title="Elimina valore"
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ColorSelect label={`Testo ${r.valore}`} value={c.textColor} palette={palette.testo} onChange={v => setColor(r.riga, "textColor", v)} />
                      <ColorSelect label={`Sfondo ${r.valore}`} value={c.bgColor} palette={palette.sfondo} onChange={v => setColor(r.riga, "bgColor", v)} />
                    </div>
                  </li>
                )
              })}
            </ul>
            {col.key !== "inOut" && (() => {
              const n = nuovoDi(col.key)
              const hasColor = n.textColor || n.bgColor
              return (
                <div className="mt-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-2 flex flex-col gap-2">
                  <input
                    type="text"
                    maxLength={40}
                    placeholder={`Nuovo valore ${col.titolo}`}
                    value={n.valore}
                    onChange={e => setNuovo(s => ({ ...s, [col.key]: { ...n, valore: e.target.value } }))}
                    className="text-sm border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <ColorSelect label={`Testo nuovo ${col.titolo}`} value={n.textColor} palette={palette.testo} onChange={v => setNuovo(s => ({ ...s, [col.key]: { ...n, textColor: v } }))} />
                    <ColorSelect label={`Sfondo nuovo ${col.titolo}`} value={n.bgColor} palette={palette.sfondo} onChange={v => setNuovo(s => ({ ...s, [col.key]: { ...n, bgColor: v } }))} />
                    <button
                      type="button"
                      onClick={() => handleAdd(col.key)}
                      disabled={adding !== null || !n.valore.trim()}
                      title="Aggiungi valore"
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  {n.valore.trim() && (
                    <span
                      style={hasColor ? { color: n.textColor || undefined, backgroundColor: n.bgColor || undefined } : undefined}
                      className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${hasColor ? "" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                      {n.valore.trim()}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changed.length === 0}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {saving ? "Salvataggio…" : "Salva"}
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}

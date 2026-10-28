"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Permessi, Branca, BRANCHE, BRANCA_LABELS } from "@/types"

interface Props {
  permessi: Permessi
}

export default function PermessiManager({ permessi: initialPermessi }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [permessi, setPermessi] = useState<Permessi>(initialPermessi)
  const [newEmail, setNewEmail] = useState("")
  const [saving, setSaving] = useState<string | null>(null) // email in corso di salvataggio
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function savePermessi(email: string, branche: Record<Branca, boolean>) {
    setSaving(email)
    setError(null)
    try {
      const res = await fetch("/api/admin/permessi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, branche }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Errore nel salvataggio")
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto")
    } finally {
      setSaving(null)
    }
  }

  function toggleBranca(email: string, branca: Branca) {
    const current = permessi[email] ?? emptyPermessi()
    const updated = { ...current, [branca]: !current[branca] }
    setPermessi(p => ({ ...p, [email]: updated }))
    savePermessi(email, updated)
  }

  function addUser() {
    const email = newEmail.trim().toLowerCase()
    setAddError(null)
    if (!email) return
    if (!email.includes("@")) {
      setAddError("Inserisci un indirizzo email valido.")
      return
    }
    if (permessi[email]) {
      setAddError("Utente già presente.")
      return
    }
    const empty = emptyPermessi()
    setPermessi(p => ({ ...p, [email]: empty }))
    setNewEmail("")
    savePermessi(email, empty)
  }

  return (
    <div className="space-y-4">
      {/* Aggiungi utente */}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="nuovoutente@gmail.com"
          value={newEmail}
          onChange={e => { setNewEmail(e.target.value); setAddError(null) }}
          onKeyDown={e => e.key === "Enter" && addUser()}
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
        <button
          onClick={addUser}
          disabled={!newEmail.trim() || !!saving}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Aggiungi
        </button>
      </div>
      {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Matrice permessi */}
      {Object.keys(permessi).length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nessun utente configurato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Email</th>
                {BRANCHE.map(b => (
                  <th key={b} className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">
                    {b}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Tutte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {Object.entries(permessi).map(([email, branche]) => {
                const allChecked = BRANCHE.every(b => branche[b])
                const isSaving = saving === email || isPending
                return (
                  <tr key={email} className={isSaving ? "opacity-60" : ""}>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-200 font-mono text-xs">{email}</td>
                    {BRANCHE.map(b => (
                      <td key={b} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!branche[b]}
                          onChange={() => toggleBranca(email, b)}
                          disabled={!!saving}
                          className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                          title={BRANCA_LABELS[b]}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => {
                          const all = !allChecked
                          const updated = Object.fromEntries(BRANCHE.map(b => [b, all])) as Record<Branca, boolean>
                          setPermessi(p => ({ ...p, [email]: updated }))
                          savePermessi(email, updated)
                        }}
                        disabled={!!saving}
                        className="w-4 h-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                        title="Tutte le branche"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isPending && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Aggiornamento in corso…</p>
      )}
    </div>
  )
}

function emptyPermessi(): Record<Branca, boolean> {
  return { LC: false, CdA: false, EG: false, Novi: false, Clan: false, CoCa: false }
}

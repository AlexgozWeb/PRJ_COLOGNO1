"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

async function save(body: object) {
  const res = await fetch("/api/chatbot/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "Impossibile salvare")
  }
}

export default function ChatbotAdminToggle({ initial, model: initialModel, models }: { initial: boolean; model: string; models: string[] }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial)
  const [savedModel, setSavedModel] = useState(initialModel)
  const [model, setModel] = useState(initialModel)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [ok, setOk] = useState("")
  const options = models.includes(savedModel) ? models : [savedModel, ...models]

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr("")
    setOk("")
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : "Impossibile salvare") } finally { setBusy(false) }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100">🤖 Assistente AI</p>
          <p className="text-xs text-slate-500">Chatbot per interrogare il bilancio. Utenti non admin: colonna «Chatbot_AI» del foglio Permessi.</p>
        </div>
        <button
          onClick={() => run(async () => { await save({ enabled: !enabled }); setEnabled(!enabled); router.refresh() })}
          disabled={busy}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${enabled ? "bg-green-600" : "bg-slate-400"}`}
        >
          {enabled ? "Attivo" : "Spento"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <label htmlFor="chatbot-model">Modello</label>
        <select
          id="chatbot-model"
          value={model}
          disabled={busy}
          onChange={e => { setModel(e.target.value); setErr(""); setOk("") }}
          className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-2 py-1 text-sm min-w-0"
        >
          {options.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={() => run(async () => { await save({ model }); setSavedModel(model); setOk("Modello verificato e salvato ✓") })}
          disabled={busy || model === savedModel}
          className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40"
        >
          {busy ? "Verifica…" : "Salva e verifica"}
        </button>
      </div>
      {ok && <p className="text-xs text-green-700">{ok}</p>}
      {err && <p className="text-xs text-red-600 break-words">{err}</p>}
    </div>
  )
}

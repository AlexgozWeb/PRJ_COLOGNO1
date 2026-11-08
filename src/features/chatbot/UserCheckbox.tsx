"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ChatbotUserCheckbox({ email, initial }: { email: string; initial: boolean }) {
  const router = useRouter()
  const [checked, setChecked] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function toggle() {
    const next = !checked
    setBusy(true)
    setErr("")
    setChecked(next)
    try {
      const res = await fetch("/api/chatbot/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, enabled: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Errore HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setChecked(!next)
      setErr(e instanceof Error ? e.message : "Errore")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        disabled={busy}
        className="w-4 h-4 accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
        title={err || "Abilitato all'Assistente AI"}
      />
      {err && <p className="text-[10px] text-red-600 max-w-24 break-words">{err}</p>}
    </>
  )
}

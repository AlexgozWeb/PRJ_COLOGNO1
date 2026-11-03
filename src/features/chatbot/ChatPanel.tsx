"use client"
import { useRef, useState, useEffect } from "react"
import MiniMarkdown from "./MiniMarkdown"

type Msg = { role: "user" | "assistant"; content: string }

const ESEMPI = [
  "Quanto ha speso ogni branca nell'annata attiva?",
  "Confronta entrate e uscite tra le annate",
  "Quali sono le 5 spese più alte di quest'anno?",
]

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    const next: Msg[] = [...messages, { role: "user", content }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages([...next, { role: "assistant", content: res.ok ? data.reply : `⚠️ ${data.error || "Errore"}` }])
    } catch {
      setMessages([...next, { role: "assistant", content: "⚠️ Errore di rete. Riprova." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100dvh-9rem)]">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500 space-y-2">
            <p>Fai una domanda sul bilancio. Alcuni esempi:</p>
            {ESEMPI.map(e => (
              <button key={e} onClick={() => send(e)} className="block w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">{e}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[92%] rounded-xl px-3 py-2 text-sm min-w-0 ${m.role === "user" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800"}`}>
              {m.role === "user" ? m.content : <MiniMarkdown text={m.content} />}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400">Sto cercando nei dati…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input) }} className="border-t border-slate-200 p-2 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Scrivi una domanda…"
          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading || !input.trim()} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Invia</button>
      </form>
    </div>
  )
}

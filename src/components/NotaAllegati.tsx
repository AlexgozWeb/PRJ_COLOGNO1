"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AllegatoFile, Branca } from "@/types"

interface Props {
  allegati: AllegatoFile[]
  branca: Branca
  idNota: string
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function NotaAllegati({ allegati: initial, branca, idNota }: Props) {
  const [allegati, setAllegati] = useState(initial)
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirmUrl) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/allegati/${branca}/${idNota}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: confirmUrl }),
      })
      if (res.ok) {
        setAllegati(prev => prev.filter(a => a.id !== confirmUrl))
        router.refresh()
      }
    } finally {
      setDeleting(false)
      setConfirmUrl(null)
    }
  }

  if (allegati.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nessun allegato.</p>
  }

  return (
    <>
      <ul className="space-y-2">
        {allegati.map(a => (
          <li key={a.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5">
            {/* Download */}
            <a
              href={`/api/allegati/download?url=${encodeURIComponent(a.id)}`}
              download={a.name}
              title="Scarica"
              className="flex-shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <DownloadIcon />
            </a>

            {/* Nome file */}
            <a
              href={a.id}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-slate-700 dark:text-slate-200 hover:underline truncate"
            >
              {a.mimeType === "application/pdf" ? "📄" : "🖼️"} {a.name}
            </a>

            {/* Elimina */}
            <button
              type="button"
              onClick={() => setConfirmUrl(a.id)}
              title="Elimina allegato"
              className="flex-shrink-0 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      {/* Dialogo conferma eliminazione */}
      {confirmUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Elimina allegato</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Sei sicuro di voler eliminare{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {allegati.find(a => a.id === confirmUrl)?.name}
              </span>
              ? L&apos;operazione non è reversibile.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmUrl(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

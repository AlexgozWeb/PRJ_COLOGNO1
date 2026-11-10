"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MovimentoStorico, ListeValori, ValoreLista } from "@/types"

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function chipStyle(list: ValoreLista[], v: string): React.CSSProperties | undefined {
  const x = v ? list.find(i => i.valore.toLowerCase() === v.toLowerCase()) : undefined
  if (!x || (!x.textColor && !x.bgColor)) return undefined
  return { color: x.textColor || undefined, backgroundColor: x.bgColor || undefined }
}

interface Allegato { id: string; name: string; mimeType: string }

interface Props {
  movimenti: MovimentoStorico[]
  liste: ListeValori
  fileId: string
  canDelete: boolean
}

const TH = "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide"
const EMPTY = <span className="text-slate-300 dark:text-slate-600">—</span>

export default function StoricoTable({ movimenti, liste, fileId, canDelete }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<MovimentoStorico | null>(null)
  const [toDelete, setToDelete] = useState<MovimentoStorico | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/storico", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber: toDelete.id, idNota: toDelete.idNota }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Errore nell'eliminazione (HTTP ${res.status})`)
      setToDelete(null)
      router.refresh()
      if (data.warning) window.alert(data.warning)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto")
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!selected?.idNota) return
    let cancelled = false
    fetch(`/api/storico/allegati?idNota=${encodeURIComponent(selected.idNota)}&fileId=${encodeURIComponent(fileId)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setAllegati(d.allegati || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selected?.idNota, fileId])

  function open(m: MovimentoStorico) {
    setAllegati([])
    setLoading(!!m.idNota)
    setSelected(m)
  }

  const totaleEntrate = movimenti.filter(m => m.inOut === "Entrata").reduce((s, m) => s + m.importo, 0)
  const totaleUscite = movimenti.filter(m => m.inOut === "Uscita").reduce((s, m) => s + m.importo, 0)
  const saldo = totaleEntrate - totaleUscite

  if (movimenti.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-16 text-center border border-slate-200 dark:border-slate-700">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-slate-400">Nessuna nota cancellata.</p>
      </div>
    )
  }

  const detail: [string, string][] = selected ? [
    ["Branca", selected.branca],
    ["N°", String(selected.numero)],
    ["Data", selected.data],
    ["Entrata / Uscita", selected.inOut],
    ["Modalità", selected.modalita],
    ["Fondo", selected.fondo],
    ["Codice", selected.codice === "---" ? "" : selected.codice],
    ["Descrizione", selected.note],
  ] : []

  const audit: [string, string][] = selected ? [
    ["Creato da", selected.creatoDa],
    ["Creato il", selected.creatoIl],
    ["Modificato da", selected.modificatoDa],
    ["Modificato il", selected.modificatoIl],
    ["Cancellato da", selected.cancellatoDa],
    ["Cancellato il", selected.cancellatoIl],
  ] : []

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-xs min-w-[780px]">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className={TH}>#</th>
              <th className={TH}>Branca</th>
              <th className={`${TH} whitespace-nowrap`}>ID Nota</th>
              <th className={TH}>Data</th>
              <th className={TH}>In/Out</th>
              <th className={TH}>Modalità</th>
              <th className={TH}>Fondo</th>
              <th className={`${TH} text-right`}>Importo</th>
              <th className={TH}>Codice</th>
              <th className={TH}>Note</th>
              <th className={`px-3 py-3 ${canDelete ? "w-16" : "w-14"}`}></th>
            </tr>
          </thead>
          <tbody>
            {movimenti.map((m, idx) => (
              <tr key={m.id} className={`border-t border-slate-100 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-700/50"}`}>
                <td className="px-3 py-3 text-slate-400 dark:text-slate-500 font-mono">{m.numero}</td>
                <td className="px-3 py-3 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">{m.branca || EMPTY}</td>
                <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">{m.idNota || EMPTY}</td>
                <td className="px-3 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap font-medium">{m.data}</td>
                <td className="px-3 py-3">
                  {m.inOut ? (
                    <span
                      style={chipStyle(liste.inOut, m.inOut)}
                      className={`font-semibold px-2 py-0.5 rounded-full ${
                        chipStyle(liste.inOut, m.inOut)
                          ? ""
                          : m.inOut === "Entrata"
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {m.inOut === "Entrata" ? "↑" : "↓"} {m.inOut}
                    </span>
                  ) : EMPTY}
                </td>
                <td className="px-3 py-3">
                  {m.modalita ? (
                    <span
                      style={chipStyle(liste.modalita, m.modalita)}
                      className={`font-semibold px-2 py-0.5 rounded-full ${chipStyle(liste.modalita, m.modalita) ? "" : "text-slate-600 dark:text-slate-300"}`}
                    >{m.modalita}</span>
                  ) : EMPTY}
                </td>
                <td className="px-3 py-3">
                  {m.fondo ? (
                    <span
                      style={chipStyle(liste.fondo, m.fondo)}
                      className={`px-2 py-0.5 rounded-full font-medium ${chipStyle(liste.fondo, m.fondo) ? "" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >{m.fondo}</span>
                  ) : EMPTY}
                </td>
                <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                  m.importo === 0 ? "text-slate-800 dark:text-slate-200" : m.inOut === "Entrata" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                }`}>
                  {m.importo === 0 ? "0.00 €" : `${m.inOut === "Uscita" ? "−" : "+"}${fmt(m.importo)} €`}
                </td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-mono">{m.codice === "---" ? "" : m.codice}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">{m.note}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => open(m)}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title={m.allegati ? "Presenza Allegati" : "Assenza Allegati"}
                    aria-label="Visualizza nota cancellata"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${m.allegati ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-500"}`} />
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => { setError(null); setToDelete(m) }}
                      className="ml-2 text-slate-400 hover:text-red-600 transition-colors"
                      title="Elimina definitivamente"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 px-5 py-4 flex gap-6 justify-end items-center flex-wrap">
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Entrate</div>
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">+{fmt(totaleEntrate)} €</div>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Uscite</div>
          <div className="text-sm font-bold text-red-700 dark:text-red-400">−{fmt(totaleUscite)} €</div>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Saldo</div>
          <div className={`text-base font-bold ${saldo >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {saldo >= 0 ? "+" : "−"}{fmt(Math.abs(saldo))} €
          </div>
        </div>
      </div>

      {toDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-5">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🗑</span>
              </div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 text-center">Elimina definitivamente</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                Eliminare la nota <strong>{toDelete.idNota}</strong>
                {toDelete.note ? ` — "${toDelete.note}"` : ""}?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
                Verranno eliminati anche gli allegati archiviati. Questa operazione non è reversibile.
              </p>
              {error && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  ⚠ {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-700 rounded-b-2xl">
              <button
                onClick={() => setToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {deleting ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-100">Nota cancellata</span>
                {selected.branca && (
                  <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{selected.branca}</span>
                )}
                {selected.idNota && (
                  <span className="text-xs font-mono bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full">{selected.idNota}</span>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">×</button>
            </div>

            <div className="px-6 py-4">
              <dl className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {detail.map(([label, val]) => (
                  <div key={label} className="py-2.5 flex gap-4 items-start">
                    <dt className="w-36 flex-shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="text-slate-800 dark:text-slate-100 flex-1">{val}</dd>
                  </div>
                ))}
                <div className="py-2.5 flex gap-4 items-start">
                  <dt className="w-36 flex-shrink-0 text-slate-500 dark:text-slate-400">Importo</dt>
                  <dd className={`flex-1 font-semibold ${selected.inOut === "Entrata" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {selected.inOut === "Entrata" ? "+" : "−"} €{Number(selected.importo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📎</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allegati</span>
                {allegati.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{allegati.length}</span>
                )}
              </div>
              {loading ? (
                <p className="text-xs text-slate-400 italic">Caricamento allegati…</p>
              ) : allegati.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nessun allegato.</p>
              ) : (
                <ul className="space-y-2">
                  {allegati.map(a => (
                    <li key={a.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5">
                      <a
                        href={`/api/allegati/download?url=${encodeURIComponent(a.id)}`}
                        download={a.name}
                        title="Scarica"
                        className="flex-shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </a>
                      <a href={`/api/allegati/download?url=${encodeURIComponent(a.id)}&inline=1`} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-slate-700 dark:text-slate-200 hover:underline truncate">
                        {a.mimeType === "application/pdf" ? "📄" : "🖼️"} {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                {audit.map(([label, val]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
                    <dd className="text-slate-700 dark:text-slate-200 truncate">{val || "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-700 rounded-b-2xl sticky bottom-0 z-10">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

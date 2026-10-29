"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Movimento, Branca, MODALITA, FONDI } from "@/types"

function todayISO(): string {
  return new Date().toISOString().split("T")[0]
}

function toInputDate(ddmmyyyy: string): string {
  if (!ddmmyyyy) return todayISO()
  const [d, m, y] = ddmmyyyy.split("/")
  if (!d || !m || !y) return todayISO()
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`
}

function fromInputDate(yyyymmdd: string): string {
  if (!yyyymmdd) return ""
  const [y, m, d] = yyyymmdd.split("-")
  return `${d}/${m}/${y}`
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return data.error || fallback
  } catch {
    return `${fallback} (HTTP ${res.status})`
  }
}

interface FormData {
  data: string
  inOut: string
  modalita: string
  fondo: string
  importo: string
  codice: string
  note: string
}

const EMPTY_FORM: FormData = {
  data: fromInputDate(todayISO()),
  inOut: "Uscita",
  modalita: "",
  fondo: "",
  importo: "",
  codice: "",
  note: "",
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calculateStatus(f: FormData): string {
  if (!f.data) return "Data!"
  if (!f.inOut) return "In/Out!"
  if (!f.modalita) return "Modalità!"
  if (!f.fondo) return "Fondo!"
  if (!f.importo || parseFloat(f.importo) === 0) return "Importo!"
  if (!f.codice) return "Codice!"
  if (!f.note) return "Note!"
  return "OK!"
}

function statusFromMovimento(m: Movimento): string {
  if (!m.data) return "Data!"
  if (!m.inOut) return "In/Out!"
  if (!m.modalita) return "Modalità!"
  if (!m.fondo) return "Fondo!"
  if (!m.importo) return "Importo!"
  if (!m.codice) return "Codice!"
  if (!m.note) return "Note!"
  return "OK!"
}

function movimentoToForm(m: Movimento): FormData {
  return {
    data: m.data,
    inOut: m.inOut,
    modalita: m.modalita,
    fondo: m.fondo,
    importo: String(m.importo),
    codice: m.codice === "---" ? "" : m.codice,
    note: m.note,
  }
}

const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"]
const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB

interface ExistingAllegato {
  id: string
  name: string
  mimeType: string
}

interface Props {
  movimenti: Movimento[]
  branca: Branca
  canEdit: boolean
}

export default function MovimentiTable({ movimenti, branca, canEdit }: Props) {
  const router = useRouter()

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null)
  const [selected, setSelected] = useState<Movimento | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allegati state
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingAllegati, setExistingAllegati] = useState<ExistingAllegato[]>([])
  const [allegatiLoading, setAllegatiLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openAdd() {
    setForm(EMPTY_FORM)
    setSelected(null)
    setError(null)
    setPendingFiles([])
    setExistingAllegati([])
    setFileError(null)
    setModal("add")
  }

  function openEdit(m: Movimento) {
    setForm(movimentoToForm(m))
    setSelected(m)
    setError(null)
    setPendingFiles([])
    setExistingAllegati([])
    setFileError(null)
    setModal("edit")
  }

  function openDelete(m: Movimento) {
    setSelected(m)
    setError(null)
    setModal("delete")
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setError(null)
    setPendingFiles([])
    setExistingAllegati([])
    setFileError(null)
  }

  function refresh() {
    router.refresh()
  }

  // Fetch existing allegati when editing a movement that has an idNota
  useEffect(() => {
    if (modal === "edit" && selected?.idNota) {
      setAllegatiLoading(true)
      fetch(`/api/allegati/${branca}/${selected.idNota}`)
        .then(r => r.json())
        .then(d => setExistingAllegati(d.allegati || []))
        .catch(() => {})
        .finally(() => setAllegatiLoading(false))
    }
  }, [modal, selected?.idNota, branca])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const files = Array.from(e.target.files || [])
    const valid: File[] = []
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setFileError(`"${f.name}": tipo non ammesso (solo JPG, PNG, PDF)`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        setFileError(`"${f.name}": troppo grande (max 1 MB)`)
        continue
      }
      valid.push(f)
    }
    setPendingFiles(prev => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removePending(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function deleteExisting(fileId: string) {
    if (!selected?.idNota) return
    try {
      const res = await fetch(`/api/allegati/${branca}/${selected.idNota}/${fileId}`, { method: "DELETE" })
      if (res.ok) setExistingAllegati(prev => prev.filter(a => a.id !== fileId))
    } catch {}
  }

  async function uploadPendingFiles(idNota: string) {
    for (const file of pendingFiles) {
      const fd = new FormData()
      fd.append("file", file)
      await fetch(`/api/allegati/${branca}/${idNota}`, { method: "POST", body: fd })
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        data: form.data,
        inOut: form.inOut,
        modalita: form.modalita,
        fondo: form.fondo,
        importo: parseFloat(form.importo) || 0,
        codice: form.codice,
        note: form.note,
      }

      if (modal === "add") {
        const res = await fetch(`/api/movimenti/${branca}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await parseError(res, "Errore nel salvataggio"))
        const data = await res.json()
        if (data.idNota && pendingFiles.length > 0) {
          await uploadPendingFiles(data.idNota)
        }
      } else if (modal === "edit" && selected) {
        const res = await fetch(`/api/movimenti/${branca}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowNumber: selected.id, ...payload }),
        })
        if (!res.ok) throw new Error(await parseError(res, "Errore nel salvataggio"))
        if (selected.idNota && pendingFiles.length > 0) {
          await uploadPendingFiles(selected.idNota)
        }
      }

      closeModal()
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/movimenti/${branca}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber: selected.id, idNota: selected.idNota }),
      })
      if (!res.ok) throw new Error(await parseError(res, "Errore nell'eliminazione"))
      closeModal()
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto")
    } finally {
      setSaving(false)
    }
  }

  const totaleEntrate = movimenti.filter(m => m.inOut === "Entrata").reduce((s, m) => s + m.importo, 0)
  const totaleUscite = movimenti.filter(m => m.inOut === "Uscita").reduce((s, m) => s + m.importo, 0)
  const saldo = totaleEntrate - totaleUscite

  const hasAllegati = (m: Movimento) => !!m.idNota

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={openAdd}
            className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            + Aggiungi movimento
          </button>
        </div>
      )}

      {movimenti.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-16 text-center border border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-slate-400">Nessun movimento registrato.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-xs min-w-[780px]">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">In/Out</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Modalità</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Fondo</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Importo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Codice</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Note</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">Status</th>
                  {canEdit && <th className="px-3 py-3 w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {movimenti.map((m, idx) => (
                  <tr key={m.id} className={`border-t border-slate-100 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-700/50"}`}>
                    <td className="px-3 py-3 text-slate-400 dark:text-slate-500 font-mono">{m.numero}</td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap font-medium">{m.data}</td>
                    <td className="px-3 py-3">
                      {m.inOut ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          m.inOut === "Entrata"
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                        }`}>
                          {m.inOut === "Entrata" ? "↑" : "↓"} {m.inOut}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{m.modalita || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="px-3 py-3">
                      {m.fondo ? (
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">{m.fondo}</span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                      m.importo === 0 ? "text-slate-800 dark:text-slate-200" : m.inOut === "Entrata" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                    }`}>
                      {m.importo === 0 ? "0.00 €" : `${m.inOut === "Uscita" ? "−" : "+"}${fmt(m.importo)} €`}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-mono">{m.codice === "---" ? "" : m.codice}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                      <span className="flex items-center gap-1">
                        {m.note}
                        {hasAllegati(m) && (
                          <span className="text-slate-400 dark:text-slate-500 flex-shrink-0" title={`ID: ${m.idNota}`}>📎</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const s = statusFromMovimento(m)
                        return s === "OK!" ? (
                          <span className="inline-block font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">OK</span>
                        ) : (
                          <span className="inline-block font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">{s}</span>
                        )
                      })()}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors mr-1"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDelete(m)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totali */}
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
        </>
      )}

      {/* Modal Add/Edit */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-t-2xl sticky top-0 z-10">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {modal === "add" ? "➕ Aggiungi movimento" : "✏️ Modifica movimento"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data</label>
                  <input
                    type="date"
                    value={toInputDate(form.data)}
                    onChange={e => setForm(f => ({ ...f, data: fromInputDate(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>In/Out</label>
                  <select
                    value={form.inOut}
                    onChange={e => setForm(f => ({ ...f, inOut: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    <option value="Entrata">Entrata</option>
                    <option value="Uscita">Uscita</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Modalità</label>
                  <select
                    value={form.modalita}
                    onChange={e => setForm(f => ({ ...f, modalita: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {MODALITA.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fondo</label>
                  <select
                    value={form.fondo}
                    onChange={e => setForm(f => ({ ...f, fondo: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {FONDI.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Importo (€) <span className="font-normal text-slate-400 dark:text-slate-500">— sempre positivo</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.importo}
                    onChange={e => setForm(f => ({ ...f, importo: String(Math.abs(parseFloat(e.target.value) || 0)) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Codice</label>
                  <input
                    type="text"
                    placeholder="es. ---"
                    value={form.codice}
                    onChange={e => setForm(f => ({ ...f, codice: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Note</label>
                <textarea
                  rows={2}
                  placeholder="Descrizione del movimento…"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* ── Allegati ── */}
              <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    📎 Allegati
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    + Aggiungi file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {fileError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>
                )}

                {/* Allegati esistenti (solo in edit) */}
                {modal === "edit" && (
                  allegatiLoading ? (
                    <p className="text-xs text-slate-400 italic">Caricamento allegati…</p>
                  ) : existingAllegati.length > 0 ? (
                    <ul className="space-y-1">
                      {existingAllegati.map(a => (
                        <li key={a.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5">
                          <span className="truncate text-slate-700 dark:text-slate-200">
                            {a.mimeType === "application/pdf" ? "📄" : "🖼️"} {a.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteExisting(a.id)}
                            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                            title="Elimina allegato"
                          >
                            🗑
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nessun allegato</p>
                  )
                )}

                {/* File in attesa di upload */}
                {pendingFiles.length > 0 && (
                  <ul className="space-y-1">
                    {pendingFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1.5">
                        <span className="truncate text-emerald-700 dark:text-emerald-300">
                          {f.type === "application/pdf" ? "📄" : "🖼️"} {f.name}
                          <span className="ml-1 text-emerald-500 dark:text-emerald-500">
                            ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removePending(i)}
                          className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors"
                          title="Rimuovi"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs text-slate-400 dark:text-slate-500">
                  JPG, PNG o PDF · max 1 MB per file
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                {(() => {
                  const s = calculateStatus(form)
                  return s === "OK!" ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">OK</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">{s}</span>
                  )
                })()}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  ⚠ {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-700 rounded-b-2xl sticky bottom-0 z-10">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.data}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {modal === "delete" && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-5">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🗑</span>
              </div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 text-center">Elimina movimento</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                Sei sicuro di voler eliminare il movimento <strong>#{selected.numero}</strong>
                {selected.note ? ` — "${selected.note}"` : ""}?
              </p>
              {selected.idNota && (
                <p className="text-xs text-orange-600 dark:text-orange-400 text-center mt-1">
                  Verranno eliminati anche gli allegati su Drive.
                </p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">Questa operazione non è reversibile.</p>

              {error && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  ⚠ {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-700 rounded-b-2xl">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

"use client"

import { Fragment, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export interface ReportRiga {
  branca: string
  inOut: string
  modalita: string
  fondo: string
  importo: number
}

interface Props {
  righe: ReportRiga[]
  branche: string[]
  bilanci: { id: string; name: string }[]
  annoAttivoId: string
  selectedId: string
}

type Dim = "-" | "FONDO" | "MODALITA"

const SENZA_VALORE = "(non specificato)"
const fmt = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
const val = (s: string) => s.trim() || SENZA_VALORE

function raggruppa(righe: ReportRiga[], dim: Dim) {
  const m = new Map<string, ReportRiga[]>()
  for (const r of righe) {
    const k = val(dim === "FONDO" ? r.fondo : r.modalita)
    m.set(k, [...(m.get(k) || []), r])
  }
  return [...m.entries()]
    .map(([k, rs]) => ({ k, rs, tot: somma(rs) }))
    .sort((a, b) => a.k.localeCompare(b.k, "it"))
}

const somma = (rs: ReportRiga[]) => rs.reduce((s, r) => s + r.importo, 0)

const selectCls = "border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"

export default function ReportPrimaNota({ righe, branche, bilanci, annoAttivoId, selectedId }: Props) {
  const router = useRouter()
  const [branca, setBranca] = useState("TUTTE")
  const [l1, setL1] = useState<Dim>("-")
  const [l2, setL2] = useState<Dim>("-")
  const [chiusi, setChiusi] = useState<Set<string>>(new Set())

  const opzioniL2: Dim[] = l1 === "FONDO" ? ["-", "MODALITA"] : l1 === "MODALITA" ? ["-", "FONDO"] : ["-"]

  function cambiaL1(v: Dim) {
    setL1(v)
    setL2("-")
    setChiusi(new Set())
  }

  function toggle(key: string) {
    setChiusi(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  const filtrate = useMemo(
    () => (branca === "TUTTE" ? righe : righe.filter(r => r.branca === branca)),
    [righe, branca]
  )

  const sezioni = [
    { key: "Uscita", titolo: "🔴 USCITE (Costi della gestione per cassa)", cls: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200" },
    { key: "Entrata", titolo: "🟢 ENTRATE (Ricavi e proventi della gestione per cassa)", cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200" },
  ].map(s => {
    const rs = filtrate.filter(r => r.inOut.trim().toLowerCase() === s.key.toLowerCase())
    return { ...s, rs, tot: somma(rs) }
  })
  const totale = sezioni[1].tot - sezioni[0].tot

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Anno
          <select
            className={selectCls}
            value={selectedId}
            onChange={e => router.push(e.target.value === annoAttivoId ? "/report/prima-nota" : `/report/prima-nota?fileId=${e.target.value}`)}
          >
            {bilanci.map(b => <option key={b.id} value={b.id}>{b.name}{b.id === annoAttivoId ? " (attivo)" : ""}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Branca
          <select className={selectCls} value={branca} onChange={e => { setBranca(e.target.value); setChiusi(new Set()) }}>
            <option value="TUTTE">TUTTE</option>
            {branche.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Livello 1
          <select className={selectCls} value={l1} onChange={e => cambiaL1(e.target.value as Dim)}>
            <option value="-">-</option>
            <option value="FONDO">FONDO</option>
            <option value="MODALITA">MODALITA&apos;</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Livello 2
          <select className={selectCls} value={l2} disabled={l1 === "-"} onChange={e => { setL2(e.target.value as Dim); setChiusi(new Set()) }}>
            {opzioniL2.map(o => <option key={o} value={o}>{o === "MODALITA" ? "MODALITA'" : o}</option>)}
          </select>
        </label>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden text-sm">
        {sezioni.map(s => {
          const liv1 = l1 === "-" ? [] : raggruppa(s.rs, l1)
          const chiusa = chiusi.has(s.key)
          return (
            <Fragment key={s.key}>
              <button
                type="button"
                onClick={() => l1 !== "-" && toggle(s.key)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 font-bold text-left ${s.cls} ${l1 === "-" ? "cursor-default" : ""}`}
              >
                <span>{l1 !== "-" && <span className="inline-block w-4">{chiusa ? "▸" : "▾"}</span>}{s.titolo}</span>
                <span className="whitespace-nowrap">{fmt(s.tot)}</span>
              </button>
              {!chiusa && liv1.map(a => {
                const k2 = `${s.key}|${a.k}`
                const liv2 = l2 === "-" ? [] : raggruppa(a.rs, l2)
                const chiusa2 = chiusi.has(k2)
                return (
                  <Fragment key={k2}>
                    <button
                      type="button"
                      onClick={() => l2 !== "-" && toggle(k2)}
                      className={`w-full flex items-center justify-between gap-3 pl-8 pr-4 py-2 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100 text-left ${l2 === "-" ? "cursor-default" : ""}`}
                    >
                      <span>{l2 !== "-" && <span className="inline-block w-4">{chiusa2 ? "▸" : "▾"}</span>}{a.k}</span>
                      <span className="whitespace-nowrap">{fmt(a.tot)}</span>
                    </button>
                    {!chiusa2 && liv2.map(b => (
                      <div key={`${k2}|${b.k}`} className="flex items-center justify-between gap-3 pl-14 pr-4 py-1.5 border-b border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <span>{b.k}</span>
                        <span className="whitespace-nowrap">{fmt(b.tot)}</span>
                      </div>
                    ))}
                  </Fragment>
                )
              })}
            </Fragment>
          )
        })}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 dark:bg-slate-950 text-white font-bold text-base">
          <span>TOTALE (Entrate − Uscite)</span>
          <span className="whitespace-nowrap">{fmt(totale)}</span>
        </div>
      </div>
    </div>
  )
}

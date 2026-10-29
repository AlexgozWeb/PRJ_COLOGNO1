export const instant = false

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName } from "@/lib/config"
import { getMovimenti } from "@/lib/sheets"
import { listAllegati, parseAnnoFromFileName } from "@/lib/blob"
import { BRANCHE, BRANCA_LABELS, Branca } from "@/types"
import AppHeader from "@/components/AppHeader"
import NotaAllegati from "@/components/NotaAllegati"

const CAMPO_LABELS: Record<string, string> = {
  numero:   "N°",
  data:     "Data",
  inOut:    "Entrata / Uscita",
  modalita: "Modalità",
  fondo:    "Fondo",
  importo:  "Importo",
  codice:   "Codice",
  note:     "Descrizione",
  status:   "Status",
  idNota:   "ID Nota",
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "OK!"
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"}`}>
      {status}
    </span>
  )
}

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ name: string; rowId: string }>
}) {
  const { name, rowId } = await params
  const branca = name as Branca

  if (!BRANCHE.includes(branca)) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const email = session.user.email
  const admin = await isAdmin(email)
  if (!admin) {
    const permessi = await getUserPermessi(email)
    if (!permessi[branca]) redirect("/dashboard")
  }

  const config = await getConfig()
  if (!config.annoAttivo) redirect("/dashboard")

  const movimenti = await getMovimenti(config.annoAttivo, branca)
  const movimento = movimenti.find(m => m.id === parseInt(rowId))
  if (!movimento) notFound()

  const spreadsheetName = await getAnnoAttivoName(config.annoAttivo)
  const anno = parseAnnoFromFileName(spreadsheetName)
  const allegati = anno && movimento.idNota
    ? await listAllegati(anno, branca, movimento.idNota)
    : []

  const backHref = `/branca/${branca}`

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref={backHref} backLabel={BRANCA_LABELS[branca]}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <span className="text-base font-bold text-white">Dettaglio Nota Spesa</span>
        {movimento.idNota && (
          <span className="text-xs font-mono bg-slate-600 text-slate-200 px-2 py-0.5 rounded-full">
            {movimento.idNota}
          </span>
        )}
      </AppHeader>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Campi nota */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Dati movimento</h2>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-700">
            {(Object.keys(CAMPO_LABELS) as (keyof typeof CAMPO_LABELS)[]).map(k => {
              const raw = movimento[k as keyof typeof movimento]
              if (raw === undefined || raw === null || raw === "") return null
              return (
                <div key={k} className="px-6 py-3 flex gap-4 items-start">
                  <dt className="w-36 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400">{CAMPO_LABELS[k]}</dt>
                  <dd className="text-sm text-slate-800 dark:text-slate-100 flex-1">
                    {k === "status" ? (
                      <StatusBadge status={String(raw)} />
                    ) : k === "importo" ? (
                      <span className={`font-semibold ${movimento.inOut === "Entrata" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {movimento.inOut === "Entrata" ? "+" : "−"} €{Number(raw).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      String(raw)
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>

        {/* Allegati */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <span className="text-base">📎</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Allegati</h2>
            {allegati.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {allegati.length}
              </span>
            )}
          </div>
          <div className="px-6 py-4">
            <NotaAllegati
              allegati={allegati}
              branca={branca}
              idNota={movimento.idNota}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

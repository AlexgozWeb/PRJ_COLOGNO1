export const instant = false

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, getConfig, getPermessi, getAnnoAttivoName, listBilanci } from "@/lib/config"
import { getRecentLogs } from "@/lib/logger"
import PermessiManager from "@/components/PermessiManager"
import AnnoAttivoSelector from "@/components/AnnoAttivoSelector"
import AppHeader from "@/components/AppHeader"
import Link from "next/link"

const TIPO_COLORS: Record<string, string> = {
  Drive:  "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  Sheets: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  Auth:   "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  App:    "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const admin = await isAdmin(session.user.email!)
  if (!admin) redirect("/dashboard")

  const config = await getConfig()
  const [permessi, bilanci, annoAttivoName, recentLogs] = await Promise.all([
    getPermessi(),
    listBilanci(),
    getAnnoAttivoName(config.annoAttivo ?? ""),
    getRecentLogs(10),
  ])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/dashboard">
        <span className="text-lg flex-shrink-0">⚙️</span>
        <span className="text-base font-bold text-white">Pannello Admin</span>
      </AppHeader>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Anno attivo</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-6">Seleziona il file bilancio dell&apos;anno corrente su cui gli utenti possono operare.</p>
          <AnnoAttivoSelector
            bilanci={bilanci}
            annoAttivoId={config.annoAttivo ?? ""}
            annoAttivoName={annoAttivoName}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">👥</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Permessi utenti</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-6">Gestisci quali branche ogni utente può modificare.</p>
          <PermessiManager permessi={permessi} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 opacity-60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">💾</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Backup & Restore</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-6">Crea una copia di sicurezza del file attivo o ripristina una versione precedente.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 italic ml-6">Funzionalità in arrivo…</p>
        </div>

        {/* Log errori */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-base">🔴</span>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Errori recenti</h2>
              {recentLogs.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  {recentLogs.length}
                </span>
              )}
            </div>
            <Link
              href="/admin/log"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              Vedi log completo →
            </Link>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-6">Ultimi 10 errori registrati dall&apos;applicazione.</p>

          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic ml-6">Nessun errore registrato. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Quando</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Tipo</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Branca</th>
                    <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Messaggio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentLogs.map((log, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">{log.timestamp}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${TIPO_COLORS[log.tipo] ?? TIPO_COLORS.App}`}>
                          {log.tipo}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{log.branca || "—"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200 max-w-xs truncate" title={log.messaggio}>{log.messaggio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

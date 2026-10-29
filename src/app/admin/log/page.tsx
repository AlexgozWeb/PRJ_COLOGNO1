export const instant = false

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/config"
import { getAllLogs } from "@/lib/logger"
import AppHeader from "@/components/AppHeader"
import LogActions from "@/components/LogActions"

const TIPO_COLORS: Record<string, string> = {
  Drive:  "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  Sheets: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  Auth:   "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  App:    "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
}

export default async function LogPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const admin = await isAdmin(session.user.email!)
  if (!admin) redirect("/dashboard")

  const logs = await getAllLogs()

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/admin" backLabel="Admin">
        <span className="text-lg flex-shrink-0">🔴</span>
        <span className="text-base font-bold text-white">Log Errori</span>
      </AppHeader>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {logs.length} {logs.length === 1 ? "errore" : "errori"} registrati
              </span>
            </div>
            <LogActions logs={logs} />
          </div>

          {logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-slate-400 dark:text-slate-500">Nessun errore registrato.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Route</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Branca</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Utente</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Messaggio</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Stack</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 dark:border-slate-700 align-top ${i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-700/50"}`}
                    >
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${TIPO_COLORS[log.tipo] ?? TIPO_COLORS.App}`}>
                          {log.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">{log.route || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.branca || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={log.utente}>{log.utente || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[220px]">
                        <span title={log.messaggio} className="line-clamp-2">{log.messaggio}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 max-w-[200px]">
                        {log.stack ? (
                          <details>
                            <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Vedi stack</summary>
                            <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all text-slate-500 dark:text-slate-400">{log.stack}</pre>
                          </details>
                        ) : "—"}
                      </td>
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

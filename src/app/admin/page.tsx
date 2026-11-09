export const instant = false

import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, getConfig, getPermessi, getAnnoAttivoName, listBilanci, getListeValoriRighe, RigaListaValori } from "@/lib/config"
import { getRecentLogs } from "@/lib/logger"
import PermessiManager from "@/components/PermessiManager"
import ListaValoriManager from "@/components/ListaValoriManager"
import AnnoAttivoSelector from "@/components/AnnoAttivoSelector"
import AppHeader from "@/components/AppHeader"
import AdminSection from "@/components/AdminSection"
import Link from "next/link"
import { getChatbotEnabled, getChatbotModel, getChatbotUsers, listChatbotModels } from "@/features/chatbot/settings"
import ChatbotAdminToggle from "@/features/chatbot/AdminToggle"
import { APP_VERSION_FULL, APP_COMMIT_MESSAGE } from "@/lib/version"

const TIPO_COLORS: Record<string, string> = {
  Drive:  "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  Sheets: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  Auth:   "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  App:    "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
}

export default async function AdminPage() {
  await connection()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const admin = await isAdmin(session.user.email!)
  if (!admin) redirect("/dashboard")

  const config = await getConfig()
  const [chatbotEnabled, chatbotModel, chatbotModels, chatbotUsers] = await Promise.all([
    getChatbotEnabled().catch(() => false),
    getChatbotModel(),
    listChatbotModels().catch(() => [] as string[]),
    getChatbotUsers().catch(() => [] as string[]),
  ])
  const [permessi, bilanci, annoAttivoName, recentLogs, listeAdmin] = await Promise.all([
    getPermessi(),
    listBilanci(),
    getAnnoAttivoName(config.annoAttivo ?? ""),
    getRecentLogs(10),
    getListeValoriRighe().catch(() => ({ righe: [] as RigaListaValori[], palette: { testo: [], sfondo: [] } })),
  ])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/dashboard">
        <span className="text-lg flex-shrink-0">⚙️</span>
        <span className="text-base font-bold text-white">Pannello Admin</span>
      </AppHeader>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <p className="text-xs text-slate-400 text-right">
          Versione app: {APP_VERSION_FULL}
          {APP_COMMIT_MESSAGE && <><br />({APP_COMMIT_MESSAGE})</>}
        </p>
        <AdminSection
          icon={<span className="text-base">📅</span>}
          title="Anno attivo"
          description="Seleziona il file bilancio dell'anno corrente su cui gli utenti possono operare."
        >
          <AnnoAttivoSelector
            bilanci={bilanci}
            annoAttivoId={config.annoAttivo ?? ""}
            annoAttivoName={annoAttivoName}
          />
        </AdminSection>

        <AdminSection
          icon={<span className="text-base">👥</span>}
          title="Permessi utenti"
          description="Gestisci quali branche ogni utente può modificare."
        >
          <PermessiManager permessi={permessi} chatbotUsers={chatbotUsers} />
        </AdminSection>

        <AdminSection
          icon={
            <svg width="18" height="16" viewBox="0 0 24 20" aria-hidden="true" className="flex-shrink-0">
              <defs>
                <linearGradient id="lista-valori-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#62b4f2" />
                  <stop offset="1" stopColor="#3f7cc4" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="24" height="5" rx="2" fill="url(#lista-valori-grad)" />
              <rect x="0" y="7.5" width="24" height="5" rx="2" fill="url(#lista-valori-grad)" />
              <rect x="0" y="15" width="24" height="5" rx="2" fill="url(#lista-valori-grad)" />
            </svg>
          }
          title="Lista Valori"
          description="Valori e colori di Modalità, Fondo e In/Out, letti dal foglio Lista Valori."
        >
          <ListaValoriManager righe={listeAdmin.righe} palette={listeAdmin.palette} />
        </AdminSection>

        <ChatbotAdminToggle initial={chatbotEnabled} model={chatbotModel} models={chatbotModels} />

        <AdminSection
          className="opacity-60"
          icon={<span className="text-base">💾</span>}
          title="Backup & Restore"
          description="Crea una copia di sicurezza del file attivo o ripristina una versione precedente."
        >
          <p className="text-sm text-slate-400 dark:text-slate-500 italic ml-5">Funzionalità in arrivo…</p>
        </AdminSection>

        {/* Log errori */}
        <AdminSection
          icon={<span className="text-base">🔴</span>}
          title="Errori recenti"
          badge={recentLogs.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
              {recentLogs.length}
            </span>
          )}
          action={
            <Link
              href="/admin/log"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors flex-shrink-0"
            >
              Vedi log completo →
            </Link>
          }
          description="Ultimi 10 errori registrati dall'applicazione."
        >
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic ml-5">Nessun errore registrato. 🎉</p>
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
        </AdminSection>
      </main>
    </div>
  )
}

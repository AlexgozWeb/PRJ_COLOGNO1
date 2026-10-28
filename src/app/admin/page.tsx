export const instant = false

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, getConfig, getPermessi, getAnnoAttivoName, listBilanci } from "@/lib/config"
import Link from "next/link"
import PermessiManager from "@/components/PermessiManager"
import AnnoAttivoSelector from "@/components/AnnoAttivoSelector"
import ThemeToggle from "@/components/ThemeToggle"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const admin = await isAdmin(session.user.email!)
  if (!admin) redirect("/dashboard")

  const config = await getConfig()
  const [permessi, bilanci, annoAttivoName] = await Promise.all([
    getPermessi(),
    listBilanci(),
    getAnnoAttivoName(config.annoAttivo ?? ""),
  ])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-slate-800 shadow-lg">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center gap-4">
          <img src="/logo-gruppo.png" alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" style={{ mixBlendMode: "screen" }} />
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-600">|</span>
          <span className="text-lg">⚙️</span>
          <h1 className="text-base font-bold text-white">Pannello Admin</h1>
          <span className="ml-auto"><ThemeToggle /></span>
        </div>
      </header>

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
      </main>
    </div>
  )
}

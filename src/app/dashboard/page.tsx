export const instant = false

import React from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName, listBilanci } from "@/lib/config"
import { BRANCHE, BRANCA_LABELS, Branca } from "@/types"
import Link from "next/link"
import SignOutButton from "@/components/SignOutButton"
import AnnoSelector from "@/components/AnnoSelector"
import ThemeToggle from "@/components/ThemeToggle"
import { Suspense } from "react"

function YForkIcon() {
  return (
    <svg viewBox="0 0 20 22" width="22" height="22" fill="none" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round">
      <line x1="10" y1="22" x2="10" y2="10"/>
      <line x1="10" y1="10" x2="3" y2="2"/>
      <line x1="10" y1="10" x2="17" y2="2"/>
    </svg>
  )
}

function WolfPawIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#f59e0b">
      {/* Polpastrello centrale (grande) */}
      <ellipse cx="12" cy="15" rx="4" ry="3.2"/>
      {/* Dito sinistro esterno */}
      <ellipse cx="6.5" cy="10.5" rx="1.8" ry="2.2" transform="rotate(-18 6.5 10.5)"/>
      {/* Dito sinistro interno */}
      <ellipse cx="9.5" cy="8.8" rx="1.8" ry="2.2" transform="rotate(-6 9.5 8.8)"/>
      {/* Dito destro interno */}
      <ellipse cx="14.5" cy="8.8" rx="1.8" ry="2.2" transform="rotate(6 14.5 8.8)"/>
      {/* Dito destro esterno */}
      <ellipse cx="17.5" cy="10.5" rx="1.8" ry="2.2" transform="rotate(18 17.5 10.5)"/>
    </svg>
  )
}

const BRANCA_ICONS: Record<Branca, React.ReactNode> = {
  LC: "🐺",
  CdA: <WolfPawIcon />,
  EG: "⛺",
  Novi: "🥾",
  Clan: <YForkIcon />,
  CoCa: "⚜️",
}

const BRANCA_COLORS: Record<Branca, string> = {
  LC: "border-l-yellow-400",
  CdA: "border-l-yellow-400",
  EG: "border-l-emerald-400",
  Novi: "border-l-red-400",
  Clan: "border-l-red-400",
  CoCa: "border-l-blue-400",
}

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const email = session.user.email!
  const [config, admin, permessi, bilanci] = await Promise.all([
    getConfig(),
    isAdmin(email),
    getUserPermessi(email),
    listBilanci(),
  ])

  const selectedFileId = (searchParams?.fileId as string) || config.annoAttivo
  const isAnnoAttivo = selectedFileId === config.annoAttivo

  const selectedName = await getAnnoAttivoName(selectedFileId)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-slate-800 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <img
              src="/logo-gruppo.png"
              alt="Gruppo Scout Cologno 1"
              className="w-28 h-28 object-contain flex-shrink-0"
              style={{ mixBlendMode: "screen" }}
            />
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Nota Spese</h1>
              <p className="text-base text-slate-400 leading-tight mt-0.5">Gruppo Scout Cologno 1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <Link href="/admin" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                ⚙ Admin
              </Link>
            )}
            <span className="text-sm text-slate-400 hidden sm:block">{session.user?.name}</span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {!config.annoAttivo && admin && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Nessun anno attivo configurato.{" "}
            <Link href="/admin" className="underline font-medium">Vai al pannello Admin</Link> per impostarlo.
          </div>
        )}

        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Branche</h2>
            <div className="flex items-center gap-2">
              {selectedName
                ? <span className={`text-sm font-medium ${isAnnoAttivo ? "text-emerald-700 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>{selectedName}</span>
                : <span className="text-sm text-slate-400 italic">nessun anno attivo</span>}
              {!isAnnoAttivo && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">solo lettura</span>
              )}
            </div>
          </div>
          <Suspense>
            <AnnoSelector
              bilanci={bilanci}
              annoAttivoId={config.annoAttivo}
              selectedId={selectedFileId}
            />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {BRANCHE.map((branca) => {
            const canEdit = isAnnoAttivo && (admin || permessi[branca])
            const fileParam = isAnnoAttivo ? "" : `?fileId=${selectedFileId}`
            return (
              <Link
                key={branca}
                href={`/branca/${branca}${fileParam}`}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all border-l-4 ${BRANCA_COLORS[branca]} block group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{BRANCA_ICONS[branca]}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {BRANCA_LABELS[branca]}
                  </span>
                </div>
                <div className={`text-sm font-medium ${canEdit ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {canEdit ? "✏ Modificabile" : "👁 Solo lettura"}
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

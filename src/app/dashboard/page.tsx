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

function WolfRockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24">
      {/* Rupe */}
      <path d="M2 23 Q5 18 8 20 Q10 15 12 19 Q14 15 16 20 Q19 18 22 23 Z" fill="#94a3b8"/>
      {/* Corpo/testa - forma angolosa da lupo adulto */}
      <path d="M6 20 L6 13 Q6 6 12 6 Q18 6 18 13 L18 20 Z" fill="#334155"/>
      {/* Orecchio sinistro - appuntito e alto */}
      <path d="M7 14 L4 3 L10 10 Z" fill="#334155"/>
      {/* Orecchio destro */}
      <path d="M17 14 L20 3 L14 10 Z" fill="#334155"/>
      {/* Interno orecchio sinistro */}
      <path d="M7.2 13 L5.2 5 L9.5 10 Z" fill="#94a3b8"/>
      {/* Interno orecchio destro */}
      <path d="M16.8 13 L18.8 5 L14.5 10 Z" fill="#94a3b8"/>
      {/* Muso chiaro (pelo grigio da lupo anziano) */}
      <ellipse cx="12" cy="16.5" rx="3.5" ry="2.5" fill="#64748b"/>
      {/* Occhi ambra - tipici del lupo */}
      <ellipse cx="9.5" cy="12.5" rx="1.3" ry="1.1" fill="#f59e0b"/>
      <ellipse cx="14.5" cy="12.5" rx="1.3" ry="1.1" fill="#f59e0b"/>
      {/* Pupille verticali */}
      <ellipse cx="9.7" cy="12.5" rx="0.45" ry="0.85" fill="#0f172a"/>
      <ellipse cx="14.7" cy="12.5" rx="0.45" ry="0.85" fill="#0f172a"/>
      {/* Naso */}
      <ellipse cx="12" cy="15.2" rx="1.1" ry="0.7" fill="#1e293b"/>
      {/* Linee rughe sulla fronte - segno di età */}
      <path d="M10 9.5 Q12 8.5 14 9.5" stroke="#475569" strokeWidth="0.5" fill="none"/>
    </svg>
  )
}

const BRANCA_ICONS: Record<Branca, React.ReactNode> = {
  LC: "🐺",
  CdA: <WolfRockIcon />,
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
    <div className="min-h-screen bg-slate-100">
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
          <div className="flex items-center gap-4">
            {admin && (
              <Link href="/admin" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                ⚙ Admin
              </Link>
            )}
            <span className="text-sm text-slate-400 hidden sm:block">{session.user?.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {!config.annoAttivo && admin && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            ⚠️ Nessun anno attivo configurato.{" "}
            <Link href="/admin" className="underline font-medium">Vai al pannello Admin</Link> per impostarlo.
          </div>
        )}

        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Branche</h2>
            <div className="flex items-center gap-2">
              {selectedName
                ? <span className={`text-sm font-medium ${isAnnoAttivo ? "text-emerald-700" : "text-orange-600"}`}>{selectedName}</span>
                : <span className="text-sm text-slate-400 italic">nessun anno attivo</span>}
              {!isAnnoAttivo && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">solo lettura</span>
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
                className={`bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all border-l-4 ${BRANCA_COLORS[branca]} block group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{BRANCA_ICONS[branca]}</span>
                  <span className="font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                    {BRANCA_LABELS[branca]}
                  </span>
                </div>
                <div className={`text-sm font-medium ${canEdit ? "text-emerald-600" : "text-slate-400"}`}>
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

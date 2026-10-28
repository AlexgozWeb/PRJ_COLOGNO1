export const instant = false

import React from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getConfig, isAdmin, getUserPermessi, getAnnoAttivoName } from "@/lib/config"
import { getMovimenti } from "@/lib/sheets"
import { BRANCHE, BRANCA_LABELS, Branca } from "@/types"
import Link from "next/link"
import MovimentiTable from "@/components/MovimentiTable"
import ThemeToggle from "@/components/ThemeToggle"

function YForkIcon() {
  return (
    <svg viewBox="0 0 20 22" width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round">
      <line x1="10" y1="22" x2="10" y2="10"/>
      <line x1="10" y1="10" x2="3" y2="2"/>
      <line x1="10" y1="10" x2="17" y2="2"/>
    </svg>
  )
}

function WolfRockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M2 23 Q5 18 8 20 Q10 15 12 19 Q14 15 16 20 Q19 18 22 23 Z" fill="#94a3b8"/>
      <path d="M6 20 L6 13 Q6 6 12 6 Q18 6 18 13 L18 20 Z" fill="#334155"/>
      <path d="M7 14 L4 3 L10 10 Z" fill="#334155"/>
      <path d="M17 14 L20 3 L14 10 Z" fill="#334155"/>
      <path d="M7.2 13 L5.2 5 L9.5 10 Z" fill="#94a3b8"/>
      <path d="M16.8 13 L18.8 5 L14.5 10 Z" fill="#94a3b8"/>
      <ellipse cx="12" cy="16.5" rx="3.5" ry="2.5" fill="#64748b"/>
      <ellipse cx="9.5" cy="12.5" rx="1.3" ry="1.1" fill="#f59e0b"/>
      <ellipse cx="14.5" cy="12.5" rx="1.3" ry="1.1" fill="#f59e0b"/>
      <ellipse cx="9.7" cy="12.5" rx="0.45" ry="0.85" fill="#0f172a"/>
      <ellipse cx="14.7" cy="12.5" rx="0.45" ry="0.85" fill="#0f172a"/>
      <ellipse cx="12" cy="15.2" rx="1.1" ry="0.7" fill="#1e293b"/>
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

export default async function BrancaPage(props: PageProps<'/branca/[name]'>) {
  const { name } = await props.params
  const searchParams = await props.searchParams
  const branca = name as Branca

  if (!BRANCHE.includes(branca)) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const email = session.user.email!
  const [config, admin, permessi] = await Promise.all([
    getConfig(),
    isAdmin(email),
    getUserPermessi(email),
  ])

  const fileId = (searchParams?.fileId as string) || config.annoAttivo
  const isAnnoAttivo = fileId === config.annoAttivo
  const canEdit = isAnnoAttivo && (admin || permessi[branca])

  const [movimenti, annoName] = await Promise.all([
    fileId ? getMovimenti(fileId, branca) : Promise.resolve([]),
    getAnnoAttivoName(fileId),
  ])

  const backHref = isAnnoAttivo ? "/dashboard" : `/dashboard?fileId=${fileId}`

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 flex-wrap">
          <img src="/logo-gruppo.png" alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" style={{ mixBlendMode: "screen" }} />
          <Link href={backHref} className="text-slate-400 hover:text-slate-200 text-base transition-colors">← Dashboard</Link>
          <span className="text-slate-600">|</span>
          <span className="text-2xl">{BRANCA_ICONS[branca]}</span>
          <h1 className="text-xl font-bold text-white">{BRANCA_LABELS[branca]}</h1>
          {annoName && (
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${
              isAnnoAttivo
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
            }`}>
              {annoName}{!isAnnoAttivo && " — solo lettura"}
            </span>
          )}
          {canEdit && (
            <span className="text-sm bg-emerald-500/20 text-emerald-300 font-medium px-3 py-1.5 rounded-full border border-emerald-500/30">
              ✏ Modificabile
            </span>
          )}
          <span className="ml-auto">
            <ThemeToggle />
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <MovimentiTable movimenti={movimenti} branca={branca} canEdit={canEdit} />
      </main>
    </div>
  )
}

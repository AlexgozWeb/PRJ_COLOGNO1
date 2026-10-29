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
import AutoRefresh from "@/components/AutoRefresh"

function YForkIcon() {
  return (
    <svg viewBox="0 0 20 22" width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round">
      <line x1="10" y1="22" x2="10" y2="10"/>
      <line x1="10" y1="10" x2="3" y2="2"/>
      <line x1="10" y1="10" x2="17" y2="2"/>
    </svg>
  )
}

function WolfPawIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#f59e0b">
      <ellipse cx="12" cy="15" rx="4" ry="3.2"/>
      <ellipse cx="6.5" cy="10.5" rx="1.8" ry="2.2" transform="rotate(-18 6.5 10.5)"/>
      <ellipse cx="9.5" cy="8.8" rx="1.8" ry="2.2" transform="rotate(-6 9.5 8.8)"/>
      <ellipse cx="14.5" cy="8.8" rx="1.8" ry="2.2" transform="rotate(6 14.5 8.8)"/>
      <ellipse cx="17.5" cy="10.5" rx="1.8" ry="2.2" transform="rotate(18 17.5 10.5)"/>
    </svg>
  )
}

function GruppoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <circle cx="12" cy="12" r="11" fill="#2563eb"/>
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="Arial, sans-serif">C</text>
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
  Gruppo: <GruppoIcon />,
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
        <AutoRefresh intervalMs={10000} />
        <MovimentiTable movimenti={movimenti} branca={branca} canEdit={canEdit} />
      </main>
    </div>
  )
}

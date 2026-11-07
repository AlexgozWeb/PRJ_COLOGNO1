export const instant = false

import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getConfig, getAnnoAttivoName, listBilanci } from "@/lib/config"
import { getBrancheDisponibili, getMovimenti } from "@/lib/sheets"
import { BRANCHE } from "@/types"
import AppHeader from "@/components/AppHeader"
import ReportPrimaNota, { ReportRiga } from "@/components/ReportPrimaNota"

export default async function ReportPrimaNotaPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams
  await connection()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const [config, bilanci] = await Promise.all([getConfig(), listBilanci()])
  const fileId = (searchParams?.fileId as string) || config.annoAttivo

  let righe: ReportRiga[] = []
  let branche: string[] = []
  if (fileId) {
    const disponibili = await getBrancheDisponibili(fileId, BRANCHE)
    const presenti = BRANCHE.filter(b => disponibili.has(b))
    branche = presenti
    const per = await Promise.all(presenti.map(async b => {
      const movs = await getMovimenti(fileId, b).catch(() => [])
      return movs.map(m => ({ branca: b as string, inOut: m.inOut, modalita: m.modalita, fondo: m.fondo, importo: m.importo }))
    }))
    righe = per.flat()
  }
  const annoName = await getAnnoAttivoName(fileId)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/report" backLabel="Report">
        <img src="/icon-prima-nota.png" alt="" width={32} height={32} className="w-8 h-8 flex-shrink-0" />
        <span className="font-bold text-white text-base">Report Prima Nota</span>
        {annoName && <span className="text-sm text-slate-300 hidden sm:inline">{annoName}</span>}
      </AppHeader>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <ReportPrimaNota
          righe={righe}
          branche={branche}
          bilanci={bilanci.map(b => ({ id: b.id, name: b.name }))}
          annoAttivoId={config.annoAttivo}
          selectedId={fileId}
        />
      </main>
    </div>
  )
}

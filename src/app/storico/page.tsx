export const instant = false

import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getConfig, isAdmin, getAnnoAttivoName, getListeValori } from "@/lib/config"
import { getStorico, hasStorico } from "@/lib/sheets"
import StoricoTable from "@/components/StoricoTable"
import AppHeader from "@/components/AppHeader"
import AutoRefresh from "@/components/AutoRefresh"

export default async function StoricoPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  await connection()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  if (!(await isAdmin(session.user.email))) notFound()

  const [config, liste] = await Promise.all([getConfig(), getListeValori()])
  const fileId = (searchParams?.fileId as string) || config.annoAttivo
  const isAnnoAttivo = fileId === config.annoAttivo
  const backHref = isAnnoAttivo ? "/dashboard" : `/dashboard?fileId=${fileId}`

  if (!fileId || !(await hasStorico(fileId))) {
    const nome = fileId ? await getAnnoAttivoName(fileId) : ""
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
        <AppHeader backHref={backHref}>
          <span className="text-2xl flex-shrink-0">🗑️</span>
          <span className="font-bold text-white text-base">Storico cancellazioni</span>
        </AppHeader>
        <main className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center border border-slate-200 dark:border-slate-700">
            <div className="text-5xl mb-4">🚫</div>
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              Per il file{nome ? ` "${nome}"` : ""} la cancellazione non è prevista.
            </p>
            <p className="text-sm text-slate-400 mt-2">Manca il foglio «Storico Cancellazioni».</p>
          </div>
        </main>
      </div>
    )
  }

  const [movimenti, annoName] = await Promise.all([getStorico(fileId), getAnnoAttivoName(fileId)])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref={backHref}>
        <span className="text-2xl flex-shrink-0">🗑️</span>
        <span className="font-bold text-white text-base">Storico cancellazioni</span>
        {annoName && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full flex-shrink-0 ${
            isAnnoAttivo
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
          }`}>
            {annoName}{!isAnnoAttivo && " — solo lettura"}
          </span>
        )}
      </AppHeader>

      <main className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <AutoRefresh intervalMs={10000} />
        <StoricoTable movimenti={movimenti} liste={liste} fileId={fileId} canDelete={isAnnoAttivo} />
      </main>
    </div>
  )
}

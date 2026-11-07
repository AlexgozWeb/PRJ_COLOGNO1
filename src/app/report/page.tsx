export const instant = false

import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"

export default async function ReportPage() {
  await connection()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/dashboard">
        <span className="font-bold text-white text-base">Report</span>
      </AppHeader>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          <Link
            href="/report/prima-nota"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 hover:shadow-lg transition-all border-l-4 border-l-indigo-400 block group"
          >
            <div className="flex items-center gap-3">
              <img src="/icon-prima-nota.png" alt="" width={40} height={40} className="w-10 h-10 flex-shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                Report Prima Nota
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}

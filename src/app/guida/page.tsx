import Link from "next/link"

export const metadata = { title: "Guida – Nota Spese" }

export default function GuidaPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900 text-center px-6">
      <div className="text-5xl">📖</div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Guida</h1>
      <p className="text-lg font-semibold text-amber-600">WIP – Work in progress</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">La guida è in preparazione.</p>
      <Link href="/dashboard" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">← Torna all&apos;app</Link>
    </main>
  )
}

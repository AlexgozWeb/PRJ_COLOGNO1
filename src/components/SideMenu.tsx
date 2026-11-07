"use client"

import { useEffect, useSyncExternalStore } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

const STORAGE_KEY = "nsc1-menu-aperto"
const EVENT = "nsc1-menu-change"

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

const getSnapshot = () => window.localStorage.getItem(STORAGE_KEY) === "1"
const getServerSnapshot = () => false

function setOpen(value: boolean) {
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0")
  window.dispatchEvent(new Event(EVENT))
}

export default function SideMenu() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { data: session } = useSession()

  // Su schermi larghi il contenuto si sposta a destra del menu (vedi globals.css)
  useEffect(() => {
    document.documentElement.toggleAttribute("data-menu-open", open)
    return () => document.documentElement.removeAttribute("data-menu-open")
  }, [open])

  const nome = session?.user?.name || ""
  const email = session?.user?.email || ""

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        aria-expanded={open}
        className="relative z-50 flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#1d4ed8" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      <nav
        className={`fixed top-0 left-0 z-40 h-full w-72 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl pt-20 px-4 pb-6 flex flex-col ${open ? "" : "hidden"}`}
        aria-hidden={!open}
      >
        <div className="px-2 pb-3 min-w-0">
          {nome && <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{nome}</div>}
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
        </div>
        <hr className="border-slate-200 dark:border-slate-600 my-2" />
        <Link
          href="/dashboard"
          className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Branche
        </Link>
        <Link
          href="/report"
          className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Report
        </Link>
        <hr className="border-slate-200 dark:border-slate-600 my-2" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Esci
        </button>
      </nav>
    </>
  )
}

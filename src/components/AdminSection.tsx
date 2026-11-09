"use client"
import { useState, type ReactNode } from "react"

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
      className={`flex-shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor" />
    </svg>
  )
}

export default function AdminSection({
  icon, title, badge, action, description, children, className = "",
}: {
  icon: ReactNode
  title: string
  badge?: ReactNode
  action?: ReactNode
  description: string
  children: ReactNode
  className?: string
}) {
  // Lo stato vive nel client: resta aperto dopo router.refresh(), si richiude uscendo dalla pagina
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
        >
          <Chevron open={open} />
          {icon}
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {badge}
        </button>
        {action}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 ml-5">{description}</p>
      <div className={`${open ? "" : "hidden"} mt-4`}>{children}</div>
    </div>
  )
}

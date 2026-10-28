"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-14 h-7" />

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Passa a tema chiaro" : "Passa a tema scuro"}
      className="relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none"
      style={{ backgroundColor: isDark ? "#10b981" : "#475569" }}
      aria-label="Cambia tema"
    >
      {/* Icona luna/sole a sinistra/destra */}
      <span className="absolute left-1.5 text-[11px] select-none">🌙</span>
      <span className="absolute right-1.5 text-[11px] select-none">☀️</span>
      {/* Pallino scorrevole */}
      <span
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300"
        style={{ transform: isDark ? "translateX(28px)" : "translateX(2px)" }}
      />
    </button>
  )
}

"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-400 hover:text-white transition-colors border border-slate-600 hover:border-slate-400 px-3 py-1 rounded-lg"
    >
      Esci
    </button>
  )
}

"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface Bilancio {
  id: string
  name: string
}

interface Props {
  bilanci: Bilancio[]
  annoAttivoId: string
  selectedId: string
}

export default function AnnoSelector({ bilanci, annoAttivoId, selectedId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(fileId: string) {
    if (fileId === annoAttivoId) {
      // anno attivo → rimuovi il param dall'URL
      router.push("/dashboard")
    } else {
      router.push(`/dashboard?fileId=${fileId}`)
    }
  }

  if (bilanci.length <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">Anno visualizzato:</span>
      <select
        value={selectedId}
        onChange={e => handleChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {bilanci.map(b => (
          <option key={b.id} value={b.id}>
            {b.name}{b.id === annoAttivoId ? " (attivo)" : ""}
          </option>
        ))}
      </select>
    </div>
  )
}

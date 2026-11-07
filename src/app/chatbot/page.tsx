export const instant = false

import { getServerSession } from "next-auth"
import { connection } from "next/server"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import AppHeader from "@/components/AppHeader"
import { canUseChatbot } from "@/features/chatbot/settings"
import ChatPanel from "@/features/chatbot/ChatPanel"

export default async function ChatbotPage() {
  await connection()
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) redirect("/login")
  if (!(await canUseChatbot(email))) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AppHeader backHref="/dashboard">
        <span className="text-lg flex-shrink-0">🤖</span>
        <span className="text-base font-bold text-white">Assistente</span>
      </AppHeader>
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4">
        <ChatPanel />
      </main>
    </div>
  )
}

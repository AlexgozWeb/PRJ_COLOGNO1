import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Scout Bilancio — Cologno 1",
  description: "Gestione bilancio gruppo scout Cologno 1",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${geist.className} h-full`}>
      <body className="min-h-full bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

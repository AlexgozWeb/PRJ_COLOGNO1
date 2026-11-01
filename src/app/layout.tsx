import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Scout Bilancio — Cologno 1",
  description: "Gestione bilancio gruppo scout Cologno 1",
  applicationName: "Bilancio Cologno 1",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Bilancio Cologno 1" },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${geist.className} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-gray-50">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

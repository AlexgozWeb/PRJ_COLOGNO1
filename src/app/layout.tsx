import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NSC1 — Note Spese Cologno 1",
  description: "Note Spese del Gruppo Scout Cologno 1",
  applicationName: "NSC1",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "NSC1" },
}

export const viewport: Viewport = {
  themeColor: "#1e293b",
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

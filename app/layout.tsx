import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import WorkspaceNotificationListener from "@/components/workspace/workspace-notification-listener"
import RealTimeNotificationChecker from "@/components/notification/real-time-notification-checker"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Staffify - Roblox Group Management",
  description: "The ultimate staff management platform for Roblox groups",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
          <RealTimeNotificationChecker />
          <WorkspaceNotificationListener />
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'
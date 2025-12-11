import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FlowBrain - AI Agent Platform",
  description: "Create, browse, and chat with AI agents",
    
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // #region agent log
  if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7242/ingest/b312a5f6-32be-4c70-ab25-adabf357af97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:16',message:'RootLayout render (client)',data:{hasWindow:typeof window !== 'undefined',bodyAttrs:typeof document !== 'undefined' ? Array.from(document.body.attributes).map((a:any) => `${a.name}="${a.value}"`).join(', ') : 'no-document'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H4'})}).catch(()=>{}); }
  // #endregion
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        
            {children}
        
        </ThemeProvider>
      </body>
    </html>
  )
}

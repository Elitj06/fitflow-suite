import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/lib/theme'

export const metadata: Metadata = {
  title: {
    default: 'FitFlow Pro — Gestão Inteligente para Personal Trainers',
    template: '%s | FitFlow Pro',
  },
  description:
    'Plataforma completa de agendamento, check-in, FitCoins e chatbot IA para personal trainers e studios de fitness.',
  keywords: [
    'personal trainer',
    'agendamento',
    'fitness',
    'SaaS',
    'chatbot',
    'WhatsApp',
    'IA',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
        {children}
        </ThemeProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  )
}

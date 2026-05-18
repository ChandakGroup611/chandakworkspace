import './globals.css'
import WorkspaceShell from '@/components/layout/WorkspaceShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'

export const metadata = {
  title: 'Enterprise Operations Platform',
  description: 'Complete Enterprise Implementation Blueprint',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="glass-intelligence" data-density="comfortable">
      <body className="bg-background text-foreground min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </ThemeProvider>
      </body>
    </html>
  )
}

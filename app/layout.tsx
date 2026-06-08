import './globals.css'
import { Inter, Outfit, Roboto } from 'next/font/google'
import WorkspaceShell from '@/components/layout/WorkspaceShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import ClientSessionManager from '@/components/auth/ClientSessionManager'
import QueryProvider from '@/components/providers/QueryProvider'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'], variable: '--font-roboto' })

export const metadata = {
  title: 'Chandak Workspace',
  description: 'Complete Enterprise Implementation Blueprint',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${roboto.variable}`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem("app_theme") || "glass-intelligence";
              const density = localStorage.getItem("app_density") || "comfortable";
              const baseSize = localStorage.getItem("app_base_font_size") || "16";
              const subtextSize = localStorage.getItem("app_subtext_font_size") || "14";
              
              document.documentElement.setAttribute("data-theme", theme);
              document.documentElement.setAttribute("data-density", density);
              
              const lightThemes = ["executive-light", "material-ocean", "aurora-breeze"];
              if (lightThemes.includes(theme)) {
                document.documentElement.classList.add("theme-light");
              } else {
                document.documentElement.classList.add("theme-dark");
              }
              
              document.documentElement.style.setProperty("--base-font-size", baseSize + "px");
              document.documentElement.style.setProperty("--subtext-font-size", subtextSize + "px");
              document.documentElement.style.setProperty("font-size", baseSize + "px", "important");
            } catch (e) {}
          `
        }} />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased font-sans" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider>
            <ClientSessionManager />
            <WorkspaceShell>{children}</WorkspaceShell>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

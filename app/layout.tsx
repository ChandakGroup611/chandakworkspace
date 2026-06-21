import './globals.css'
import { Inter, Outfit, Roboto } from 'next/font/google'
import WorkspaceShell from '@/components/layout/WorkspaceShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import ClientSessionManager from '@/components/auth/ClientSessionManager'
import QueryProvider from '@/components/providers/QueryProvider'
import { PermissionsProvider } from '@/components/providers/PermissionsProvider'
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
        <script id="theme-init" dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem("app_theme") || "glass-intelligence";
              const density = localStorage.getItem("app_density") || "comfortable";
              const baseSize = localStorage.getItem("app_base_font_size") || "16";
              const subtextSize = localStorage.getItem("app_subtext_font_size") || "14";
              
              document.documentElement.setAttribute("data-theme", theme);
              document.documentElement.setAttribute("data-density", density);
              
              const lightThemes = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"];
              if (lightThemes.includes(theme)) {
                document.documentElement.classList.add("theme-light");
              } else {
                document.documentElement.classList.add("theme-dark");
              }
              
              const fontFam = localStorage.getItem("app_font") || "inter";
              
              if (fontFam === "outfit") document.documentElement.style.setProperty("--app-font-family", "var(--font-outfit), 'Outfit', system-ui, sans-serif");
              else if (fontFam === "roboto") document.documentElement.style.setProperty("--app-font-family", "var(--font-roboto), 'Roboto', system-ui, sans-serif");
              else if (fontFam === "arial") document.documentElement.style.setProperty("--app-font-family", "Arial, Helvetica, sans-serif");
              else if (fontFam === "times") document.documentElement.style.setProperty("--app-font-family", "'Times New Roman', Times, serif");
              else if (fontFam === "verdana") document.documentElement.style.setProperty("--app-font-family", "Verdana, Geneva, sans-serif");
              else if (fontFam === "courier") document.documentElement.style.setProperty("--app-font-family", "'Courier New', Courier, monospace");
              else if (fontFam === "georgia") document.documentElement.style.setProperty("--app-font-family", "Georgia, serif");
              else if (fontFam === "trebuchet") document.documentElement.style.setProperty("--app-font-family", "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif");
              else if (fontFam === "comic-sans") document.documentElement.style.setProperty("--app-font-family", "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif");
              else if (fontFam === "impact") document.documentElement.style.setProperty("--app-font-family", "Impact, Charcoal, sans-serif");
              else document.documentElement.style.setProperty("--app-font-family", "var(--font-inter), 'Inter', system-ui, sans-serif");

              const textScaleRatio = Number(baseSize) / 16;
              document.documentElement.style.setProperty("--text-scale-ratio", String(textScaleRatio));
              document.documentElement.style.setProperty("--subtext-font-size", subtextSize + "px");
            } catch (e) {}
          `
        }} />
      </head>
      <body className="bg-background text-foreground min-h-screen subpixel-antialiased font-sans text-base" suppressHydrationWarning>
        <QueryProvider>
          <PermissionsProvider>
            <ThemeProvider>
              <ClientSessionManager />
              <WorkspaceShell>{children}</WorkspaceShell>
            </ThemeProvider>
          </PermissionsProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

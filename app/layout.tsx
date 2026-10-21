import './globals.css'
import { Inter, Outfit, Roboto } from 'next/font/google'
import WorkspaceShell from '@/components/layout/WorkspaceShell'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import ClientSessionManager from '@/components/auth/ClientSessionManager'
import QueryProvider from '@/components/providers/QueryProvider'
import GlobalAutoRefresh from '@/components/layout/GlobalAutoRefresh'
import { PermissionsProvider } from '@/components/providers/PermissionsProvider'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast.css';
import './styles/vendor-overrides.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'], variable: '--font-roboto' })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#090D16'
};

export const metadata = {
  title: 'Chandak Workspace',
  description: 'Complete Enterprise Implementation Blueprint',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Chandak Workspace',
    description: 'Complete Enterprise Implementation Blueprint',
    images: [{ url: '/Chandak_Group_Official_Logo.png' }],
  },
}

import { ThemeScript } from '@/components/theme/ThemeScript';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${roboto.variable}`}>
      <head>
        <ThemeScript />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" href="/chandak-40-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased font-sans text-base" suppressHydrationWarning>
        <QueryProvider>
          <PermissionsProvider>
            <ThemeProvider>
              <ClientSessionManager />
              <GlobalAutoRefresh />
              <WorkspaceShell>{children}</WorkspaceShell>
              <ToastContainer position="top-center" theme="colored" />
            </ThemeProvider>
          </PermissionsProvider>
        </QueryProvider>
      </body>
    </html>
  )
}


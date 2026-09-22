import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Emblema Nexus — Plataforma Integral de Gestión Empresarial',
  description: 'Plataforma Integral de Gestión Empresarial para servicios legales, agrimensura e inmobiliarios.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geist.variable} font-sans antialiased`}>
        <NuqsAdapter>
          {children}
          <Toaster richColors position="top-right" />
        </NuqsAdapter>
      </body>
    </html>
  );
}

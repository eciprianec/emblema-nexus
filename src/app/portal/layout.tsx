import React from 'react';
import type { Metadata } from 'next';
import { PortalHeader } from '@/features/client-portal/components/PortalHeader';
import { PortalFooter } from '@/features/client-portal/components/PortalFooter';

export const metadata: Metadata = {
  title: 'Portal de Clientes & Tracking de Expedientes | Emblema Nexus',
  description:
    'Consulte el estado de sus expedientes jurídicos y de agrimensura, suba documentos requeridos y descargue representaciones oficiales e-CF.',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        <strong>Demostración sin validez fiscal.</strong> Este portal solo guarda datos en este navegador y no envía nada a la DGII.
      </div>
      <PortalHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>
      <PortalFooter />
    </div>
  );
}

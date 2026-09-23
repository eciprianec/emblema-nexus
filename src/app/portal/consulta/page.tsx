import React from 'react';
import type { Metadata } from 'next';
import { PublicInquiryForm } from '@/features/client-portal/components/PublicInquiryForm';

export const metadata: Metadata = {
  title: 'Consultas & Cotizaciones | Emblema Nexus',
  description:
    'Solicite una consulta jurídica inmobiliaria o cotización formal de agrimensura con nuestros especialistas colegiados.',
};

export default function ConsultaPage() {
  return (
    <div className="py-4 sm:py-8">
      <PublicInquiryForm />
    </div>
  );
}

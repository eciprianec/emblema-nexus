import React from 'react';
import type { Metadata } from 'next';
import { PublicCaseTracker } from '@/features/client-portal/components/PublicCaseTracker';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const decoded = decodeURIComponent(code).toUpperCase();
  return {
    title: `Expediente ${decoded} | Tracking Emblema Nexus`,
    description: `Seguimiento procesal del expediente ${decoded} ante la Jurisdicción Inmobiliaria y Mensuras Catastrales.`,
  };
}

export default async function TrackingCodePage({ params }: PageProps) {
  const { code } = await params;
  const decoded = decodeURIComponent(code).toUpperCase();

  return (
    <div className="py-4 sm:py-8">
      <PublicCaseTracker initialCode={decoded} />
    </div>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import { PublicCaseTracker } from '@/features/client-portal/components/PublicCaseTracker';

export const metadata: Metadata = {
  title: 'Tracking Público de Expedientes | Emblema Nexus',
  description:
    'Rastree en tiempo real el avance de su expediente legal o catastral ante el Tribunal de Tierras y la Dirección Nacional de Mensuras Catastrales.',
};

export default function TrackingPage() {
  return (
    <div className="py-4 sm:py-8">
      <PublicCaseTracker />
    </div>
  );
}

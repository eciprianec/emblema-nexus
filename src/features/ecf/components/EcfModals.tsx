"use client";

import { EcfEmitModal } from "./EcfEmitModal";
import { EcfPrintRepresentationModal } from "./EcfPrintRepresentationModal";
import { EcfTrackIdModal } from "./EcfTrackIdModal";

export function EcfModals() {
  return (
    <>
      <EcfEmitModal />
      <EcfPrintRepresentationModal />
      <EcfTrackIdModal />
    </>
  );
}

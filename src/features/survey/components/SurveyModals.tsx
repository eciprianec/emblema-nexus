"use client";

import { ParcelCreateModal } from "./ParcelCreateModal";
import { ParcelDetailModal } from "./ParcelDetailModal";
import { CadastralFileCreateModal } from "./CadastralFileCreateModal";
import { CoordinateImporterModal } from "./CoordinateImporterModal";
import { FieldSessionCreateModal } from "./FieldSessionCreateModal";

export function SurveyModals() {
  return (
    <>
      <ParcelCreateModal />
      <ParcelDetailModal />
      <CadastralFileCreateModal />
      <CoordinateImporterModal />
      <FieldSessionCreateModal />
    </>
  );
}

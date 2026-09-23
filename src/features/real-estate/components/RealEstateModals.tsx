"use client";

import { PropertyCreateModal } from "./PropertyCreateModal";
import { PropertyDetailModal } from "./PropertyDetailModal";
import { ContractCreateModal } from "./ContractCreateModal";
import { ShowingCreateModal } from "./ShowingCreateModal";
import { ShowingFeedbackModal } from "./ShowingFeedbackModal";
import { CommissionCreateModal } from "./CommissionCreateModal";
import { CommissionPayModal } from "./CommissionPayModal";

export function RealEstateModals() {
  return (
    <>
      <PropertyCreateModal />
      <PropertyDetailModal />
      <ContractCreateModal />
      <ShowingCreateModal />
      <ShowingFeedbackModal />
      <CommissionCreateModal />
      <CommissionPayModal />
    </>
  );
}

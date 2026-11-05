"use client";

import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { QuoteCreateModal } from "./QuoteCreateModal";
import { ExpenseCreateModal } from "./ExpenseCreateModal";
import { EcfModals } from "@/features/ecf/components/EcfModals";

export function FinanceModals() {
  return (
    <>
      <InvoiceDetailModal />
      <QuoteCreateModal />
      <ExpenseCreateModal />
      <EcfModals />
    </>
  );
}

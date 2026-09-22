"use client";

import { InvoiceCreateModal } from "./InvoiceCreateModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { QuoteCreateModal } from "./QuoteCreateModal";
import { PaymentCreateModal } from "./PaymentCreateModal";
import { ExpenseCreateModal } from "./ExpenseCreateModal";

export function FinanceModals() {
  return (
    <>
      <InvoiceCreateModal />
      <InvoiceDetailModal />
      <QuoteCreateModal />
      <PaymentCreateModal />
      <ExpenseCreateModal />
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "../store/useFinanceStore";
import { INVOICE_STATUS_LABELS, InvoiceStatus, Invoice, NCF_LABELS } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  Eye,
  CreditCard,
  Ban,
  MoreVertical,
  Plus,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEcfStore } from "@/features/ecf/store/useEcfStore";

interface InvoiceListProps {
  clientId?: string;
  caseId?: string;
  hideHeaderActions?: boolean;
}

export function InvoiceList({
  clientId,
  caseId,
  hideHeaderActions = false,
}: InvoiceListProps) {
  const {
    invoices,
    openInvoiceDetail,
    openPaymentCreateModal,
    openInvoiceCreateModal,
    cancelInvoice,
  } = useFinanceStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [ncfFilter, setNcfFilter] = useState<string>("todos");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Filtros contextuales
      if (clientId && inv.clientId !== clientId) return false;
      if (caseId && inv.caseId !== caseId) return false;

      // Filtro de estado
      if (statusFilter !== "todas" && inv.status !== statusFilter) return false;

      // Filtro de NCF
      if (ncfFilter !== "todos" && inv.ncfType !== ncfFilter) return false;

      // Búsqueda textual
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        inv.number.toLowerCase().includes(term) ||
        inv.ncf.toLowerCase().includes(term) ||
        inv.clientName.toLowerCase().includes(term) ||
        (inv.caseNumber && inv.caseNumber.toLowerCase().includes(term)) ||
        (inv.clientRncCedula && inv.clientRncCedula.toLowerCase().includes(term))
      );
    });
  }, [invoices, clientId, caseId, statusFilter, ncfFilter, search]);

  const { openEmitModal } = useEcfStore();

  const handleEmitAsEcf = (inv: Invoice) => {
    const ecfTypeMap: Record<string, "E31" | "E32" | "E34" | "E44" | "E45"> = {
      B01: "E31",
      B02: "E32",
      B14: "E44",
      B15: "E45",
    };
    const targetType = ecfTypeMap[inv.ncfType] || "E31";

    openEmitModal({
      ecfType: targetType,
      rncComprador: inv.clientRncCedula || "",
      razonSocialComprador: inv.clientName,
      currency: inv.currency,
      exchangeRate: inv.exchangeRate,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      items: inv.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        appliesTax: it.appliesTax,
      })),
    });
  };

  const handleCancelInvoice = (inv: Invoice) => {
    if (confirm(`¿Está seguro de anular la factura ${inv.number} (${inv.ncf})? Esta acción revertirá los saldos pendientes.`)) {
      cancelInvoice(inv.id);
      toast.success(`Factura ${inv.number} anulada correctamente`);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Controles de Búsqueda y Filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, NCF, cliente o expediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="todas">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="emitida">Emitida</option>
              <option value="parcial">Parcial</option>
              <option value="pagada">Pagada</option>
              <option value="vencida">Vencida</option>
              <option value="anulada">Anulada</option>
            </select>

            <select
              value={ncfFilter}
              onChange={(e) => setNcfFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900 hidden sm:block"
            >
              <option value="todos">Todos los NCF</option>
              <option value="B01">B01 - Crédito Fiscal</option>
              <option value="B02">B02 - Consumo</option>
              <option value="B14">B14 - Régimen Especial</option>
              <option value="B15">B15 - Gubernamental</option>
            </select>
          </div>
        </div>

        {!hideHeaderActions && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => openInvoiceCreateModal(clientId, caseId)}
              size="sm"
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nueva Factura
            </Button>
          </div>
        )}
      </div>

      {/* Tabla de Facturas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Comprobante / NCF</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Expediente</th>
              <th className="py-3 px-4">Fecha Emisión</th>
              <th className="py-3 px-4">Vencimiento</th>
              <th className="py-3 px-4 text-right">Total Facturado</th>
              <th className="py-3 px-4 text-right">Saldo Pendiente</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">No se encontraron facturas</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta con otros filtros de búsqueda o emite una nueva factura.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const statusMeta = INVOICE_STATUS_LABELS[inv.status];
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => openInvoiceDetail(inv)}
                  >
                    {/* Comprobante / NCF */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {inv.number}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 font-medium">
                        {inv.ncf} <span className="text-[10px] text-slate-400">({inv.ncfType})</span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[180px]">
                        {inv.clientName}
                      </div>
                      {inv.clientRncCedula && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {inv.clientRncCedula}
                        </div>
                      )}
                    </td>

                    {/* Expediente */}
                    <td className="py-3 px-4">
                      {inv.caseNumber ? (
                        <div>
                          <span className="font-mono text-slate-900 font-medium">
                            {inv.caseNumber}
                          </span>
                          {inv.caseTitle && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {inv.caseTitle}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">N/A (General)</span>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.dueDate)}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatMoney(inv.total, inv.currency)}
                    </td>

                    {/* Saldo Pendiente */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <span
                        className={
                          inv.balance > 0
                            ? inv.status === "vencida"
                              ? "text-rose-600 font-bold"
                              : "text-slate-900 font-medium"
                            : "text-slate-400"
                        }
                      >
                        {formatMoney(inv.balance, inv.currency)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={() => openInvoiceDetail(inv)}
                            className="cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-2 text-slate-600" />
                            Ver / Imprimir Factura
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEmitAsEcf(inv)}
                            className="cursor-pointer text-slate-800 font-medium"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            Emitir como e-CF (DGII)
                          </DropdownMenuItem>
                          {inv.balance > 0 && inv.status !== "anulada" && (
                            <DropdownMenuItem
                              onClick={() => openPaymentCreateModal(inv)}
                              className="cursor-pointer text-emerald-700 font-medium"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Registrar Cobro
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {inv.status !== "anulada" && (
                            <DropdownMenuItem
                              onClick={() => handleCancelInvoice(inv)}
                              className="cursor-pointer text-rose-600 focus:text-rose-700"
                            >
                              <Ban className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Anular Factura
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla con resumen */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          Mostrando <span className="font-semibold text-slate-700">{filteredInvoices.length}</span>{" "}
          facturas registradas
        </div>
        <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
          <div>
            Total:{" "}
            <span className="font-bold text-slate-900">
              {formatMoney(
                filteredInvoices
                  .filter((i) => i.status !== "anulada")
                  .reduce((sum, i) => sum + i.total, 0),
                "DOP"
              )}
            </span>
          </div>
          <div>
            Saldo Pendiente:{" "}
            <span className="font-bold text-slate-900">
              {formatMoney(
                filteredInvoices
                  .filter((i) => i.status !== "anulada")
                  .reduce((sum, i) => sum + i.balance, 0),
                "DOP"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

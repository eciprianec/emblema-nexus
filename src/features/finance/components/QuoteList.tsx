"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "../store/useFinanceStore";
import { QUOTE_STATUS_LABELS, QuoteStatus, Quote } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  FileCheck,
  ArrowRight,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuoteListProps {
  clientId?: string;
  caseId?: string;
  hideHeaderActions?: boolean;
}

export function QuoteList({
  clientId,
  caseId,
  hideHeaderActions = false,
}: QuoteListProps) {
  const {
    quotes,
    openQuoteCreateModal,
    approveQuote,
    updateQuoteStatus,
    convertQuoteToInvoice,
    invoices,
    openInvoiceDetail,
  } = useFinanceStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (clientId && q.clientId !== clientId) return false;
      if (caseId && q.caseId !== caseId) return false;

      if (statusFilter !== "todas" && q.status !== statusFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        q.number.toLowerCase().includes(term) ||
        q.clientName.toLowerCase().includes(term) ||
        (q.caseNumber && q.caseNumber.toLowerCase().includes(term))
      );
    });
  }, [quotes, clientId, caseId, statusFilter, search]);

  const handleConvert = (quote: Quote) => {
    try {
      const inv = convertQuoteToInvoice(quote.id, "B01");
      toast.success(
        `Cotización ${quote.number} convertida exitosamente a Factura ${inv.number} (NCF ${inv.ncf})`
      );
    } catch (err: any) {
      toast.error(err.message || "Error al convertir cotización");
    }
  };

  const handleApprove = (quote: Quote) => {
    approveQuote(quote.id);
    toast.success(`Cotización ${quote.number} marcada como aprobada`);
  };

  const handleReject = (quote: Quote) => {
    updateQuoteStatus(quote.id, "rechazada");
    toast.info(`Cotización ${quote.number} marcada como rechazada`);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Controles de búsqueda y filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número de cotización, cliente o caso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="todas">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
            <option value="facturada">Facturada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>

        {!hideHeaderActions && (
          <Button
            onClick={() => openQuoteCreateModal(clientId, caseId)}
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {/* Tabla de cotizaciones */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Cotización No.</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Expediente</th>
              <th className="py-3 px-4">Emisión</th>
              <th className="py-3 px-4">Validez Hasta</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
              <th className="py-3 px-4 text-right">Total Presupuestado</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <FileCheck className="h-8 w-8 mb-2 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">No se encontraron cotizaciones</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cree una nueva cotización formal para presentar propuestas a clientes.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredQuotes.map((quote) => {
                const statusMeta = QUOTE_STATUS_LABELS[quote.status];
                const linkedInvoice = quote.convertedInvoiceId
                  ? invoices.find((i) => i.id === quote.convertedInvoiceId)
                  : null;

                return (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    {/* Número */}
                    <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                      {quote.number}
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[180px]">
                        {quote.clientName}
                      </div>
                      {quote.clientRncCedula && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {quote.clientRncCedula}
                        </div>
                      )}
                    </td>

                    {/* Expediente */}
                    <td className="py-3 px-4">
                      {quote.caseNumber ? (
                        <span className="font-mono text-slate-800 font-medium">
                          {quote.caseNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(quote.issueDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(quote.validUntil)}
                    </td>

                    {/* Montos */}
                    <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatMoney(quote.subtotal, quote.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(quote.total, quote.currency)}
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
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {quote.status === "facturada" && linkedInvoice ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvoiceDetail(linkedInvoice)}
                            className="text-slate-600 hover:text-slate-900 text-[11px] h-7 px-2"
                            title="Ver Factura Emitida"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            {linkedInvoice.number}
                          </Button>
                        ) : (
                          <>
                            {quote.status !== "aprobada" && quote.status !== "rechazada" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(quote)}
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 text-[11px] h-7 px-2"
                                title="Aprobar presupuesto"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Aprobar
                              </Button>
                            )}

                            {(quote.status === "aprobada" || quote.status === "enviada") && (
                              <Button
                                size="sm"
                                onClick={() => handleConvert(quote)}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] h-7 px-2.5 font-medium"
                                title="Convertir a Factura Comercial con NCF"
                              >
                                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                Convertir a Factura
                              </Button>
                            )}

                            {quote.status !== "rechazada" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(quote)}
                                className="text-slate-400 hover:text-rose-600 text-[11px] h-7 px-1.5"
                                title="Rechazar presupuesto"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Mostrando <span className="font-semibold text-slate-700">{filteredQuotes.length}</span>{" "}
          cotizaciones registradas
        </div>
        <div className="font-mono text-[11px]">
          Total Presupuestado:{" "}
          <span className="font-bold text-slate-900">
            {formatMoney(
              filteredQuotes.reduce((sum, q) => sum + q.total, 0),
              "DOP"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "../store/useFinanceStore";
import { formatMoney } from "@/lib/utils";
import {
  Clock,
  Search,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CxcAgingTable() {
  const { getAgingReport, openPaymentCreateModal, invoices } = useFinanceStore();
  const [search, setSearch] = useState("");

  const agingData = getAgingReport();

  const filteredAging = useMemo(() => {
    if (!search.trim()) return agingData;
    const term = search.toLowerCase();
    return agingData.filter(
      (c) =>
        c.clientName.toLowerCase().includes(term) ||
        (c.clientRncCedula && c.clientRncCedula.toLowerCase().includes(term))
    );
  }, [agingData, search]);

  // Totales acumulados
  const totalDebt = agingData.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalCurrent = agingData.reduce((sum, c) => sum + c.current, 0);
  const total1To30 = agingData.reduce((sum, c) => sum + c.days1To30, 0);
  const total31To60 = agingData.reduce((sum, c) => sum + c.days31To60, 0);
  const total61To90 = agingData.reduce((sum, c) => sum + c.days61To90, 0);
  const totalOver90 = agingData.reduce((sum, c) => sum + c.daysOver90, 0);

  const totalOverdue = total1To30 + total31To60 + total61To90 + totalOver90;
  const overduePercentage =
    totalDebt > 0 ? ((totalOverdue / totalDebt) * 100).toFixed(1) : "0.0";

  const handlePayClient = (clientId: string) => {
    // Buscar la factura vencida más prioritaria o la primera con saldo pendiente
    const pendingInv = invoices
      .filter((i) => i.clientId === clientId && i.balance > 0 && i.status !== "anulada")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    openPaymentCreateModal(pendingInv);
  };

  return (
    <div className="space-y-4">
      {/* KPIs de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Cartera CxC
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalDebt, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {agingData.length} clientes con cuentas pendientes
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Cartera Corriente (Al Día)
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(totalCurrent, "DOP")}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            Sin vencer / dentro de plazo
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Cartera Vencida (En Mora)
          </span>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {formatMoney(totalOverdue, "DOP")}
          </div>
          <div className="text-xs text-rose-700 font-medium mt-1">
            {overduePercentage}% del saldo total
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Mora Crítica (+60 Días)
          </span>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            {formatMoney(total61To90 + totalOver90, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Requiere gestión de cobro formal
          </div>
        </div>
      </div>

      {/* Tabla de Antigüedad */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Análisis de Antigüedad de Saldos por Cliente
            </h3>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Cliente / RNC</th>
                <th className="py-3 px-3 text-center">Facturas</th>
                <th className="py-3 px-3 text-right">Corriente</th>
                <th className="py-3 px-3 text-right">1 - 30 Días</th>
                <th className="py-3 px-3 text-right">31 - 60 Días</th>
                <th className="py-3 px-3 text-right">61 - 90 Días</th>
                <th className="py-3 px-3 text-right">+90 Días</th>
                <th className="py-3 px-4 text-right">Total Deuda</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredAging.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 mb-2 stroke-1 text-emerald-500" />
                      <p className="text-sm font-medium text-slate-700">No hay cuentas por cobrar pendientes</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Toda la cartera de clientes se encuentra al día o saldada.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAging.map((row) => (
                  <tr key={row.clientId} className="hover:bg-slate-50 transition-colors">
                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{row.clientName}</div>
                      {row.clientRncCedula && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {row.clientRncCedula}
                        </div>
                      )}
                    </td>

                    {/* Conteo Facturas */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {row.invoiceCount}
                      </span>
                    </td>

                    {/* Corriente */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {row.current > 0 ? formatMoney(row.current, "DOP") : "-"}
                    </td>

                    {/* 1 - 30 */}
                    <td className="py-3 px-3 text-right font-mono">
                      {row.days1To30 > 0 ? (
                        <span className="text-amber-700 font-medium">
                          {formatMoney(row.days1To30, "DOP")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* 31 - 60 */}
                    <td className="py-3 px-3 text-right font-mono">
                      {row.days31To60 > 0 ? (
                        <span className="text-amber-800 font-semibold">
                          {formatMoney(row.days31To60, "DOP")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* 61 - 90 */}
                    <td className="py-3 px-3 text-right font-mono">
                      {row.days61To90 > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {formatMoney(row.days61To90, "DOP")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* +90 */}
                    <td className="py-3 px-3 text-right font-mono">
                      {row.daysOver90 > 0 ? (
                        <span className="text-rose-700 font-extrabold">
                          {formatMoney(row.daysOver90, "DOP")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Total Deuda */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMoney(row.totalDebt, "DOP")}
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        onClick={() => handlePayClient(row.clientId)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-medium shadow-2xs"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        Registrar Cobro
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Fila de Totales */}
            {filteredAging.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-[11px]">
                  <td className="py-3 px-4 text-slate-900 uppercase">Totales Cartera:</td>
                  <td className="py-3 px-3 text-center text-slate-800">
                    {filteredAging.reduce((s, c) => s + c.invoiceCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    {formatMoney(totalCurrent, "DOP")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700">
                    {formatMoney(total1To30, "DOP")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-800">
                    {formatMoney(total31To60, "DOP")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-600">
                    {formatMoney(total61To90, "DOP")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-700">
                    {formatMoney(totalOver90, "DOP")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 text-xs">
                    {formatMoney(totalDebt, "DOP")}
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

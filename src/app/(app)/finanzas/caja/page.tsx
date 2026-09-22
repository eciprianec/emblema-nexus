"use client";

import { useState } from "react";
import { useFinanceStore } from "@/features/finance/store/useFinanceStore";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  User,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/forms/MoneyInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CajaChicaPage() {
  const {
    pettyCashMovements,
    pettyCashBalance,
    pettyCashLimit,
    pettyCashCustodian,
    addPettyCashMovement,
  } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<"ingreso" | "egreso">("egreso");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [responsible, setResponsible] = useState("Licda. Altagracia Rosario");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [caseNumber, setCaseNumber] = useState("");

  const fundPercentage = ((pettyCashBalance / (pettyCashLimit || 1)) * 100).toFixed(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!concept.trim()) {
      toast.error("Ingrese el concepto del movimiento de caja chica.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Ingrese un monto válido.");
      return;
    }

    if (movementType === "egreso" && amount > pettyCashBalance) {
      toast.error("Saldo insuficiente en caja chica para este egreso.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    addPettyCashMovement({
      date: today,
      type: movementType,
      concept,
      amount,
      responsible,
      voucherNumber: voucherNumber || undefined,
      caseNumber: caseNumber || undefined,
    });

    toast.success(
      `${movementType === "ingreso" ? "Reposición" : "Egreso"} de ${formatMoney(amount, "DOP")} registrado en caja chica`
    );

    setIsModalOpen(false);
    setConcept("");
    setAmount(undefined);
    setVoucherNumber("");
    setCaseNumber("");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Arqueo y Movimientos de Caja Chica
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administración del fondo fijo rotatorio para diligencias judiciales menores, mensajería y gastos urgentes.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nuevo Vale / Movimiento
        </Button>
      </div>

      {/* Tarjetas de Arqueo de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Saldo Actual en Caja
            </span>
            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2">
            {formatMoney(pettyCashBalance, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {fundPercentage}% del fondo asignado
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Límite Fondo Fijo
            </span>
            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-700 mt-2">
            {formatMoney(pettyCashLimit, "DOP")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Monto autorizado por gerencia
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Custodio del Fondo
            </span>
            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2 truncate">
            {pettyCashCustodian}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Administración Central
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Estado de Reposición
            </span>
            <div className="h-8 w-8 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-700">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-2">
            {pettyCashBalance > pettyCashLimit * 0.3 ? "Fondo Óptimo" : "Reposición Requerida"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Umbral mínimo: RD$ 7,500.00
          </div>
        </div>
      </div>

      {/* Historial de Vales y Movimientos */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Libro Diario de Caja Chica (Entradas y Salidas)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {pettyCashMovements.length} movimientos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-3 text-center">Tipo</th>
                <th className="py-3 px-4">Concepto / Motivo</th>
                <th className="py-3 px-3">Vale No.</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-3">Expediente</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Saldo en Caja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {pettyCashMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {formatDate(mov.date)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        mov.type === "ingreso"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {mov.type === "ingreso" ? "Entrada (+)" : "Salida (-)"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {mov.concept}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {mov.voucherNumber || "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {mov.responsible}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {mov.caseNumber || "-"}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                      mov.type === "ingreso" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {mov.type === "ingreso" ? "+" : "-"}
                    {formatMoney(mov.amount, "DOP")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatMoney(mov.balanceAfter, "DOP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear Movimiento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Wallet className="h-5 w-5 text-slate-700" />
              Nuevo Movimiento de Caja Chica
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Movimiento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={movementType === "egreso" ? "default" : "outline"}
                  onClick={() => setMovementType("egreso")}
                  className={movementType === "egreso" ? "bg-rose-700 hover:bg-rose-800 text-white text-xs h-8" : "text-xs h-8"}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  Egreso (Gasto)
                </Button>
                <Button
                  type="button"
                  variant={movementType === "ingreso" ? "default" : "outline"}
                  onClick={() => setMovementType("ingreso")}
                  className={movementType === "ingreso" ? "bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8" : "text-xs h-8"}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
                  Ingreso (Reposición)
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Concepto / Motivo *</Label>
              <Input
                type="text"
                placeholder="Ej: Copias judiciales o taxi diligencia..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Monto *</Label>
              <MoneyInput
                currency="DOP"
                value={amount}
                onChange={(val) => setAmount(val)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">No. Vale</Label>
                <Input
                  type="text"
                  placeholder="Ej: EG-104"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Expediente (Opcional)</Label>
                <Input
                  type="text"
                  placeholder="Ej: LEG-2024-0001"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Responsable</Label>
              <Input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="border-t border-slate-200 pt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
              >
                Guardar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

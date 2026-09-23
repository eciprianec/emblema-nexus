"use client";

import { useState } from "react";
import { useReportsStore } from "../store/useReportsStore";
import { formatMoney, formatRnc, formatCedula, validateRnc, validateCedula } from "@/lib/utils";
import {
  FileCheck2,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  Copy,
  Info,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DGII_606_BIENES_SERVICIOS,
  DGII_607_TIPOS_INGRESO,
  DGII_608_TIPOS_ANULACION,
  DGII_FORMAS_PAGO,
  COMPANIES_MAP,
} from "../types";
import { generate606Txt, generate607Txt, generate608Txt } from "../utils/dgiiExport";
import { toast } from "sonner";

export function DgiiReportViewer() {
  const [activeTab, setActiveTab] = useState<"607" | "606" | "608">("607");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const {
    selectedPeriod,
    selectedCompany,
    getFiltered607,
    getFiltered606,
    getFiltered608,
    download607Txt,
    download606Txt,
    download608Txt,
    download607Csv,
    download606Csv,
  } = useReportsStore();

  const records607 = getFiltered607();
  const records606 = getFiltered606();
  const records608 = getFiltered608();

  // Cálculos de totales para 607
  const total607Facturado = records607.reduce((sum, r) => sum + r.montoFacturado, 0);
  const total607Itbis = records607.reduce((sum, r) => sum + r.itbisFacturado, 0);
  const total607ItbisRetenido = records607.reduce((sum, r) => sum + r.itbisRetenidoTerceros, 0);

  // Cálculos de totales para 606
  const total606Facturado = records606.reduce((sum, r) => sum + r.totalFacturado, 0);
  const total606Itbis = records606.reduce((sum, r) => sum + r.itbisFacturado, 0);
  const total606ItbisRetenido = records606.reduce((sum, r) => sum + r.itbisRetenido, 0);
  const total606RetencionRenta = records606.reduce((sum, r) => sum + r.retencionRenta, 0);

  // Apertura de vista previa de archivo plano
  const handleOpenPreview = () => {
    const rnc = COMPANIES_MAP[selectedCompany]?.rnc || "131897452";
    const periodStr = selectedPeriod === "2026-ANUAL" ? "202603" : selectedPeriod;

    if (activeTab === "607") {
      const content = generate607Txt(records607, rnc, periodStr);
      setPreviewContent(content);
      setPreviewTitle(`DGII_F_607_${rnc}_${periodStr.replace("-", "")}.txt`);
    } else if (activeTab === "606") {
      const content = generate606Txt(records606, rnc, periodStr);
      setPreviewContent(content);
      setPreviewTitle(`DGII_F_606_${rnc}_${periodStr.replace("-", "")}.txt`);
    } else {
      const content = generate608Txt(records608, rnc, periodStr);
      setPreviewContent(content);
      setPreviewTitle(`DGII_F_608_${rnc}_${periodStr.replace("-", "")}.txt`);
    }
    setPreviewOpen(true);
  };

  const copyPreviewToClipboard = () => {
    navigator.clipboard.writeText(previewContent);
    toast.success("Contenido plano copiado al portapapeles.");
  };

  const formatDocNumber = (doc: string, tipoId: string) => {
    const clean = doc.replace(/[^0-9]/g, "");
    if (tipoId === "1" || clean.length === 9) {
      return formatRnc(clean);
    }
    if (tipoId === "2" || clean.length === 11) {
      return formatCedula(clean);
    }
    return doc;
  };

  const isDocValid = (doc: string, tipoId: string) => {
    const clean = doc.replace(/[^0-9]/g, "");
    if (tipoId === "1" || clean.length === 9) {
      return validateRnc(clean);
    }
    if (tipoId === "2" || clean.length === 11) {
      return validateCedula(clean);
    }
    return clean.length >= 9;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Barra de Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-slate-700" />
            Centro de Reportes Fiscales DGII
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generación y auditoría de archivos planos oficiales (606, 607 y 608) conforme a la Norma General 07-2018 y Ley 32-23 de Facturación Electrónica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenPreview}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 h-8 gap-1.5"
          >
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            Vista Previa Plano (.txt)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (activeTab === "607") download607Csv();
              else if (activeTab === "606") download606Csv();
            }}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 h-8 gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Descargar CSV (Excel)
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "607") download607Txt();
              else if (activeTab === "606") download606Txt();
              else download608Txt();
            }}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold h-8 gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-100" />
            Descargar Oficial DGII (.txt)
          </Button>
        </div>
      </div>

      {/* Tabs Principales: 607 (Ventas), 606 (Compras), 608 (Anulados) */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="607" className="text-xs font-medium gap-1.5 px-4">
              <span>Formato 607 (Ventas y e-NCF)</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-200 text-slate-700">
                {records607.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="606" className="text-xs font-medium gap-1.5 px-4">
              <span>Formato 606 (Compras y Gastos)</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-200 text-slate-700">
                {records606.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="608" className="text-xs font-medium gap-1.5 px-4">
              <span>Formato 608 (Comprobantes Anulados)</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-200 text-slate-700">
                {records608.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Período Fiscal:</span>
            <Badge variant="outline" className="text-xs font-mono font-bold bg-slate-50 text-slate-800">
              {selectedPeriod}
            </Badge>
          </div>
        </div>

        {/* ================= PESTAÑA FORMATO 607 (VENTAS) ================= */}
        <TabsContent value="607" className="space-y-4 mt-4">
          {/* Métricas Resumen 607 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Monto Total Facturado</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total607Facturado, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">{records607.length} comprobantes reportados</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">ITBIS Facturado (18%)</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total607Itbis, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">Base generadora de débito fiscal</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">ITBIS Retenido por Terceros</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total607ItbisRetenido, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">Retenciones practicadas por agentes</span>
            </div>
          </div>

          {/* Tabla Formato 607 */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">RNC / Cédula Receptor</th>
                    <th className="py-2.5 px-3">Tipo Id</th>
                    <th className="py-2.5 px-3">NCF / e-NCF</th>
                    <th className="py-2.5 px-3">Tipo Ingreso</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3 text-right">Monto Facturado</th>
                    <th className="py-2.5 px-3 text-right">ITBIS Facturado</th>
                    <th className="py-2.5 px-3 text-right">ITBIS Retenido</th>
                    <th className="py-2.5 px-3">Forma Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records607.map((r, idx) => {
                    const valid = isDocValid(r.rncCedula, r.tipoId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{r.clientName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-600">{formatDocNumber(r.rncCedula, r.tipoId)}</span>
                            {valid ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Válido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 gap-0.5">
                                <AlertCircle className="h-2.5 w-2.5" />
                                Revisar
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono">{r.tipoId === "1" ? "1 - RNC" : "2 - Cédula"}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-semibold text-slate-900">{r.ncf}</div>
                          <div className="mt-0.5">
                            {r.esElectronico ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                                e-NCF Electrónico
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-300">
                                NCF Tradicional
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-slate-600">
                            {DGII_607_TIPOS_INGRESO[r.tipoIngreso] || r.tipoIngreso}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {r.fechaComprobante.replace(/(\d{4})(\d{2})(\d{2})/, "$3/$2/$1")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatMoney(r.montoFacturado, "DOP")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatMoney(r.itbisFacturado, "DOP")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatMoney(r.itbisRetenidoTerceros, "DOP")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-slate-600">
                            {r.chequeTransferencia > 0 ? "Transferencia / Depósito" : "Efectivo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {records607.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No hay registros en el Formato 607 para el período y empresa seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= PESTAÑA FORMATO 606 (COMPRAS Y GASTOS) ================= */}
        <TabsContent value="606" className="space-y-4 mt-4">
          {/* Métricas Resumen 606 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Total Gastos Facturados</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total606Facturado, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">{records606.length} compras reportadas</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">ITBIS Facturado</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total606Itbis, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">Crédito fiscal deducible</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">ITBIS Retenido</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total606ItbisRetenido, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">Retención a proveedores</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Retención Renta ISR</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatMoney(total606RetencionRenta, "DOP")}
              </div>
              <span className="text-[10px] text-slate-500">Retención Ley 11-92</span>
            </div>
          </div>

          {/* Tabla Formato 606 */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Suplidor / Proveedor</th>
                    <th className="py-2.5 px-3">Clasificación DGII (01-11)</th>
                    <th className="py-2.5 px-3">NCF / e-NCF</th>
                    <th className="py-2.5 px-3">Fecha Comp.</th>
                    <th className="py-2.5 px-3 text-right">Servicios</th>
                    <th className="py-2.5 px-3 text-right">Bienes</th>
                    <th className="py-2.5 px-3 text-right">Total Facturado</th>
                    <th className="py-2.5 px-3 text-right">ITBIS Facturado</th>
                    <th className="py-2.5 px-3">Forma Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records606.map((r, idx) => {
                    const valid = isDocValid(r.rncCedula, r.tipoId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{r.supplierName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-600">{formatDocNumber(r.rncCedula, r.tipoId)}</span>
                            {valid ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                RNC Verificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                Revisar
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-slate-700 font-medium">
                            {DGII_606_BIENES_SERVICIOS[r.tipoBienesServicios] || r.tipoBienesServicios}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-semibold text-slate-900">{r.ncf}</div>
                          <div className="mt-0.5">
                            {r.esElectronico ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                                e-NCF Suplidor
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-300">
                                NCF Físico
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {r.fechaComprobante.replace(/(\d{4})(\d{2})(\d{2})/, "$3/$2/$1")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {r.montoServicios > 0 ? formatMoney(r.montoServicios, "DOP") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {r.montoBienes > 0 ? formatMoney(r.montoBienes, "DOP") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatMoney(r.totalFacturado, "DOP")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatMoney(r.itbisFacturado, "DOP")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-slate-600">
                            {DGII_FORMAS_PAGO[r.formaPago] || r.formaPago}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {records606.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No hay registros en el Formato 606 para el período y empresa seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= PESTAÑA FORMATO 608 (ANULADOS) ================= */}
        <TabsContent value="608" className="space-y-4 mt-4">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">NCF / e-NCF Anulado</th>
                    <th className="py-2.5 px-3">Fecha Anulación</th>
                    <th className="py-2.5 px-3">Tipo Anulación DGII</th>
                    <th className="py-2.5 px-3">Motivo / Causa Explicativa</th>
                    <th className="py-2.5 px-3 text-center">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records608.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-rose-700">{r.ncf}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.fechaAnulacion.replace(/(\d{4})(\d{2})(\d{2})/, "$3/$2/$1")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {DGII_608_TIPOS_ANULACION[r.tipoAnulacion] || r.tipoAnulacion}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{r.motivo}</td>
                      <td className="py-2.5 px-3 text-center">
                        {r.esElectronico ? (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300">
                            e-NCF
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-300">
                            Físico
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {records608.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hay comprobantes anulados para el período seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Vista Previa de Archivo Plano Oficial DGII (.txt) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileCode className="h-5 w-5 text-slate-700" />
              Vista Previa de Archivo Plano DGII
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Estructura oficial delimitada por plecas (<code>|</code>) lista para cargar en la Oficina Virtual (OFV) de la DGII.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs bg-slate-100 px-3 py-1.5 rounded-md font-mono text-slate-700">
              <span>Nombre archivo sugerido: <strong>{previewTitle}</strong></span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyPreviewToClipboard}
                className="h-7 text-xs gap-1 text-slate-700 hover:text-slate-900"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>

            <div className="p-3 bg-slate-950 text-emerald-400 rounded-md font-mono text-[11px] overflow-x-auto max-h-80 whitespace-pre leading-relaxed select-all">
              {previewContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

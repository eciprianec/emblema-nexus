"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEcfStore } from "../store/useEcfStore";
import { ECF_TYPE_MAP, ECF_STATUS_MAP } from "../types";
import { formatMoney, formatDate } from "@/lib/utils";
import { QrCodeSvg } from "./QrCodeSvg";
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
} from "lucide-react";

// Función auxiliar para convertir números a palabras en español para comprobantes fiscales
function numeroALetrasDOP(numero: number): string {
  const unidades = [
    "",
    "UN",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
    "VEINTE",
  ];
  const decenas = [
    "",
    "",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  const entero = Math.floor(numero);
  const centavos = Math.round((numero - entero) * 100);
  const centavosStr = String(centavos).padStart(2, "0");

  if (entero === 0) return `CERO PESOS DOMINICANOS CON ${centavosStr}/100`;

  function convertirGrupo(n: number): string {
    if (n === 100) return "CIEN";
    let res = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) res += centenas[c] + " ";
    if (d === 1 || (d === 2 && u <= 9)) {
      const idx = d * 10 + u;
      if (idx <= 20) {
        res += unidades[idx] + " ";
        return res.trim();
      }
    }
    if (d > 1) {
      res += decenas[d];
      if (u > 0) res += " Y " + unidades[u];
      res += " ";
    } else if (u > 0) {
      res += unidades[u] + " ";
    }
    return res.trim();
  }

  let letras = "";
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    letras += (millones === 1 ? "UN MILLÓN" : `${convertirGrupo(millones)} MILLONES`) + " ";
  }
  if (miles > 0) {
    letras += (miles === 1 ? "MIL" : `${convertirGrupo(miles)} MIL`) + " ";
  }
  if (resto > 0) {
    letras += convertirGrupo(resto) + " ";
  }

  return `${letras.trim()} PESOS DOMINICANOS CON ${centavosStr}/100`;
}

export function EcfPrintRepresentationModal() {
  const { selectedEcfForPrint, isPrintModalOpen, closePrintModal, openTrackIdModal } = useEcfStore();

  if (!selectedEcfForPrint) return null;

  const ecf = selectedEcfForPrint;
  const typeInfo = ECF_TYPE_MAP[ecf.ecfType];
  const statusMeta = ECF_STATUS_MAP[ecf.dgiiStatus];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isPrintModalOpen} onOpenChange={closePrintModal}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border border-slate-300">
        {/* Barra superior de herramientas (no imprimible) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold">
              Representación Impresa e-CF ({ecf.eNCF})
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openTrackIdModal(ecf.trackId, ecf)}
              className="text-white border-slate-700 hover:bg-slate-800 text-xs h-7"
            >
              Auditar TrackId DGII
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="bg-white text-slate-900 hover:bg-slate-100 text-xs h-7 font-medium"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Imprimir / Guardar PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closePrintModal}
              className="h-7 w-7 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* DOCUMENTO FISCAL OFICIAL (Representación Impresa según norma DGII) */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Encabezado con Membrete y Cuadro Fiscal e-NCF */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div className="max-w-[55%]">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {ecf.razonSocialEmisor}
              </h1>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                Servicios Jurídicos, Agrimensura Catastral e Inmobiliaria
              </p>
              <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                <p>
                  <span className="font-semibold text-slate-900">RNC Emisor:</span>{" "}
                  <span className="font-mono font-bold text-slate-900">1-31-98765-4</span>
                </p>
                <p>Av. Winston Churchill No. 1099, Torre Acrópolis, Piso 14, Piantini</p>
                <p>Santo Domingo, Distrito Nacional, República Dominicana</p>
                <p>Teléfono: (809) 555-0100 | Correo: tributacion@emblemanexus.com.do</p>
              </div>
            </div>

            {/* Recuadro e-CF DGII */}
            <div className="border-2 border-slate-900 rounded-sm p-4 w-72 bg-slate-50/70 text-right">
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-600">
                Comprobante Fiscal Electrónico (e-CF)
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 uppercase">
                {typeInfo ? typeInfo.name : ecf.ecfType}
              </div>

              <div className="mt-2 border-t border-slate-300 pt-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Número de Comprobante (e-NCF)
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-900 tracking-wider">
                  {ecf.eNCF}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-600 space-y-0.5 border-t border-slate-200 pt-1.5">
                <div>
                  <span className="font-semibold">Vencimiento Secuencia:</span>{" "}
                  <span className="font-mono">{formatDate(ecf.fechaVencimientoSecuencia)}</span>
                </div>
                {ecf.invoiceNumber && (
                  <div>
                    <span className="font-semibold">Doc. Interno Ref:</span>{" "}
                    <span className="font-mono">{ecf.invoiceNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Datos del Receptor y Fechas */}
          <div className="grid grid-cols-2 gap-6 my-5 p-4 bg-slate-50 rounded-sm border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Datos del Comprador / Receptor
              </span>
              <p className="text-sm font-bold text-slate-900">
                {ecf.razonSocialComprador}
              </p>
              <p className="text-slate-700 mt-1">
                <span className="font-semibold text-slate-900">RNC / Cédula Receptor:</span>{" "}
                <span className="font-mono font-bold">{ecf.rncComprador}</span>
              </p>
              <p className="text-slate-600 mt-0.5">
                <span className="font-semibold">Tipo Comprobante:</span> {typeInfo.shortName}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-600">Fecha de Emisión:</span>{" "}
                <span className="font-bold text-slate-900 font-mono">{formatDate(ecf.fechaEmision)}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Moneda de Liquidación:</span>{" "}
                <span className="font-bold text-slate-900">
                  {ecf.currency === "DOP" ? "Pesos Dominicanos (DOP)" : "Dólares Americanos (USD)"}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Estado de Timbrado:</span>{" "}
                <span className="font-bold text-emerald-700 uppercase">Aceptado por DGII</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Validez Fiscal:</span>{" "}
                <span className="text-slate-900">Conforme Ley 32-23 de Facturación Electrónica</span>
              </p>
            </div>
          </div>

          {/* Tabla de Renglones / Servicios */}
          <table className="w-full text-left border-collapse text-xs my-5">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 text-center w-12">Cant.</th>
                <th className="py-2.5 px-3">Descripción de Bienes / Servicios Prestados</th>
                <th className="py-2.5 px-3 text-right w-28">Precio Unit.</th>
                <th className="py-2.5 px-3 text-center w-20">ITBIS</th>
                <th className="py-2.5 px-3 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ecf.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {item.description}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    {formatMoney(item.unitPrice, ecf.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.appliesTax ? (
                      <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                        18%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Exento</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatMoney(item.total, ecf.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales y Letras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 items-start">
            <div className="border border-slate-200 rounded-sm p-3 bg-slate-50 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Importe en Letras
              </span>
              <p className="font-semibold text-slate-900 text-xs italic leading-relaxed">
                SON: {numeroALetrasDOP(ecf.montoTotal)}
              </p>
            </div>

            <div className="border border-slate-200 rounded-sm p-4 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal Gravado / Exento:</span>
                <span className="font-mono font-medium">{formatMoney(ecf.montoSubtotal, ecf.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>ITBIS Liquidado (18%):</span>
                <span className="font-mono font-medium">{formatMoney(ecf.montoItbis, ecf.currency)}</span>
              </div>
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                <span>TOTAL e-CF ({ecf.currency}):</span>
                <span className="font-mono text-base font-black">{formatMoney(ecf.montoTotal, ecf.currency)}</span>
              </div>
            </div>
          </div>

          {/* TIMBRE FISCAL DGII (Obligatorio en Representación Impresa) */}
          <div className="border-2 border-slate-900 rounded-sm p-4 bg-white mt-8 print:mt-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* QR Code Dinámico */}
              <div className="shrink-0 flex flex-col items-center">
                <QrCodeSvg value={ecf.qrUrl} size={130} />
                <span className="text-[9px] uppercase font-bold text-slate-500 mt-1 tracking-wider">
                  Escaneo Fiscal DGII
                </span>
              </div>

              {/* Datos de Seguridad y Firma */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-slate-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Timbre Electrónico de Seguridad DGII
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Código de Seguridad:
                    </span>
                    <span className="font-mono font-black text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-slate-900 tracking-wider">
                      {ecf.codigoSeguridad}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800 block">Identificador de Envío (TrackId):</span>
                    <span className="font-mono text-[10px] text-slate-900 break-all">{ecf.trackId}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">Firma Digital X.509:</span>
                    <span className="font-mono text-[10px] text-slate-700 break-all">
                      {ecf.digitalSignatureDigest}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight pt-1">
                  Certificado digital emitido por Entidad de Certificación autorizada por el Instituto Dominicano de las Telecomunicaciones (INDOTEL).
                  Consulte la autenticidad y validez fiscal de este e-CF en el portal oficial de la DGII (ecf.dgii.gov.do) mediante el escaneo del código QR o utilizando el RNC Emisor, e-NCF y Código de Seguridad de 6 dígitos.
                </p>
              </div>
            </div>
          </div>

          {/* Pie de Página Normativo */}
          <div className="mt-4 text-center text-[10px] text-slate-400 space-y-0.5">
            <p>
              Representación Impresa de Comprobante Fiscal Electrónico (e-CF) conforme a la Ley No. 32-23 y la Norma General No. 06-2018 de la Dirección General de Impuestos Internos (DGII).
            </p>
            <p>Emblema Nexus v2.0 - Plataforma de Gestión Empresarial y Facturación e-CF</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

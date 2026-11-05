import type { ReactNode } from "react";
import { FISCAL_TYPES, type FiscalType } from "@/domain/billing";
import type { BuyerSnapshot, EmitterSnapshot } from "@/services/billing/types";
import { formatIsoDate } from "./format";

/** Redacción del Informe Técnico para el código de modificación en la representación impresa. */
const MODIFICATION_WORDING: Record<number, string> = {
  1: "Anula el NCF modificado",
  2: "Corrige Texto del Comprobante Fiscal modificado",
  3: "Corrige montos del NCF modificado",
};

interface Props {
  fiscalType: string;
  ncf: string | null;
  issueDate: string;
  sequenceExpiresOn: string | null;
  modifiedNcf: string | null;
  modificationCode: number | null;
  emitter: EmitterSnapshot | null;
  buyer: BuyerSnapshot;
  /** Estado y número interno: solo en pantalla. */
  children?: ReactNode;
}

/**
 * Encabezado de la representación impresa de un e-CF (Informe Técnico, 18.2.1). Arriba a la
 * derecha, el tipo en palabras y los datos del e-NCF; arriba a la izquierda, el emisor con la
 * fecha de emisión; abajo a la izquierda, el comprador. Municipio, provincia y sucursal faltan
 * porque no se capturan.
 */
export function EcfPrintHeader({
  fiscalType,
  ncf,
  issueDate,
  sequenceExpiresOn,
  modifiedNcf,
  modificationCode,
  emitter,
  buyer,
  children,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 print:flex-nowrap">
        <div data-print-block="emisor" className="text-sm text-slate-800">
          {emitter?.tradeName && <p className="font-semibold">{emitter.tradeName}</p>}
          <p className="font-medium">{emitter?.legalName}</p>
          <p>RNC {emitter?.rnc}</p>
          <p>{emitter?.address}</p>
          <p className="mt-1">Fecha de Emisión: {formatIsoDate(issueDate)}</p>
          {children}
        </div>
        <div data-print-block="comprobante" className="text-right">
          <h1 className="text-lg font-bold text-slate-900">{FISCAL_TYPES[fiscalType as FiscalType]?.ecfName}</h1>
          <p className="font-mono text-lg font-semibold text-slate-900">{ncf ?? "Sin número fiscal"}</p>
          {sequenceExpiresOn && <p className="text-xs text-slate-600">Fecha Vencimiento: {formatIsoDate(sequenceExpiresOn)}</p>}
          {modifiedNcf && (
            <>
              <p className="mt-1 text-xs text-slate-600">
                e-NCF Modificado: <span className="font-mono">{modifiedNcf}</span>
              </p>
              <p className="text-xs text-slate-600">{MODIFICATION_WORDING[modificationCode ?? 0]}</p>
            </>
          )}
        </div>
      </div>

      <div data-print-block="comprador" className="mt-5 text-sm text-slate-800">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Comprador</h2>
        <p className="mt-1 font-medium">{buyer.name || "Consumidor final"}</p>
        {buyer.taxId && <p>RNC/Cédula {buyer.taxId}</p>}
        {buyer.foreignId && <p>ID extranjero {buyer.foreignId}</p>}
        {buyer.address && <p>{buyer.address}</p>}
      </div>
    </>
  );
}

import QRCode from "qrcode";
import { isDgiiQrUrl, toDgiiDateTime } from "@/domain/billing";
import type { EcfRecordRow } from "@/services/billing/types";

const FINAL_STATUSES = ["aceptado", "condicional"];

/**
 * Datos de consulta de la representación impresa (Informe Técnico e-CF, 18.2.3): QR abajo a
 * la izquierda, de al menos 22 x 22 mm, con 3 mm de margen y a 2 cm del borde de la hoja
 * (1 cm de la hoja, fijado en globals.css, y 1 cm aquí); debajo, el código de seguridad y la
 * fecha de firma. La URL es la del proveedor, sin alterar,
 * y solo se imprime si lleva a la consulta de la DGII.
 *
 * Un dato que el proveedor no devolvió se avisa en pantalla, pero no se imprime en el documento
 * del cliente: ahí sería una nota interna.
 */
export async function EcfPrintBlock({ ecf }: { ecf: EcfRecordRow }) {
  const url = isDgiiQrUrl(ecf.qr_code_url) ? ecf.qr_code_url : null;
  const svg = url ? await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0 }) : null;
  const signedAt =
    ecf.provider_signed_date ?? (ecf.sign_date ? toDgiiDateTime(ecf.sign_date) : null);
  // Ya aceptado, un dato que falta no es que venga en camino: el proveedor no lo devolvió.
  const isFinal = FINAL_STATUSES.includes(ecf.dgii_status);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm print:ml-[1cm] print:mb-[1cm] print:w-fit print:border-0 print:p-0">
      {svg ? (
        <div
          role="img"
          aria-label="Código QR de consulta del e-CF en la DGII"
          data-ecf-qr
          className="box-content h-[26mm] w-[26mm] bg-white p-[3mm] [&>svg]:h-full [&>svg]:w-full"
          // Lo genera la biblioteca a partir de la URL guardada; no contiene datos sin escapar.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="text-slate-500 print:hidden">
          {isFinal
            ? "El proveedor no devolvió el código QR de este comprobante."
            : "El código QR estará disponible cuando el proveedor confirme la recepción."}
        </p>
      )}
      <dl className="mt-1 space-y-0.5 text-xs text-slate-800">
        <div className={ecf.security_code ? undefined : "print:hidden"}>
          <dt className="inline">Código de seguridad: </dt>
          {/* Tal cual lo devolvió el proveedor: distingue mayúsculas y minúsculas. */}
          <dd className="inline font-mono font-semibold">{ecf.security_code ?? (isFinal ? "No disponible: pídelo al proveedor" : "Pendiente")}</dd>
        </div>
        <div className={signedAt ? undefined : "print:hidden"}>
          <dt className="inline">Fecha de firma digital: </dt>
          <dd className="inline font-mono">{signedAt ?? (isFinal ? "No disponible: pídela al proveedor" : "Pendiente")}</dd>
        </div>
      </dl>
    </section>
  );
}

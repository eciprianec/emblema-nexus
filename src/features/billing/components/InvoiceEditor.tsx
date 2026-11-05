"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  BILLING_INDICATORS,
  FIELD_LIMITS,
  FISCAL_TYPES,
  GOOD_OR_SERVICE,
  INCOME_TYPES,
  INVOICE_FISCAL_TYPES,
  MODIFICATION_CODES,
  PAYMENT_TYPES,
  UNIT_CODES,
  addDays,
  calculateDocument,
  todayInDr,
  validateForIssue,
  type BillingIndicator,
  type DocumentReference,
  type FiscalType,
  type GoodOrService,
  type IncomeType,
  type ModificationCode,
  type PaymentType,
} from "@/domain/billing";
import type { BillingClient } from "@/services/billing/types";
import { saveDraftAction } from "../actions/billing-actions";
import { ClientDialog } from "./ClientDialog";
import { fieldClass, labelClass, money } from "./format";

export interface EditorLine {
  key: string;
  description: string;
  details: string;
  itemType: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  billingIndicator: BillingIndicator;
  goodOrService: GoodOrService;
  unitCode: number | null;
}

export interface EditorInitial {
  id?: string;
  fiscalType: FiscalType;
  clientId: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: "DOP" | "USD";
  exchangeRate: number;
  incomeType: IncomeType;
  paymentType: PaymentType;
  paymentTerm: string;
  notes: string;
  itbisWithholdingRate: number;
  isrWithholdingRate: number;
  modificationCode: ModificationCode | null;
  modificationReason: string;
  lines: EditorLine[];
}

export interface EditorParent {
  id: string;
  invoiceNumber: string;
  ncf: string;
  issueDate: string;
  fiscalType: FiscalType;
  total: number;
  creditedAmount: number;
  buyerName: string;
  lines: EditorLine[];
}

function newLine(key: string, indicator: BillingIndicator = 1): EditorLine {
  return {
    key,
    description: "",
    details: "",
    itemType: "honorarios",
    quantity: "1",
    unitPrice: "",
    discount: "",
    billingIndicator: indicator,
    goodOrService: 2,
    unitCode: 43,
  };
}

/** El formato oficial fija el indicador de estos tipos. */
const FORCED_INDICATOR: Partial<Record<FiscalType, BillingIndicator>> = { "44": 4, "46": 3 };

const ITEM_TYPES = [
  { value: "honorarios", label: "Honorarios" },
  { value: "servicio", label: "Servicio" },
  { value: "tasa_judicial", label: "Tasa judicial" },
  { value: "tasa_catastral", label: "Tasa catastral" },
  { value: "gasto_notarial", label: "Gasto notarial" },
  { value: "otro", label: "Otro" },
];

function clientLabel(client: BillingClient): string {
  const name = client.business_name?.trim() || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
  const id = client.rnc || client.cedula || client.passport;
  return id ? `${name} · ${id}` : name;
}

function clientBuyer(client: BillingClient | undefined) {
  if (!client) return {};
  const taxId = (client.rnc || client.cedula || "").replace(/[^0-9]/g, "");
  return {
    taxId,
    foreignId: taxId ? null : client.passport,
    name: client.business_name?.trim() || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
    address: client.address,
    email: client.email,
  };
}

export function InvoiceEditor({
  clients: initialClients,
  initial,
  defaultClientId,
  parent,
  defaultDueDays,
  onSaved,
}: {
  clients: BillingClient[];
  initial?: EditorInitial;
  /** Cliente desde el que se abrió la factura nueva. */
  defaultClientId?: string;
  parent?: EditorParent;
  defaultDueDays: number;
  onSaved?: (invoiceId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = todayInDr();

  const [clients, setClients] = useState(initialClients);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const [fiscalType, setFiscalType] = useState<FiscalType>(initial?.fiscalType ?? "31");
  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? defaultClientId ?? null);
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType ?? 2);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? addDays(today, defaultDueDays));
  const [currency, setCurrency] = useState<"DOP" | "USD">(initial?.currency ?? "DOP");
  const [exchangeRate, setExchangeRate] = useState(String(initial?.exchangeRate ?? 1));
  const [incomeType, setIncomeType] = useState<IncomeType>(initial?.incomeType ?? "01");
  const [paymentTerm, setPaymentTerm] = useState(initial?.paymentTerm ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [itbisRate, setItbisRate] = useState(initial?.itbisWithholdingRate ? String(initial.itbisWithholdingRate) : "");
  const [isrRate, setIsrRate] = useState(initial?.isrWithholdingRate ? String(initial.isrWithholdingRate) : "");
  const [code, setCode] = useState<ModificationCode>(initial?.modificationCode ?? 3);
  const [reason, setReason] = useState(initial?.modificationReason ?? "");
  const [lines, setLines] = useState<EditorLine[]>(initial?.lines?.length ? initial.lines : [newLine("linea-1")]);
  // Las claves salen de un contador por formulario: uno global difiere entre servidor y navegador.
  const nextLineKey = useRef(1);

  const isNote = Boolean(parent);
  const available = parent ? Math.round((parent.total - parent.creditedAmount) * 100) / 100 : 0;
  const forced = FORCED_INDICATOR[fiscalType];
  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) => c.id === clientId || clientLabel(c).toLowerCase().includes(term));
  }, [clients, clientSearch, clientId]);

  const parsedLines = lines.map((line) => ({
    description: line.description,
    details: line.details,
    itemType: line.itemType,
    quantity: line.quantity || "0",
    unitPrice: line.unitPrice || "0",
    discount: line.discount || "0",
    billingIndicator: line.billingIndicator,
    goodOrService: line.goodOrService,
    unitCode: line.unitCode,
  }));

  const withholding = { itbisRate: Number(itbisRate) || 0, isrRate: Number(isrRate) || 0 };
  const rate = Number(exchangeRate) || 0;

  const { totals, calcError } = useMemo(() => {
    try {
      return { totals: calculateDocument(parsedLines, withholding), calcError: null };
    } catch (err) {
      return { totals: null, calcError: err instanceof Error ? err.message : "Revisa los montos." };
    }
    // parsedLines y withholding derivan de estos estados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, itbisRate, isrRate]);

  const reference: DocumentReference | null = parent
    ? {
        modifiedNumber: parent.ncf,
        modifiedDate: parent.issueDate,
        modifiedFiscalType: parent.fiscalType,
        modifiedTotal: parent.total,
        availableToCredit: available,
        code,
        reason,
      }
    : null;

  const issues = totals
    ? validateForIssue(
        {
          fiscalType,
          issueDate,
          dueDate: paymentType === 2 ? dueDate : null,
          currency,
          exchangeRate: rate,
          incomeType,
          paymentType,
          paymentTerm,
          buyer: parent ? { name: parent.buyerName, taxId: "" } : clientBuyer(clients.find((c) => c.id === clientId)),
          lines: parsedLines,
          withholding,
          reference,
        },
        today
      ).filter((issue) => !(parent && issue.field.startsWith("buyer")))
    : [];

  const setLine = (key: string, patch: Partial<EditorLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const changeType = (next: FiscalType) => {
    setFiscalType(next);
    const nextForced = FORCED_INDICATOR[next];
    if (nextForced !== undefined) {
      setLines((current) => current.map((line) => ({ ...line, billingIndicator: nextForced })));
      setItbisRate("");
      setIsrRate("");
    } else if (next === "32") {
      setItbisRate("");
      setIsrRate("");
    }
  };

  const changeCode = (next: ModificationCode) => {
    setCode(next);
    if (!parent) return;
    if (next === 1) setLines(parent.lines);
    if (next === 2) setLines(parent.lines.map((line) => ({ ...line, unitPrice: "0", discount: "" })));
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveDraftAction({
        id: initial?.id ?? null,
        fiscalType,
        clientId,
        issueDate,
        dueDate: paymentType === 2 ? dueDate : null,
        currency,
        exchangeRate: currency === "DOP" ? 1 : rate,
        incomeType,
        paymentType,
        paymentTerm,
        notes,
        itbisWithholdingRate: withholding.itbisRate,
        isrWithholdingRate: withholding.isrRate,
        modifiesInvoiceId: parent?.id ?? null,
        modificationCode: parent ? code : null,
        modificationReason: parent ? reason : null,
        lines: parsedLines.map((line) => ({ ...line, discount: line.discount })),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onSaved?.(result.data);
      toast.success("Borrador guardado");
      router.push(`/finanzas/facturas/${result.data}`);
    });
  };

  const typeInfo = FISCAL_TYPES[fiscalType];
  const blocking = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const canWithhold = ["31", "33", "34"].includes(fiscalType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {initial?.id ? "Editar borrador" : isNote ? `Nueva ${typeInfo.name.toLowerCase()}` : "Nueva factura"}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {parent
            ? `Modifica ${parent.ncf} (${parent.invoiceNumber}) de ${parent.buyerName || "Consumidor final"}.`
            : "Se guarda como borrador y no tiene valor fiscal hasta emitirla."}
        </p>
      </div>

      {parent && (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="codigo" className={labelClass}>
              Motivo de la modificación
            </label>
            <select
              id="codigo"
              className={fieldClass}
              value={code}
              onChange={(e) => changeCode(Number(e.target.value) as ModificationCode)}
            >
              {MODIFICATION_CODES.filter((m) => m.forNotes).map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
            {fiscalType === "34" && (
              <p className="mt-1 text-xs text-slate-500">Acreditable: {money(available, currency)}</p>
            )}
          </div>
          <div>
            <label htmlFor="razon" className={labelClass}>
              Razón (hasta {FIELD_LIMITS.modificationReason} caracteres)
            </label>
            <input
              id="razon"
              className={fieldClass}
              maxLength={FIELD_LIMITS.modificationReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: error en precio"
            />
          </div>
        </section>
      )}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isNote && (
          <div className="sm:col-span-2">
            <label htmlFor="tipo" className={labelClass}>
              Tipo de comprobante
            </label>
            <select id="tipo" className={fieldClass} value={fiscalType} onChange={(e) => changeType(e.target.value as FiscalType)}>
              {INVOICE_FISCAL_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isNote && (
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="cliente" className={labelClass + " mb-0"}>
                Cliente
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline"
                onClick={() => setClientDialogOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Nuevo cliente
              </button>
            </div>
            {clients.length > 8 && (
              <input
                className={`${fieldClass} mb-1`}
                placeholder="Buscar cliente"
                aria-label="Buscar cliente"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            )}
            <select
              id="cliente"
              className={fieldClass}
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
            >
              <option value="">{fiscalType === "32" ? "Consumidor final" : "Selecciona un cliente"}</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {clientLabel(client)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="fecha" className={labelClass}>
            Fecha de emisión
          </label>
          <input id="fecha" type="date" className={fieldClass} value={issueDate} max={today} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pago" className={labelClass}>
            Tipo de pago
          </label>
          <select id="pago" className={fieldClass} value={paymentType} onChange={(e) => setPaymentType(Number(e.target.value) as PaymentType)}>
            {PAYMENT_TYPES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {paymentType === 2 && (
          <>
            <div>
              <label htmlFor="vence" className={labelClass}>
                Fecha límite de pago
              </label>
              <input id="vence" type="date" className={fieldClass} value={dueDate} min={issueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="termino" className={labelClass}>
                Término (opcional)
              </label>
              <input
                id="termino"
                className={fieldClass}
                maxLength={FIELD_LIMITS.paymentTerm}
                placeholder="30 días"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label htmlFor="ingreso" className={labelClass}>
            Tipo de ingreso
          </label>
          <select id="ingreso" className={fieldClass} value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)}>
            {INCOME_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} · {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="moneda" className={labelClass}>
            Moneda
          </label>
          <select
            id="moneda"
            className={fieldClass}
            value={currency}
            disabled={isNote}
            onChange={(e) => {
              setCurrency(e.target.value as "DOP" | "USD");
              if (e.target.value === "DOP") setExchangeRate("1");
              else setExchangeRate("");
            }}
          >
            <option value="DOP">Pesos (DOP)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
        {currency === "USD" && (
          <div>
            <label htmlFor="tasa" className={labelClass}>
              Tasa de cambio
            </label>
            <input id="tasa" inputMode="decimal" className={fieldClass} value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Detalle</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => {
              nextLineKey.current += 1;
              const key = `linea-${nextLineKey.current}`;
              setLines((c) => [...c, newLine(key, forced ?? 1)]);
            }}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Agregar línea
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const calculated = totals?.lines[index];
            return (
              <div key={line.key} className="rounded-md border border-slate-200 p-3">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label htmlFor={`nombre-${line.key}`} className={labelClass}>
                      Nombre del ítem
                    </label>
                    <input
                      id={`nombre-${line.key}`}
                      className={fieldClass}
                      maxLength={FIELD_LIMITS.itemName}
                      value={line.description}
                      onChange={(e) => setLine(line.key, { description: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`concepto-${line.key}`} className={labelClass}>
                      Concepto
                    </label>
                    <select
                      id={`concepto-${line.key}`}
                      className={fieldClass}
                      value={line.itemType}
                      onChange={(e) => setLine(line.key, { itemType: e.target.value })}
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`itbis-${line.key}`} className={labelClass}>
                      ITBIS
                    </label>
                    <select
                      id={`itbis-${line.key}`}
                      className={fieldClass}
                      value={forced ?? line.billingIndicator}
                      disabled={forced !== undefined}
                      onChange={(e) => setLine(line.key, { billingIndicator: Number(e.target.value) as BillingIndicator })}
                    >
                      {BILLING_INDICATORS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-rose-600"
                      aria-label={`Quitar línea ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((c) => c.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`cantidad-${line.key}`} className={labelClass}>
                      Cantidad
                    </label>
                    <input
                      id={`cantidad-${line.key}`}
                      inputMode="decimal"
                      className={fieldClass}
                      value={line.quantity}
                      onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`unidad-${line.key}`} className={labelClass}>
                      Unidad
                    </label>
                    <select
                      id={`unidad-${line.key}`}
                      className={fieldClass}
                      value={line.unitCode ?? 43}
                      onChange={(e) => setLine(line.key, { unitCode: Number(e.target.value) })}
                    >
                      {UNIT_CODES.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`tipoitem-${line.key}`} className={labelClass}>
                      Bien o servicio
                    </label>
                    <select
                      id={`tipoitem-${line.key}`}
                      className={fieldClass}
                      value={line.goodOrService}
                      onChange={(e) => setLine(line.key, { goodOrService: Number(e.target.value) as GoodOrService })}
                    >
                      {GOOD_OR_SERVICE.map((g) => (
                        <option key={g.code} value={g.code}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`precio-${line.key}`} className={labelClass}>
                      Precio unitario
                    </label>
                    <input
                      id={`precio-${line.key}`}
                      inputMode="decimal"
                      className={fieldClass}
                      value={line.unitPrice}
                      onChange={(e) => setLine(line.key, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`descuento-${line.key}`} className={labelClass}>
                      Descuento
                    </label>
                    <input
                      id={`descuento-${line.key}`}
                      inputMode="decimal"
                      className={fieldClass}
                      value={line.discount}
                      placeholder="0.00"
                      onChange={(e) => setLine(line.key, { discount: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={labelClass}>Monto</span>
                    <span className="block truncate py-2 font-mono text-sm text-slate-900">
                      {calculated ? money(calculated.amount, currency) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          {canWithhold && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ret-itbis" className={labelClass}>
                  ITBIS retenido por el cliente (%)
                </label>
                <input id="ret-itbis" inputMode="decimal" className={fieldClass} value={itbisRate} placeholder="0" onChange={(e) => setItbisRate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ret-isr" className={labelClass}>
                  ISR retenido por el cliente (%)
                </label>
                <input id="ret-isr" inputMode="decimal" className={fieldClass} value={isrRate} placeholder="0" onChange={(e) => setIsrRate(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="notas" className={labelClass}>
              Notas internas
            </label>
            <textarea
              id="notas"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          {calcError ? (
            <p role="alert" className="text-sm text-rose-700">
              {calcError}
            </p>
          ) : (
            totals && (
              <dl className="space-y-1.5 text-sm">
                <TotalRow label="Gravado 18 %" value={totals.taxable18} currency={currency} />
                <TotalRow label="Gravado 16 %" value={totals.taxable16} currency={currency} />
                <TotalRow label="Gravado 0 %" value={totals.taxable0} currency={currency} />
                <TotalRow label="Exento" value={totals.exempt} currency={currency} />
                <TotalRow label="ITBIS" value={totals.itbisTotal} currency={currency} always />
                <TotalRow label="Total" value={totals.total} currency={currency} strong always />
                <TotalRow label="Suplidos no facturables" value={totals.nonBillable} currency={currency} />
                <TotalRow label="ITBIS retenido" value={-totals.itbisWithheld} currency={currency} />
                <TotalRow label="ISR retenido" value={-totals.isrWithheld} currency={currency} />
                {totals.amountDue !== totals.total && (
                  <TotalRow label="A pagar por el cliente" value={totals.amountDue} currency={currency} strong always />
                )}
              </dl>
            )
          )}
        </section>
      </div>

      {(blocking.length > 0 || warnings.length > 0) && (
        <section aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {blocking.length > 0 ? "Puedes guardarla, pero para emitirla falta:" : "Revisa antes de emitir:"}
          </p>
          <ul className="ml-6 list-disc space-y-0.5">
            {[...blocking, ...warnings].map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={initial?.id ? `/finanzas/facturas/${initial.id}` : "/finanzas/facturas"}>Cancelar</Link>
        </Button>
        <Button type="button" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending || Boolean(calcError)} onClick={save}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          Guardar borrador
        </Button>
      </div>

      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onCreated={(client) => {
          setClients((current) => [...current, client]);
          setClientId(client.id);
          setClientSearch("");
        }}
      />
    </div>
  );
}

function TotalRow({
  label,
  value,
  currency,
  strong,
  always,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
  always?: boolean;
}) {
  if (!always && value === 0) return null;
  return (
    <div className={`flex justify-between ${strong ? "border-t border-slate-200 pt-1.5 font-semibold text-slate-900" : "text-slate-600"}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{money(value, currency)}</dd>
    </div>
  );
}

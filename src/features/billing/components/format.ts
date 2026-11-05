import { formatMoney } from "@/lib/utils";

/** YYYY-MM-DD a dd/MM/yyyy sin pasar por Date, para no correr el día por la zona horaria. */
export function formatIsoDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function money(value: number | string, currency = "DOP"): string {
  return formatMoney(value, currency);
}

/** "1 recibo", "2 recibos". */
export function count(value: number | string, singular: string, plural: string): string {
  return `${value} ${Number(value) === 1 ? singular : plural}`;
}

export const fieldClass =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export const PAYMENT_METHODS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

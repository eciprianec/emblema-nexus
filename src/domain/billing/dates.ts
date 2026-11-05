/** Las fechas fiscales se expresan en hora de República Dominicana (GMT-4, sin horario de verano). */
const TIME_ZONE = "America/Santo_Domingo";

/** Fecha de hoy en RD como YYYY-MM-DD; `toISOString` daría el día siguiente después de las 8:00 p. m. */
export function todayInDr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** YYYY-MM-DD a dd-MM-AAAA, formato del e-CF. */
export function toDgiiDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

/** Instante a dd-MM-AAAA HH:mm:ss en GMT-4, formato de FechaHoraFirma. */
export function toDgiiDateTime(instant: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

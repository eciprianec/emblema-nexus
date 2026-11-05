"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DGII_ENVIRONMENTS, EMISSION_MODES, FIELD_LIMITS, type EmissionMode } from "@/domain/billing";
import type { BillingSettingsRow, FiscalSequenceRow } from "@/services/billing/types";
import { addSequenceAction, saveSettingsAction, setSequenceActiveAction } from "../actions/billing-actions";
import { fieldClass, formatIsoDate, labelClass } from "./format";

const PREFIXES = [
  { value: "B01", label: "B01 · Crédito Fiscal" },
  { value: "B02", label: "B02 · Consumo" },
  { value: "B03", label: "B03 · Nota de Débito" },
  { value: "B04", label: "B04 · Nota de Crédito" },
  { value: "B14", label: "B14 · Regímenes Especiales" },
  { value: "B15", label: "B15 · Gubernamental" },
  { value: "B16", label: "B16 · Exportaciones" },
];

const ECF_PREFIXES = [
  { value: "E31", label: "E31 · Crédito Fiscal" },
  { value: "E32", label: "E32 · Consumo" },
  { value: "E33", label: "E33 · Nota de Débito" },
  { value: "E34", label: "E34 · Nota de Crédito" },
  { value: "E45", label: "E45 · Gubernamental" },
];

export function SettingsForm({
  settings,
  defaults,
  canConfigure,
}: {
  settings: BillingSettingsRow | null;
  defaults: { rnc: string; legalName: string; address: string; phone: string; email: string };
  canConfigure: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<EmissionMode>(settings?.emission_mode ?? "ecf_externo");
  // El valor por defecto de la tabla es producción: con proveedor, el ambiente se elige a conciencia.
  const [providerEnvironment, setProviderEnvironment] = useState(
    settings?.emission_mode === "ecf_proveedor" ? settings.dgii_environment : ""
  );

  // Con onSubmit y no con la prop action: React vacía el formulario al terminar una acción, y un
  // guardado rechazado borraría lo escrito.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveSettingsAction({
        emission_mode: mode,
        dgii_environment: form.get("dgii_environment"),
        rnc: form.get("rnc"),
        legal_name: form.get("legal_name"),
        trade_name: form.get("trade_name"),
        address: form.get("address"),
        phone: form.get("phone"),
        email: form.get("email"),
        default_due_days: form.get("default_due_days"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Configuración guardada");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={!canConfigure} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Modo de emisión</h2>
          <p className="mb-3 text-xs text-slate-500">Cómo obtienen validez fiscal los comprobantes de esta empresa.</p>
          <div className="space-y-2">
            {EMISSION_MODES.map((option) => (
              <label
                key={option.code}
                className={`flex gap-3 rounded-md border p-3 text-sm ${
                  mode === option.code ? "border-slate-900 bg-slate-50" : "border-slate-200"
                } ${option.available ? "cursor-pointer" : "opacity-60"}`}
              >
                <input
                  type="radio"
                  name="emission_mode"
                  value={option.code}
                  checked={mode === option.code}
                  disabled={!option.available}
                  onChange={() => setMode(option.code)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-slate-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">Datos del emisor</h2>
          <div>
            <label htmlFor="rnc" className={labelClass}>
              RNC o cédula
            </label>
            <input id="rnc" name="rnc" required inputMode="numeric" defaultValue={settings?.rnc ?? defaults.rnc} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="legal_name" className={labelClass}>
              Razón social
            </label>
            <input id="legal_name" name="legal_name" required maxLength={FIELD_LIMITS.emitterName} defaultValue={settings?.legal_name ?? defaults.legalName} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="trade_name" className={labelClass}>
              Nombre comercial (opcional)
            </label>
            <input id="trade_name" name="trade_name" maxLength={FIELD_LIMITS.tradeName} defaultValue={settings?.trade_name ?? ""} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="address" className={labelClass}>
              Dirección
            </label>
            <input id="address" name="address" required maxLength={FIELD_LIMITS.address} defaultValue={settings?.address ?? defaults.address} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Teléfono
            </label>
            <input id="phone" name="phone" defaultValue={settings?.phone ?? defaults.phone} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Correo
            </label>
            <input id="email" name="email" type="email" defaultValue={settings?.email ?? defaults.email} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="default_due_days" className={labelClass}>
              Días de crédito por defecto
            </label>
            <input id="default_due_days" name="default_due_days" type="number" min={0} max={365} defaultValue={settings?.default_due_days ?? 30} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="dgii_environment" className={labelClass}>
              Ambiente de la DGII
            </label>
            {mode === "ecf_proveedor" ? (
              <>
                <select
                  id="dgii_environment"
                  name="dgii_environment"
                  value={providerEnvironment}
                  onChange={(event) => setProviderEnvironment(event.target.value as typeof providerEnvironment)}
                  required
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Elige el ambiente…
                  </option>
                  {DGII_ENVIRONMENTS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Solo Producción tiene validez fiscal. Los e-CF de los demás ambientes se rotulan como pruebas. Con e-CF
                  vigentes no se puede cambiar de ambiente, porque los números de prueba coinciden con los reales.
                </p>
                {(providerEnvironment === "test" || providerEnvironment === "cert") && (
                  <p role="alert" className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    <strong>Usa una empresa separada para las pruebas.</strong> Los e-CF de prueba que la DGII acepte cuentan en
                    los ingresos y las cuentas por cobrar de esta empresa, no se pueden anular, y después esta empresa no podrá
                    pasar a producción.
                  </p>
                )}
              </>
            ) : (
              <>
                <select id="dgii_environment" name="dgii_environment" defaultValue={settings?.dgii_environment ?? "prod"} className={fieldClass}>
                  <option value="prod">Producción</option>
                  <option value="cert">Certificación</option>
                  <option value="test">Pre-certificación</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">Define dónde se verifica el timbre de cada e-CF.</p>
              </>
            )}
          </div>
        </section>

        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {canConfigure && (
          <div className="flex justify-end">
            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Guardar configuración
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function environmentLabel(code: string | null | undefined): string {
  return DGII_ENVIRONMENTS.find((option) => option.code === code)?.label ?? "—";
}

export function SequencesPanel({
  sequences,
  canConfigure,
  mode,
  environment,
  parkedNumbers = [],
  usedNumbers = [],
}: {
  sequences: FiscalSequenceRow[];
  canConfigure: boolean;
  mode?: EmissionMode | null;
  environment?: string | null;
  parkedNumbers?: { encf: string; environment: string }[];
  usedNumbers?: { encf: string; environment: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const electronic = mode === "ecf_proveedor";
  const prefixes = electronic ? ECF_PREFIXES : PREFIXES;
  const [prefix, setPrefix] = useState(prefixes[0].value);
  // Tipos 32 y 34: el e-CF no lleva fecha de vencimiento.
  const expiryRequired = prefix !== "E32" && prefix !== "E34";

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    setError(null);
    startTransition(async () => {
      const result = await addSequenceAction({
        prefix: form.get("prefix"),
        startNumber: form.get("startNumber"),
        endNumber: form.get("endNumber"),
        expiresOn: form.get("expiresOn"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Rango registrado");
      target.reset();
      router.refresh();
    });
  };

  const toggle = (id: string, isActive: boolean) =>
    startTransition(async () => {
      const result = await setSequenceActiveAction(id, isActive);
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{electronic ? "Rangos de e-NCF" : "Rangos de NCF autorizados"}</h2>
      <p className="mb-3 text-xs text-slate-500">
        {electronic
          ? "El sistema toma de aquí el número de cada e-CF. Registra exactamente el rango que autorizó la DGII."
          : "Solo se usan con NCF tradicional. Registra exactamente el rango que autorizó la DGII."}
        {electronic && (
          <>
            {" "}
            Cada rango vale solo para su ambiente: solo se usan los de {environmentLabel(environment)}, y el que agregues
            quedará en ese ambiente.
          </>
        )}
        {electronic && environment === "test" && (
          <> En TesteCF el proveedor admite del 1 al 20,000 por tipo: E31, E33 y E45 con vencimiento 31-12-2028; E32 y E34 sin vencimiento.</>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1.5 font-medium">Serie</th>
              <th className="py-1.5 font-medium">Ambiente</th>
              <th className="py-1.5 text-right font-medium">Desde</th>
              <th className="py-1.5 text-right font-medium">Hasta</th>
              <th className="py-1.5 text-right font-medium">Siguiente</th>
              <th className="py-1.5 pl-6 font-medium">Vence</th>
              <th className="py-1.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sequences.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-500">
                  No hay rangos registrados.
                </td>
              </tr>
            )}
            {sequences.map((sequence) => {
              const exhausted = sequence.next_number > sequence.end_number;
              return (
                <tr key={sequence.id}>
                  <td className="py-1.5 font-mono">{sequence.prefix}</td>
                  {/* La serie B no depende del ambiente de la DGII. */}
                  <td className="py-1.5 text-xs text-slate-600">{sequence.prefix.startsWith("E") ? environmentLabel(sequence.environment) : "—"}</td>
                  <td className="py-1.5 text-right font-mono">{sequence.start_number}</td>
                  <td className="py-1.5 text-right font-mono">{sequence.end_number}</td>
                  <td className="py-1.5 text-right font-mono">{exhausted ? "Agotado" : sequence.next_number}</td>
                  <td className="py-1.5 pl-6">{formatIsoDate(sequence.expires_on)}</td>
                  <td className="py-1.5">
                    {canConfigure ? (
                      <button type="button" className="text-xs font-medium underline" disabled={pending} onClick={() => toggle(sequence.id, !sequence.is_active)}>
                        {sequence.is_active ? "Activo · desactivar" : "Inactivo · activar"}
                      </button>
                    ) : sequence.is_active ? (
                      "Activo"
                    ) : (
                      "Inactivo"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parkedNumbers.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">Números apartados</p>
          <p>
            El proveedor rechazó su envío sin indicar el motivo, y no se volverán a usar: {parkedNumbers.map((n) => n.encf).join(", ")}.
            Revisa con el proveedor si ya estaban usados en la cuenta.
          </p>
        </div>
      )}

      {usedNumbers.length > 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-medium">Números usados en comprobantes rechazados</p>
          <p>
            La DGII los dio por usados, así que no se vuelven a emitir, aunque el borrador se haya eliminado:{" "}
            {usedNumbers.map((n) => n.encf).join(", ")}.
          </p>
        </div>
      )}

      {canConfigure && (
        <form onSubmit={add} className="mt-4 grid items-end gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
          <div>
            <label htmlFor="prefix" className={labelClass}>
              Serie
            </label>
            <select id="prefix" name="prefix" value={prefix} onChange={(event) => setPrefix(event.target.value)} className={fieldClass}>
              {prefixes.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startNumber" className={labelClass}>
              Desde
            </label>
            <input id="startNumber" name="startNumber" type="number" min={1} required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="endNumber" className={labelClass}>
              Hasta
            </label>
            <input id="endNumber" name="endNumber" type="number" min={1} required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="expiresOn" className={labelClass}>
              {expiryRequired ? "Vence" : "Vence (no aplica)"}
            </label>
            <input id="expiresOn" name="expiresOn" type="date" required={expiryRequired} className={fieldClass} />
          </div>
          <Button type="submit" variant="outline" className="h-9" disabled={pending}>
            Agregar rango
          </Button>
          {error && (
            <p role="alert" className="text-sm text-rose-700 sm:col-span-5">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

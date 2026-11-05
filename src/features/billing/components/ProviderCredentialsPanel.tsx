"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DGII_ENVIRONMENTS, type DgiiEnvironmentCode } from "@/domain/billing";
import type { ProviderCredentialsStatus } from "@/services/billing/mseller/EcfProviderService";
import { saveProviderCredentialsAction, testProviderConnectionAction } from "../actions/billing-actions";
import { fieldClass, labelClass } from "./format";

/** El formulario solo escribe: lo guardado nunca vuelve al navegador. */
export function ProviderCredentialsPanel({
  statuses,
  currentEnvironment,
  canConfigure,
  canTest,
  keyConfigured,
  serviceRoleConfigured,
}: {
  statuses: Record<DgiiEnvironmentCode, ProviderCredentialsStatus>;
  currentEnvironment: DgiiEnvironmentCode;
  canConfigure: boolean;
  canTest: boolean;
  keyConfigured: boolean;
  serviceRoleConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [environment, setEnvironment] = useState<DgiiEnvironmentCode>(currentEnvironment);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const status = statuses[environment];

  // Si el guardado falla, lo escrito se conserva; si funciona, se borra de la pantalla.
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    setError(null);
    setResult(null);
    startTransition(async () => {
      const saved = await saveProviderCredentialsAction({
        environment,
        email: form.get("provider_email"),
        password: form.get("provider_password"),
        apiKey: form.get("provider_api_key"),
      });
      if (!saved.success) {
        setError(saved.error);
        return;
      }
      toast.success("Credenciales guardadas");
      target.reset();
      router.refresh();
    });
  };

  const test = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const tested = await testProviderConnectionAction(environment);
      if (!tested.success) setError(tested.error);
      else setResult(tested.data);
    });
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Credenciales del proveedor (MSeller)</h2>
      <p className="mb-3 text-xs text-slate-500">
        Se guardan cifradas por empresa y ambiente, y no se pueden volver a ver. Para cambiarlas, escríbelas de nuevo.
      </p>

      {!keyConfigured && (
        <p role="alert" className="mb-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          Falta la variable BILLING_SECRETS_KEY en el servidor: sin ella no se pueden guardar ni usar las credenciales.
        </p>
      )}

      {!serviceRoleConfigured && (
        <p role="alert" className="mb-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor: sin ella no se puede emitir por el proveedor.
        </p>
      )}

      <div className="mb-3 max-w-xs">
        <label htmlFor="provider_environment" className={labelClass}>
          Ambiente de estas credenciales
        </label>
        <select
          id="provider_environment"
          value={environment}
          onChange={(event) => {
            setEnvironment(event.target.value as DgiiEnvironmentCode);
            setResult(null);
            setError(null);
          }}
          className={fieldClass}
        >
          {DGII_ENVIRONMENTS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-sm text-slate-700">
        {status.configured ? `Configuradas para ${status.emailHint ?? "esta cuenta"}.` : "Sin configurar en este ambiente."}
      </p>

      {canConfigure && (
        <form onSubmit={save} autoComplete="off" className="grid items-end gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="provider_email" className={labelClass}>
              Correo de la cuenta
            </label>
            <input id="provider_email" name="provider_email" type="email" required autoComplete="off" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="provider_password" className={labelClass}>
              Contraseña
            </label>
            <input id="provider_password" name="provider_password" type="password" required autoComplete="new-password" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="provider_api_key" className={labelClass}>
              API Key de este ambiente
            </label>
            <input id="provider_api_key" name="provider_api_key" type="password" required autoComplete="new-password" className={fieldClass} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" variant="outline" size="sm" disabled={pending || !keyConfigured}>
              {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
              Guardar credenciales
            </Button>
            {canTest && (
              <Button type="button" variant="outline" size="sm" disabled={pending || !status.configured || !keyConfigured} onClick={test}>
                Probar conexión
              </Button>
            )}
          </div>
        </form>
      )}

      {result && (
        <p role="status" className={`mt-3 text-sm ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {result.message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}

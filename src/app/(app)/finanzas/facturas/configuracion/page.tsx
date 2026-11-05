import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BillingGate, NoPermission } from "@/features/billing/components/BillingGate";
import { ProviderCredentialsPanel } from "@/features/billing/components/ProviderCredentialsPanel";
import { SequencesPanel, SettingsForm } from "@/features/billing/components/SettingsForm";
import { BillingService } from "@/services/billing/BillingService";
import { isServiceRoleConfigured } from "@/services/billing/mseller/EcfProviderService";
import { isSecretsKeyConfigured } from "@/services/billing/mseller/secrets";
import { getBillingContext } from "@/services/billing/context";

export default async function ConfiguracionFacturacionPage() {
  const ctx = await getBillingContext();
  if (ctx.status !== "ready") return <BillingGate status={ctx.status} />;
  if (!ctx.can.view) return <NoPermission />;

  const service = new BillingService(ctx);
  const provider = service.ecfProvider();
  const [settings, sequences, parkedNumbers, usedNumbers, company, testStatus, certStatus, prodStatus, canEmit, canCreate] = await Promise.all([
    service.getSettings(),
    service.listSequences(),
    service.listParkedNumbers(),
    service.listUsedRejectedNumbers(),
    ctx.db.from("companies").select("name, rnc, address, phone, email").eq("id", ctx.companyId).maybeSingle(),
    provider.credentialsStatus("test"),
    provider.credentialsStatus("cert"),
    provider.credentialsStatus("prod"),
    ctx.has("ecf.emit"),
    ctx.has("finance.create"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/finanzas/facturas" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Facturación
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Configuración de facturación</h1>
      </div>
      <SettingsForm
        settings={settings}
        canConfigure={ctx.can.configure}
        defaults={{
          rnc: company.data?.rnc ?? "",
          legalName: company.data?.name ?? "",
          address: company.data?.address ?? "",
          phone: company.data?.phone ?? "",
          email: company.data?.email ?? "",
        }}
      />
      {settings?.emission_mode === "ecf_proveedor" && (
        <ProviderCredentialsPanel
          statuses={{ test: testStatus, cert: certStatus, prod: prodStatus }}
          currentEnvironment={settings.dgii_environment}
          canConfigure={ctx.can.configure}
          canTest={canEmit || canCreate}
          keyConfigured={isSecretsKeyConfigured()}
          serviceRoleConfigured={isServiceRoleConfigured()}
        />
      )}
      <SequencesPanel
        key={settings?.emission_mode ?? "sin-modo"}
        sequences={sequences}
        canConfigure={ctx.can.configure}
        mode={settings?.emission_mode}
        environment={settings?.dgii_environment}
        parkedNumbers={parkedNumbers}
        usedNumbers={usedNumbers}
      />
    </div>
  );
}

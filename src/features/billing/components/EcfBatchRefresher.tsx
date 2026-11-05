"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshPendingEcfAction } from "../actions/billing-actions";

/** Al abrir la lista revisa en lote los e-CF pendientes, y deja pedirlo a mano. El servidor limita el ritmo. */
export function EcfBatchRefresher({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const started = useRef(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refreshPendingEcfAction().then((result) => {
      if (result.success && result.data.finalized > 0) router.refresh();
    });
  }, [router]);

  if (pendingCount === 0) return null;

  const refreshNow = () =>
    startTransition(async () => {
      const result = await refreshPendingEcfAction(true);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data.throttled) {
        toast.info("Se revisó hace menos de un minuto. Inténtalo de nuevo en un momento.");
        return;
      }
      if (result.data.finalized > 0) {
        toast.success(`La DGII respondió ${result.data.finalized} de ${result.data.checked} en proceso.`);
        router.refresh();
      } else {
        toast.info("La DGII aún no ha respondido los comprobantes en proceso.");
      }
    });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={refreshNow}>
      {pending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      )}
      Actualizar estados
    </Button>
  );
}

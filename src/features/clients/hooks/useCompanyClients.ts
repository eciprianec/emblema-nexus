"use client";

import { useCallback, useEffect, useState } from "react";
import { listClientsAction } from "../actions/client-actions";
import type { Client } from "../types";

/** Los clientes de la empresa activa, para pantallas que aún viven en el navegador. */
export function useCompanyClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listClientsAction()
      .then((result) => {
        if (!active) return;
        if (result.success) setClients(result.data);
        else setError(result.error);
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los clientes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addClient = useCallback((client: Client) => setClients((current) => [client, ...current]), []);

  return { clients, isLoading, error, addClient };
}

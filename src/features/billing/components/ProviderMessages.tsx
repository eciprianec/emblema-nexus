import { describeProviderMessages, type ProviderMessage } from "./provider-messages";

export type { ProviderMessage };

/** Mensajes en palabras de quien corrige el comprobante; lo original queda plegado para soporte. */
export function ProviderMessages({ messages }: { messages: ProviderMessage[] | null | undefined }) {
  const { readable, technical } = describeProviderMessages(messages);
  if (readable.length === 0) return null;
  return (
    <>
      <ul className="ml-4 mt-1 list-disc">
        {readable.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      {technical.length > 0 && (
        <details className="mt-1 text-xs opacity-80">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <ul className="mt-1 break-words font-mono">
            {technical.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

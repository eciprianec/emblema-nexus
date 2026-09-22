import "server-only";

/**
 * CommunicationService — Abstracción para futuras integraciones de comunicación (§115).
 * 
 * Preparar para:
 * - WhatsApp Business API
 * - Email (SMTP/transaccional)
 * - SMS
 * 
 * No implementar ahora — solo definir la interfaz.
 */

export type CommunicationChannel = "email" | "whatsapp" | "sms";

export interface CommunicationMessage {
  channel: CommunicationChannel;
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
  attachments?: {
    filename: string;
    content: Buffer;
    mimeType: string;
  }[];
}

export interface CommunicationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: CommunicationChannel;
  sentAt: string;
}

export interface ICommunicationService {
  /** Verificar si un canal está disponible */
  isChannelAvailable(channel: CommunicationChannel): Promise<boolean>;

  /** Enviar un mensaje */
  send(message: CommunicationMessage): Promise<CommunicationResult>;

  /** Obtener canales configurados */
  getConfiguredChannels(): Promise<CommunicationChannel[]>;
}

/**
 * Placeholder — retorna servicio que informa que no hay canales configurados.
 */
export async function getCommunicationService(): Promise<ICommunicationService> {
  return {
    async isChannelAvailable() {
      return false;
    },
    async send(message) {
      console.log(
        `[CommunicationService] Canal no configurado. Mensaje a ${message.to} no enviado.`
      );
      return {
        success: false,
        error: "Ningún canal de comunicación configurado",
        channel: message.channel,
        sentAt: new Date().toISOString(),
      };
    },
    async getConfiguredChannels() {
      return [];
    },
  };
}

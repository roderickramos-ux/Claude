import "server-only";
import { Resend } from "resend";

export type EmailAttachment = { filename: string; content: string | Buffer; contentType?: string };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string | null }>;
}

class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(m: EmailMessage) {
    const { data, error } = await this.client.emails.send({
      from: process.env.EMAIL_FROM ?? "Praxis Center <onboarding@resend.dev>",
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      replyTo: m.replyTo,
      attachments: m.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
        contentType: a.contentType,
      })),
    });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    return { id: data?.id ?? null };
  }
}

/** Development fallback: logs instead of sending. */
class ConsoleProvider implements EmailProvider {
  readonly name = "console";
  async send(m: EmailMessage) {
    console.info(
      `\n📧 [email:console] to=${m.to} subject="${m.subject}" attachments=${m.attachments?.map((a) => a.filename).join(",") || "none"}\n${m.text.slice(0, 600)}\n`,
    );
    return { id: null };
  }
}

let provider: EmailProvider | null = null;
export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const key = process.env.RESEND_API_KEY;
    provider = key ? new ResendProvider(key) : new ConsoleProvider();
  }
  return provider;
}

/** SMS is Phase 2 (Semaphore). The interface is defined now so templates can target it later. */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<{ id: string | null }>;
}

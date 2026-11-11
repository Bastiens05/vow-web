import { renderEmail, type EmailContent } from "@/lib/domain/email-template";
import { siteUrl } from "@/lib/env";

export type OutboundMail = EmailContent & {
  to: string;
  subject: string;
};

export function emailChannelEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: OutboundMail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(message.to)) return false;
  const buttonUrl = absoluteUrl(message.buttonUrl);
  const rendered = renderEmail({ ...message, buttonUrl });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: rendered.html,
        text: rendered.text,
        headers: message.unsubscribeUrl
          ? { "List-Unsubscribe": `<${message.unsubscribeUrl}>` }
          : undefined,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function absoluteUrl(value: string): string {
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return `${siteUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}

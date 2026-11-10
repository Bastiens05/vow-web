export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

// The email channel stays off until a provider is configured.
// No key is read and nothing is sent.
export const mailer: Mailer = {
  async send() {
    return;
  },
};

export function emailChannelEnabled(): boolean {
  return false;
}

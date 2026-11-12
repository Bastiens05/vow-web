export type EmailContent = {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  unsubscribeUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const heading = escapeHtml(content.heading);
  const body = escapeHtml(content.body);
  const label = escapeHtml(content.buttonLabel);
  const href = escapeHtml(content.buttonUrl);
  const unsubscribe = content.unsubscribeUrl
    ? `<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#8a8478">Ces rappels s'arrêtent ici : <a href="${escapeHtml(content.unsubscribeUrl)}" style="color:#8a8478">ne plus recevoir les rappels</a>.</p>`
    : "";
  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f6f4f1;color:#1c1c1c;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" style="max-width:480px">
        <tr><td style="color:#c8a46a;font-size:12px;letter-spacing:0.5em;padding-left:1.6em">✦</td></tr>
        <tr><td style="font-size:18px;font-weight:400;letter-spacing:0.5em;color:#1c1b19">VOW</td></tr>
        <tr><td style="padding-top:28px;font-size:28px;line-height:1.2;font-weight:650">${heading}</td></tr>
        <tr><td style="padding-top:12px;font-size:16px;line-height:1.5;color:#5c584f">${body}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${href}" style="display:inline-block;background:#1c1c1c;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:15px">${label}</a>
        </td></tr>
        <tr><td>${unsubscribe}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [
    "VOW",
    "",
    content.heading,
    "",
    content.body,
    "",
    `${content.buttonLabel} : ${content.buttonUrl}`,
    content.unsubscribeUrl ? `\nNe plus recevoir les rappels : ${content.unsubscribeUrl}` : "",
  ].join("\n");
  return { html, text };
}

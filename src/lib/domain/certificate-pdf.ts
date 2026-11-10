const EXTRA: Record<string, number> = {
  "é": 0xe9,
  "è": 0xe8,
  "ê": 0xea,
  "ë": 0xeb,
  "à": 0xe0,
  "â": 0xe2,
  "ù": 0xf9,
  "û": 0xfb,
  "ô": 0xf4,
  "î": 0xee,
  "ï": 0xef,
  "ç": 0xe7,
  "É": 0xc9,
  "À": 0xc0,
  "’": 0x92,
  "–": 0x96,
};

function pdfText(value: string): string {
  let out = "";
  for (const char of value) {
    const code = EXTRA[char] ?? char.charCodeAt(0);
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else if (code >= 32 && code <= 126) out += String.fromCharCode(code);
    else if (code <= 255) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return `(${out})`;
}

export type CertificateInput = {
  documentName: string;
  sha256: string;
  signerName: string;
  signedAt: string;
  ip: string;
  userAgent: string;
};

export function certificatePdf(input: CertificateInput): Uint8Array {
  const lines = [
    "VOW — certificat de signature",
    "Signature électronique simple (eIDAS SES).",
    "Ce document n'est pas une signature avancée ni qualifiée.",
    "",
    `Document : ${input.documentName}`,
    `Empreinte SHA-256 : ${input.sha256}`,
    `Signataire : ${input.signerName}`,
    `Signé le : ${input.signedAt}`,
    `Adresse IP : ${input.ip || "non fournie"}`,
    `Navigateur : ${input.userAgent.slice(0, 140) || "non fourni"}`,
  ];
  const commands = ["BT", "/F1 16 Tf", "50 780 Td"];
  lines.forEach((line, index) => {
    if (index === 0) commands.push(`${pdfText(line)} Tj`);
    else commands.push(`0 -22 Td ${pdfText(line)} Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

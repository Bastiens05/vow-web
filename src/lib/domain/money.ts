export function documentNumber(kind: "D" | "F", year: number, sequence: number): string {
  return `${kind}-${year}-${String(sequence).padStart(3, "0")}`;
}

export function eurosToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const EXTRA: Record<string, number> = {
  "é": 0xe9, "è": 0xe8, "ê": 0xea, "à": 0xe0, "ù": 0xf9, "ç": 0xe7, "É": 0xc9, "€": 0x80,
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

export function textPdf(lines: string[]): Uint8Array {
  const commands = ["BT", "/F1 14 Tf", "50 780 Td"];
  lines.forEach((line, index) => {
    commands.push(index === 0 ? `${pdfText(line)} Tj` : `0 -22 Td ${pdfText(line)} Tj`);
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
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

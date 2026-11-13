export function signupNoticeBody(input: { role: "vendor" | "couple"; email: string; tradeLabel?: string | null }): string {
  if (input.role === "vendor") {
    return input.tradeLabel
      ? `Nouveau compte prestataire : ${input.email} · ${input.tradeLabel}`
      : `Nouveau compte prestataire : ${input.email}`;
  }
  return `Nouveau compte mariés : ${input.email}`;
}

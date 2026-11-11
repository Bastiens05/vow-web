"use client";

export function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      maxLength={6}
      pattern="[0-9]*"
      disabled={disabled}
      aria-label="Code à 6 chiffres"
      placeholder="000000"
      className="auth-field w-full rounded-2xl border border-line bg-paper px-4 py-4 text-center text-3xl tracking-[0.45em] text-ink outline-none transition focus:border-ink"
    />
  );
}

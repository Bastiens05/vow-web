import { cn } from "@/lib/cn";

export function Alert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-3 py-2 text-sm leading-6",
        tone === "error" && "bg-danger-bg text-danger",
        tone === "success" && "bg-[#eef5ea] text-[#2d5a32]",
        tone === "info" && "bg-[#f6f0e4] text-gold-deep",
      )}
    >
      {children}
    </p>
  );
}

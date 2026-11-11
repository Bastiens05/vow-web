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
        tone === "success" && "bg-ivory text-ok",
        tone === "info" && "border border-line bg-paper text-ink",
      )}
    >
      {children}
    </p>
  );
}

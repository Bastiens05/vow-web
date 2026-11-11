export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8" aria-busy="true" aria-live="polite" aria-label="Chargement">
      <div className="h-3 w-16 animate-pulse rounded-full bg-black/10" />
      <div className="mt-4 h-9 w-2/3 animate-pulse rounded-xl bg-black/10" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-black/5" />
      <div className="mt-8 space-y-3">
        <div className="h-28 animate-pulse rounded-2xl bg-paper" />
        <div className="h-28 animate-pulse rounded-2xl bg-paper" />
      </div>
    </div>
  );
}

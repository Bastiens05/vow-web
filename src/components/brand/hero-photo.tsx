import Image from "next/image";

const veils = {
  hero: "linear-gradient(to top, rgba(18,17,16,0.8) 0%, rgba(42,32,18,0.28) 48%, rgba(200,164,106,0.2) 100%)",
  auth: "linear-gradient(to top, rgba(18,17,16,0.76) 0%, rgba(42,32,18,0.36) 52%, rgba(200,164,106,0.18) 100%)",
  chat: "linear-gradient(180deg, rgba(251,248,243,0.3), rgba(200,164,106,0.3))",
};

export function HeroPhoto({
  src,
  position = "center 58%",
  positionFromMd,
  positionFromLg,
  priority = false,
  sizes = "100vw",
  quality = 60,
  veil = "hero",
  soft = false,
  zoom = false,
}: {
  src: string;
  position?: string;
  positionFromMd?: string;
  positionFromLg?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  veil?: keyof typeof veils | "none";
  soft?: boolean;
  zoom?: boolean;
}) {
  const place = "object-cover [object-position:var(--hero-pos)] md:[object-position:var(--hero-pos-md)]";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        quality={quality}
        className={
          (soft
            ? `scale-105 blur-[5px] ${place}`
            : zoom
              ? `scale-[1.18] ${place}`
              : place) + (positionFromLg ? " lg:[object-position:var(--hero-pos-lg)]" : "")
        }
        style={{
          ["--hero-pos" as string]: position,
          ["--hero-pos-md" as string]: positionFromMd ?? position,
          ["--hero-pos-lg" as string]: positionFromLg ?? positionFromMd ?? position,
        }}
      />
      {veil === "none" ? null : <div className="absolute inset-0" style={{ background: veils[veil] }} />}
    </div>
  );
}

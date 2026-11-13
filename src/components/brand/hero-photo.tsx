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
  priority = false,
  sizes = "100vw",
  veil = "hero",
  soft = false,
  zoom = false,
}: {
  src: string;
  position?: string;
  positionFromMd?: string;
  priority?: boolean;
  sizes?: string;
  veil?: keyof typeof veils | "none";
  soft?: boolean;
  zoom?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        quality={60}
        className={
          soft
            ? "scale-105 object-cover blur-[5px] [object-position:var(--hero-pos)] md:[object-position:var(--hero-pos-md)]"
            : zoom
              ? "scale-[1.18] object-cover [object-position:var(--hero-pos)] md:[object-position:var(--hero-pos-md)]"
              : "object-cover [object-position:var(--hero-pos)] md:[object-position:var(--hero-pos-md)]"
        }
        style={{ ["--hero-pos" as string]: position, ["--hero-pos-md" as string]: positionFromMd ?? position }}
      />
      {veil === "none" ? null : <div className="absolute inset-0" style={{ background: veils[veil] }} />}
    </div>
  );
}

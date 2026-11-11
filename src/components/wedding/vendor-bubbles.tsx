import type { ReactNode } from "react";
import Link from "next/link";
import { categoryLabel, isVendorCategory, type VendorCategory } from "@/lib/domain/categories";

export type VendorBubblePerson = {
  userId: string;
  businessName: string | null;
  fullName: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
};

export function VendorBubbles({ weddingId, people }: { weddingId: string; people: VendorBubblePerson[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {people.map((person) => {
        const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
        const name = person.businessName || person.fullName || "Prestataire";
        const space = `/mariage/${weddingId}/bulle/${person.userId}`;
        return (
          <li key={person.userId} className="min-w-0 text-center">
            <Link href={space} className="group block min-w-0">
              <span className="relative mx-auto block h-20 w-20">
                {person.logoUrl ? (
                  <img src={person.logoUrl} alt="" className="h-20 w-20 rounded-full border border-line object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-mist text-lg font-semibold tracking-tight">
                    {initials(name)}
                  </span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper text-ink">
                  <TradeMark category={person.category} />
                </span>
              </span>
              <span className="mt-3 block truncate text-sm font-medium">{name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">{trade}</span>
            </Link>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {person.phone ? (
                <RoundAction href={`tel:${person.phone}`} label="Appeler">
                  <PhoneIcon />
                </RoundAction>
              ) : null}
              {person.email ? (
                <RoundAction href={`mailto:${person.email}`} label="E-mail">
                  <MailIcon />
                </RoundAction>
              ) : null}
              <RoundAction href={`/mariage/${weddingId}/messages?avec=${person.userId}`} label="Écrire">
                <ChatIcon />
              </RoundAction>
              <RoundAction href={`/mariage/${weddingId}/documents#${person.userId}`} label="Documents">
                <FileIcon />
              </RoundAction>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RoundAction({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const className = "inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink transition active:scale-95 hover:bg-ink/[0.04]";
  if (href.startsWith("tel:") || href.startsWith("mailto:")) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={className}>
      {children}
    </Link>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "·";
}

function TradeMark({ category }: { category: string | null }) {
  const kind: VendorCategory | "other" = category && isVendorCategory(category) ? category : "other";
  if (kind === "photographer" || kind === "videographer") return <CameraIcon />;
  if (kind === "caterer") return <DishIcon />;
  if (kind === "dj") return <NoteIcon />;
  if (kind === "florist") return <FlowerIcon />;
  if (kind === "venue") return <PlaceIcon />;
  return <DotIcon />;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2.5 5.5h2l1-1.5h5l1 1.5h2v7h-11v-7Z" />
      <circle cx="8" cy="9" r="1.8" />
    </svg>
  );
}
function DishIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 10.5h10M4 10.5a4 4 0 0 1 8 0" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M6 12V4l7-1.5V10" />
      <circle cx="4.5" cy="12" r="1.5" />
      <circle cx="11.5" cy="10.5" r="1.5" />
    </svg>
  );
}
function FlowerIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="8" cy="4.2" r="1.3" />
      <circle cx="10.6" cy="8.2" r="1.3" />
      <circle cx="5.4" cy="8.2" r="1.3" />
      <path d="M8 9.5V13" />
    </svg>
  );
}
function PlaceIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 13s4-3.2 4-6.2A4 4 0 0 0 4 6.8C4 9.8 8 13 8 13Z" />
      <circle cx="8" cy="6.7" r="1.2" />
    </svg>
  );
}
function DotIcon() {
  return <span className="h-1.5 w-1.5 rounded-full bg-ink" />;
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4 3.5h2l1 2.5-1.2 1a7 7 0 0 0 3.2 3.2l1-1.2 2.5 1V12a1 1 0 0 1-1 1A9 9 0 0 1 3 4.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2.5 4.5h11v7h-11v-7Z" />
      <path d="m3 5 5 4 5-4" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 4h10v6H6.5L3 12.2V4Z" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4.5 2.5h4l3 3v8h-7v-11Z" />
    </svg>
  );
}

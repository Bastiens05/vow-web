"use client";

import { useState } from "react";
import { assignSeat } from "@/server/actions/suite";

type Guest = { id: string; fullName: string; diet: string; tableId: string | null };
type Table = { id: string; name: string; capacity: number };

export function SeatBoard({
  weddingId,
  guests,
  tables,
  editable,
}: {
  weddingId: string;
  guests: Guest[];
  tables: Table[];
  editable: boolean;
}) {
  const [dragging, setDragging] = useState<string | null>(null);

  async function place(guestId: string, tableId: string) {
    const data = new FormData();
    data.set("wedding_id", weddingId);
    data.set("guest_id", guestId);
    data.set("table_id", tableId);
    await assignSeat(data);
  }

  return (
    <div className="grid gap-3">
      {tables.map((table) => {
        const seated = guests.filter((guest) => guest.tableId === table.id);
        return (
          <section
            key={table.id}
            className="rounded-2xl bg-paper px-4 py-3"
            onDragOver={(event) => editable && event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const guestId = event.dataTransfer.getData("text/plain") || dragging;
              if (guestId && editable) void place(guestId, table.id);
            }}
          >
            <h3 className="text-sm font-medium">
              {table.name}
              <span className="ml-2 text-muted">
                {seated.length}/{table.capacity}
              </span>
            </h3>
            <ul className="mt-2 grid gap-1">
              {seated.map((guest) => (
                <li key={guest.id} className="text-sm">
                  {guest.fullName}
                  {guest.diet ? <span className="text-muted"> · {guest.diet}</span> : null}
                </li>
              ))}
              {seated.length === 0 ? <li className="text-sm text-muted">Déposez un invité ici.</li> : null}
            </ul>
          </section>
        );
      })}
      {editable ? (
        <ul className="grid gap-2">
          {guests.map((guest) => (
            <li key={guest.id}>
              <div
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", guest.id);
                  setDragging(guest.id);
                }}
                className="flex min-h-11 cursor-grab items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4"
              >
                <span className="text-sm">
                  {guest.fullName}
                  {guest.diet ? <span className="text-muted"> · {guest.diet}</span> : null}
                </span>
                <select
                  aria-label={`Table de ${guest.fullName}`}
                  className="min-h-11 rounded-xl border border-line bg-paper px-2 text-sm"
                  value={guest.tableId ?? ""}
                  onChange={(event) => void place(guest.id, event.target.value)}
                >
                  <option value="">Sans table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

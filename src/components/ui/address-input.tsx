"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fieldClass } from "@/components/ui/field";
import type { AddressSuggestion } from "@/lib/domain/address";
import { cn } from "@/lib/cn";
import { rememberVenuePoint } from "@/server/actions/venue";

export function AddressInput({
  name,
  defaultValue = "",
  value,
  onValueChange,
  placeholder,
  required,
  disabled,
  mode = "address",
  weddingId,
  className,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  mode?: "address" | "city";
  weddingId?: string;
  className?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(value ?? defaultValue);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const picked = useRef(false);

  useEffect(() => {
    if (value !== undefined) setText(value);
  }, [value]);

  useEffect(() => {
    if (picked.current) {
      picked.current = false;
      return;
    }
    const query = text.trim();
    if (query.length < 3 || disabled) {
      setItems([]);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void fetch(`/api/address?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((body: { suggestions?: AddressSuggestion[] }) => {
          const next = body.suggestions ?? [];
          setItems(next);
          setOpen(next.length > 0);
          setActive(0);
        })
        .catch(() => {
          setItems([]);
          setOpen(false);
        });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [text, disabled]);

  function commit(next: string) {
    setText(next);
    onValueChange?.(next);
  }

  function choose(item: AddressSuggestion) {
    picked.current = true;
    commit(mode === "city" ? item.city || item.label : item.label);
    setOpen(false);
    setItems([]);
    if (weddingId) void rememberVenuePoint(weddingId, item.latitude, item.longitude);
  }

  return (
    <div className="relative">
      <input
        name={name}
        value={text}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={cn(fieldClass, "min-h-11", className)}
        onChange={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (!open || items.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + items.length) % items.length);
          } else if (event.key === "Enter" && items[active]) {
            event.preventDefault();
            choose(items[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 160);
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-paper py-1 shadow-lg"
        >
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`block min-h-11 w-full px-3 py-2.5 text-left text-sm ${index === active ? "bg-ink/[0.06]" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="block">{item.street}</span>
                <span className="block text-xs text-muted">
                  {[item.postcode, item.city].filter(Boolean).join(" ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

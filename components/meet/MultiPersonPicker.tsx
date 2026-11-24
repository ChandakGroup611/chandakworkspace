"use client";

import React from "react";
import { X } from "lucide-react";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

/** Pick several people: type to add, click × to remove. */
export default function MultiPersonPicker({ people, value, onChange, placeholder }: { people: PickPerson[]; value: string[]; onChange: (ids: string[]) => void; placeholder?: string }) {
  const chosen = value.map((id) => people.find((p) => p.id === id)).filter(Boolean) as PickPerson[];
  return (
    <div className="space-y-2">
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((p) => (
            <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-[13px] text-foreground">
              {p.full_name}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== p.id))} aria-label={`Remove ${p.full_name}`} className="text-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <PersonPicker people={people.filter((p) => !value.includes(p.id))} value="" onChange={(id) => id && onChange([...value, id])} placeholder={placeholder || "Add a person"} />
    </div>
  );
}

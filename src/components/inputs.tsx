"use client";

import { useId, useState, type ReactNode } from "react";
import { formatNumber, parseInteger, parsePercent } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-[0.95rem] text-ink tabular-nums focus:border-brand focus:outline-none";

function Labelled({ label, id, children, hint }: { label: string; id: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

/** Montant entier : affiché « 1 200 000 », saisi librement. */
export function AmountInput({
  label,
  value,
  onChange,
  suffix = "FCFA",
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  // « FCFA » va dans l'intitulé pour laisser toute la largeur aux grands montants.
  const inLabel = suffix === "FCFA";
  const unit = inLabel ? "" : suffix;
  return (
    <Labelled label={inLabel ? `${label} (FCFA)` : label} id={id} hint={hint}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className={`${inputClass} ${unit ? "pr-14" : ""}`}
          value={draft ?? (value === 0 ? "" : formatNumber(value))}
          placeholder="0"
          onFocus={() => setDraft(value === 0 ? "" : String(value))}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value.replace(/[^\d\s]/g, ""));
            onChange(parseInteger(e.target.value));
          }}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
            {unit}
          </span>
        ) : null}
      </div>
    </Labelled>
  );
}

/** Pourcentage : saisi « 12,5 », stocké 0,125. */
export function PercentInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value === 0 ? "" : String(Math.round(value * 10000) / 100).replace(".", ",");
  return (
    <Labelled label={label} id={id} hint={hint}>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className={`${inputClass} pr-9`}
          value={draft ?? shown}
          placeholder="0"
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(parsePercent(e.target.value));
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">%</span>
      </div>
    </Labelled>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Labelled label={label} id={id}>
      <input
        id={id}
        className={inputClass}
        value={value}
        maxLength={120}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Labelled>
  );
}

export function SelectInput<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <Labelled label={label} id={id}>
      <select
        id={id}
        className={inputClass}
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Labelled>
  );
}

export function MonthInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Labelled label={label} id={id}>
      <input
        id={id}
        type="month"
        className={inputClass}
        value={value}
        onChange={(e) => {
          if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) onChange(e.target.value);
        }}
      />
    </Labelled>
  );
}

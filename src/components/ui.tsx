import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { DATA_STATUS_HELP, DATA_STATUS_LABEL, type DataStatus } from "@/lib/data-status";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.95rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-r from-brand to-brand-2 text-white shadow-[0_8px_20px_-10px_rgba(210,57,12,0.7)] hover:from-brand-700 hover:to-brand",
  secondary: "border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand",
  ghost: "text-ink-soft hover:text-brand",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-6 shadow-[0_14px_34px_-26px_rgba(35,36,42,0.45)] sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

export function Field({
  label,
  name,
  error,
  hint,
  as = "input",
  children,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  as?: "input" | "textarea" | "select";
  children?: ReactNode;
} & Omit<ComponentProps<"input"> & ComponentProps<"textarea"> & ComponentProps<"select">, "name" | "children">) {
  const id = `champ-${name}`;
  const describedBy = error ? `${id}-erreur` : hint ? `${id}-aide` : undefined;
  const className = `${fieldBase} ${error ? "border-danger" : "border-line-strong"}`;
  const shared = { id, name, "aria-invalid": Boolean(error), "aria-describedby": describedBy, className };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea rows={4} {...(props as ComponentProps<"textarea">)} {...shared} />
      ) : as === "select" ? (
        <select {...(props as ComponentProps<"select">)} {...shared}>
          {children}
        </select>
      ) : (
        <input {...(props as ComponentProps<"input">)} {...shared} />
      )}
      {error ? (
        <p id={`${id}-erreur`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-aide`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-xl px-4 py-3 text-sm ${ok ? "bg-ok-50 text-ok" : "bg-danger-50 text-danger"}`}
    >
      {children}
    </p>
  );
}

const statusStyle: Record<DataStatus, string> = {
  verifie: "bg-ok-50 text-ok",
  estimation: "bg-est-50 text-est",
  hypothese: "bg-slate-hyp-50 text-slate-hyp",
};

/** Pastille de statut d'une donnée : Vérifié, Estimation ou Hypothèse. */
export function StatusBadge({ status }: { status: DataStatus }) {
  return (
    <span
      title={DATA_STATUS_HELP[status]}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[status]}`}
    >
      {DATA_STATUS_LABEL[status]}
    </span>
  );
}

import Link from "next/link";
import { brand } from "@/config/brand";

/** Marque : trois paliers qui montent, dans un carré arrondi. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="var(--color-forest)" />
      <rect x="8" y="17" width="4" height="7" rx="1" fill="var(--color-gold-50)" />
      <rect x="14" y="13" width="4" height="11" rx="1" fill="var(--color-gold-50)" />
      <rect x="20" y="8" width="4" height="16" rx="1" fill="#d9a441" />
    </svg>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label={`${brand.name}, accueil`}>
      <BrandMark />
      <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">
        {brand.name}
      </span>
    </Link>
  );
}

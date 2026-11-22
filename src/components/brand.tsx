import Link from "next/link";
import { brand } from "@/config/brand";

/**
 * Marque AfriBiz : un A traversé par une flèche de croissance qui en sort,
 * dans un carré arrondi en dégradé orange. Un jour sépare la flèche de la jambe droite.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="afribiz-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a24" />
          <stop offset="0.55" stopColor="#ee5a13" />
          <stop offset="1" stopColor="#cc330a" />
        </linearGradient>
        <mask id="afribiz-jour" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <line x1="32.5" y1="33.86" x2="46.64" y2="25.98" stroke="#000" strokeWidth="11.5" />
          <polygon points="54.5,21.6 49.07,32.41 42.45,20.53" fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#afribiz-degrade)" />
      <polyline
        points="14,51 29,13 44,51"
        fill="none"
        stroke="#fff"
        strokeWidth="6.6"
        strokeLinejoin="round"
        mask="url(#afribiz-jour)"
      />
      <line x1="18.6" y1="41.6" x2="46.64" y2="25.98" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <polygon points="54.5,21.6 49.07,32.41 42.45,20.53" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Nom de la marque : « Afri » en encre, « Biz » en orange. */
export function BrandWordmark({ className = "" }: { className?: string }) {
  const split = brand.name === "AfriBiz";
  return (
    <span className={`font-display font-semibold tracking-tight text-ink ${className}`}>
      {split ? (
        <>
          Afri<span className="text-brand">Biz</span>
        </>
      ) : (
        brand.name
      )}
    </span>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label={`${brand.name}, accueil`}>
      <BrandMark size={32} />
      <BrandWordmark className="text-[1.4rem]" />
    </Link>
  );
}

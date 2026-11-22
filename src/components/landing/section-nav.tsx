"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: string; label: string };

/** Barre d'onglets fixée en bas de l'écran (ordinateur), l'onglet de la section visible en orange. */
export function SectionNav({ items, cta }: { items: Item[]; cta: { href: string; label: string } }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Sections de la page" className="fixed inset-x-0 bottom-4 z-40 hidden justify-center px-4 lg:flex">
      <div className="flex overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-[0_18px_40px_-20px_rgba(35,36,42,0.45)] backdrop-blur">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "true" : undefined}
            className={`border-r border-line px-5 py-3 text-xs font-semibold transition-colors ${
              active === item.id ? "bg-brand text-white" : "text-muted hover:text-brand"
            }`}
          >
            {item.label}
          </a>
        ))}
        <Link href={cta.href} className="bg-linear-to-r from-brand to-brand-2 px-5 py-3 text-xs font-bold text-white">
          {cta.label} →
        </Link>
      </div>
    </nav>
  );
}

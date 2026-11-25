import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

/** Dégradé orange partagé par les visuels (même identifiant, même définition partout). */
function FlameGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff7a1f" />
        <stop offset="1" stopColor="#d2390c" />
      </linearGradient>
    </defs>
  );
}

/** Arcs concentriques, signature visuelle de la charte. */
export function Arcs({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden className={className}>
      <FlameGradient id="arcs-flamme" />
      <circle cx="200" cy="200" r="180" fill="none" stroke="#e8e8ed" strokeWidth="26" />
      <circle
        cx="200"
        cy="200"
        r="180"
        fill="none"
        stroke="url(#arcs-flamme)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="160 971"
        transform="rotate(-48 200 200)"
      />
      <circle cx="200" cy="200" r="146" fill="none" stroke="#dadae0" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="128" fill="none" stroke="#e8e8ed" strokeWidth="10" strokeDasharray="3 7" />
      <circle
        cx="200"
        cy="200"
        r="104"
        fill="none"
        stroke="url(#arcs-flamme)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="80 573"
        transform="rotate(140 200 200)"
      />
      <circle cx="200" cy="200" r="104" fill="none" stroke="#dadae0" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
}

/** Téléphone montrant un exemple d'écran de plan financier. */
export function PhoneMockup() {
  return (
    <div className="relative w-[230px] rounded-[2.3rem] bg-[#16171b] p-2.5 shadow-[0_40px_70px_-30px_rgba(0,0,0,0.6)]">
      <div className="absolute left-1/2 top-3.5 h-4 w-20 -translate-x-1/2 rounded-full bg-[#16171b]" />
      <div className="overflow-hidden rounded-[1.9rem] bg-[#202127] px-4 pb-5 pt-8 text-white">
        <div className="flex items-center justify-between">
          <BrandMark size={22} />
          <span className="text-[10px] text-white/50">Plan financier</span>
        </div>
        <p className="mt-5 text-[11px] text-white/60">Bénéfice prévu · an 3</p>
        <p className="font-display text-[1.6rem] font-semibold leading-tight">4,8 M FCFA</p>
        <p className="text-[11px] text-[#ffa36b]">Salon de coiffure · Akanda</p>
        <svg viewBox="0 0 200 80" className="mt-3 w-full" aria-hidden>
          <defs>
            <linearGradient id="phone-aire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff7a1f" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ff7a1f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 70 L25 62 L50 66 L75 50 L100 54 L125 38 L150 34 L175 18 L200 8 L200 80 L0 80 Z" fill="url(#phone-aire)" />
          <path
            d="M0 70 L25 62 L50 66 L75 50 L100 54 L125 38 L150 34 L175 18 L200 8"
            fill="none"
            stroke="#ff7a1f"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          {[
            ["Ventes an 1", "9,6 M"],
            ["Rentable dès", "Mois 7"],
            ["Investissement", "3,2 M"],
            ["Scénarios", "3"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/5 px-2 py-1.5">
              <dt className="text-white/50">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-xl bg-linear-to-r from-[#d2390c] to-[#ff7a1f] py-2 text-center text-[11px] font-bold">
          📄 Télécharger le plan
        </div>
      </div>
    </div>
  );
}

const GROWTH = [
  { x: 50, y: 232, label: "Mois 1" },
  { x: 210, y: 186, label: "An 1" },
  { x: 380, y: 150, label: "An 2" },
  { x: 560, y: 46, label: "An 3" },
];

/** Courbe de croissance à points orange (exemple de chiffre d'affaires, scénario réaliste). */
export function GrowthChart() {
  const line = "M50 232 C120 218 160 196 210 186 S320 160 380 150 S500 118 560 46";
  return (
    <svg viewBox="0 0 600 290" className="w-full" role="img" aria-label="Exemple : chiffre d'affaires prévu, en hausse du mois 1 à l'an 3">
      <defs>
        <linearGradient id="croissance-aire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c9d1" stopOpacity="0.75" />
          <stop offset="1" stopColor="#c9c9d1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L560 270 L50 270 Z`} fill="url(#croissance-aire)" />
      <line x1="50" y1="270" x2="560" y2="270" stroke="#dadae0" strokeWidth="1" />
      <path d={line} fill="none" stroke="#23242a" strokeWidth="2.5" />
      {GROWTH.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="9" fill="#e4520e" stroke="#fff" strokeWidth="3" />
          <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize="15" fontWeight="700" fill="#23242a">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const FUNNEL_STEPS = [
  { letter: "A", title: "Vous décrivez votre idée", text: "Avec vos mots, sans aucun chiffre à saisir." },
  { letter: "B", title: "L'assistant comprend le projet", text: "Activité, clients, quartier, budget : il ne demande que l'essentiel." },
  { letter: "C", title: "Des chiffres de votre ville", text: "Loyers, salaires, électricité relevés localement, avec leur source." },
  { letter: "D", title: "Des calculs fiables", text: "Un moteur financier calcule tout : impôts de votre pays, trésorerie, 3 scénarios." },
  { letter: "E", title: "Un plan rédigé et illustré", text: "9 parties, couverture illustrée par IA à votre nom, prêt à imprimer." },
  { letter: "F", title: "Les démarches officielles", text: "Forme juridique, étapes et organisme officiel de votre pays." },
] as const;

const FUNNEL_WIDTHS = [280, 236, 196, 160, 128, 98, 72];
const FUNNEL_SHADES = ["#ececf0", "#d6d6dd", "#b8b9c2", "#8e909a", "#5e6069", "#303137"];

/** Entonnoir A → F : de l'idée au plan complet. */
export function FunnelGraphic({ className = "" }: { className?: string }) {
  const cx = 150;
  const y0 = 26;
  const h = 46;
  const ry = 13;
  return (
    <svg viewBox="0 0 300 336" className={className} role="img" aria-label="Entonnoir en six étapes, de A à F">
      <defs>
        <linearGradient id="entonnoir-relief" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      {FUNNEL_SHADES.map((shade, i) => {
        const a = FUNNEL_WIDTHS[i] / 2;
        const b = FUNNEL_WIDTHS[i + 1] / 2;
        const y = y0 + i * h;
        const d = `M${cx - a} ${y} A${a} ${ry} 0 0 0 ${cx + a} ${y} L${cx + b} ${y + h} A${b} ${ry} 0 0 1 ${cx - b} ${y + h} Z`;
        return (
          <g key={shade}>
            <path d={d} fill={shade} />
            <path d={d} fill="url(#entonnoir-relief)" />
            <text
              x={cx}
              y={y + h / 2 + ry / 2 + 4}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill={i >= 3 ? "#ffffff" : "#23242a"}
            >
              {FUNNEL_STEPS[i].letter}
            </text>
          </g>
        );
      })}
      <ellipse cx={cx} cy={y0} rx={FUNNEL_WIDTHS[0] / 2} ry={ry} fill="#f7f7f9" stroke="#d6d6dd" />
      <ellipse cx={cx} cy={y0 + 2} rx={FUNNEL_WIDTHS[0] / 2 - 22} ry={ry - 5} fill="#e4e4ea" />
    </svg>
  );
}

/** Hexagone (icônes « pour qui »), plein et orange s'il est mis en avant. */
export function Hexagon({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <FlameGradient id="hexagone-flamme" />
        <polygon
          points="50,3 93,27 93,73 50,97 7,73 7,27"
          fill={active ? "url(#hexagone-flamme)" : "#ffffff"}
          stroke={active ? "none" : "#dedee4"}
          strokeWidth="2"
        />
      </svg>
      <div className={`relative px-3 text-center ${active ? "text-white" : "text-ink"}`}>{children}</div>
    </div>
  );
}

/** Page de business plan miniature (couverture, chiffres clés, lignes de texte). */
export function DocumentMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-0 translate-x-5 translate-y-4 rotate-3 rounded-2xl border border-line bg-surface" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-35px_rgba(35,36,42,0.55)]">
        <div className="bg-linear-to-r from-brand to-flame px-6 py-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">🚀 Business plan</p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight">Salon de coiffure</p>
          <p className="text-sm text-white/85">Akanda · Gabon</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-5">
          {[
            ["💰", "Investissement"],
            ["📈", "Ventes an 1"],
            ["✅", "Rentable dès"],
            ["🏦", "Financement"],
          ].map(([e, k]) => (
            <div key={k} className="rounded-lg border border-brand/15 bg-brand-50 px-3 py-2">
              <p className="text-sm" aria-hidden>
                {e}
              </p>
              <p className="text-[10px] font-semibold text-ink-soft">{k}</p>
              <div className="mt-1 h-2 w-14 rounded bg-brand/25" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-5 pb-6">
          <p className="text-xs font-bold text-ink">
            <span className="text-brand">1.</span> Résumé
          </p>
          <div className="h-2 w-full rounded bg-line" />
          <div className="h-2 w-11/12 rounded bg-line" />
          <div className="h-2 w-4/5 rounded bg-line" />
        </div>
      </div>
    </div>
  );
}

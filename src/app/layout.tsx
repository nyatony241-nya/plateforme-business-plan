import type { Metadata, Viewport } from "next";
import "@fontsource-variable/exo-2";
import "@fontsource/bebas-neue";
import "@fontsource/dm-serif-display";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} · ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description:
    "Business plans fondés sur les réalités économiques locales : chiffres sourcés, calculs fiables, démarches officielles. Disponible dans 10 pays d'Afrique francophone.",
};

export const viewport: Viewport = {
  themeColor: "#d2390c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

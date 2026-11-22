import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanDocumentView } from "@/app/projets/[id]/business-plan/document";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { PLAN_DESIGNS, getPlanDesign, isPlanDesignId, patternBandColors, patternSvg } from "@/lib/plan-designs";
import { businessPlanDocx } from "@/lib/word/business-plan-docx";
import { TEST_PARAMS } from "./engine/fixtures";
import { SAMPLE_DOC } from "./plan-doc-fixture";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("les 10 designs du business plan", () => {
  it("sont 10, avec des identifiants uniques et identiques à la contrainte de la base", () => {
    expect(PLAN_DESIGNS).toHaveLength(10);
    const ids = PLAN_DESIGNS.map((d) => d.id);
    expect(new Set(ids).size).toBe(10);
    const sql = readFileSync("supabase/migrations/20261122000600_design_du_plan.sql", "utf8");
    const allowed = [...sql.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(new Set(allowed)).toEqual(new Set(ids));
  });

  it("restent lisibles : texte blanc sur la couleur principale, accent et titres sur blanc", () => {
    for (const d of PLAN_DESIGNS) {
      expect(contrast("#ffffff", d.primary), `${d.id} blanc sur principale`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d.accent, "#ffffff"), `${d.id} accent`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d.ink, "#ffffff"), `${d.id} titres`).toBeGreaterThanOrEqual(7);
      expect(contrast(d.ink, d.soft), `${d.id} titres sur fond clair`).toBeGreaterThanOrEqual(7);
    }
  });

  it("dessinent un motif valide quand ils en ont un", () => {
    for (const d of PLAN_DESIGNS) {
      const svg = patternSvg(d.pattern);
      if (!d.pattern) {
        expect(svg).toBeNull();
        continue;
      }
      expect(svg).toMatch(/^<svg [^>]+>.*<\/svg>$/);
      expect(svg).not.toContain("undefined");
      expect(patternBandColors(d.pattern).every((c) => /^[0-9A-F]{6}$/.test(c))).toBe(true);
    }
  });

  it("revient au design Flamme pour un identifiant inconnu", () => {
    expect(getPlanDesign("inconnu").id).toBe("flamme");
    expect(isPlanDesignId("kente")).toBe(true);
    expect(isPlanDesignId("rose")).toBe(false);
  });

  const a = defaultAssumptions(new Date("2026-11-21T12:00:00Z"));
  const input = {
    doc: SAMPLE_DOC,
    a,
    results: computeScenarios(toPlanInput(a, TEST_PARAMS)),
    project: { name: "Tchock's", sector: "prêt-à-porter", district: "Akanda", city: "Libreville", country: "Gabon" },
    minimumWage: 150_000,
  };

  it("s'appliquent à l'écran et au PDF : couleurs, titres et motif", () => {
    for (const d of PLAN_DESIGNS) {
      const html = renderToStaticMarkup(createElement(PlanDocumentView, { ...input, design: d }));
      expect(html).toContain(`data-design="${d.id}"`);
      expect(html).toContain(`--plan-primary:${d.primary}`);
      expect(html).toContain("Tchock");
      expect(html).toContain(SAMPLE_DOC.conclusion.slice(0, 30));
      if (d.pattern) expect(html).toContain("data:image/svg+xml");
    }
  });

  it("s'appliquent au fichier Word : couleur principale et police", async () => {
    for (const d of PLAN_DESIGNS) {
      const buffer = await businessPlanDocx(input, d);
      const files = unzipSync(new Uint8Array(buffer));
      const xml = strFromU8(files["word/document.xml"]);
      const styles = strFromU8(files["word/styles.xml"]);
      expect(xml, d.id).toContain(d.primary.slice(1).toUpperCase());
      expect(xml).toContain("Conclusion");
      expect(styles + xml).toMatch(/Calibri|Georgia|Trebuchet|Century Gothic|Garamond/);
    }
  });
});

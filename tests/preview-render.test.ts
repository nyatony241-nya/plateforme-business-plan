import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanDocumentView } from "@/app/projets/[id]/business-plan/document";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { previewDocument } from "@/lib/plan-preview";
import { TEST_PARAMS } from "./engine/fixtures";
import { SAMPLE_DOC } from "./plan-doc-fixture";

describe("rendu de l'aperçu", () => {
  const a = defaultAssumptions(new Date("2026-11-21T12:00:00Z"));
  const props = {
    a,
    results: computeScenarios(toPlanInput(a, TEST_PARAMS)),
    project: { name: "Tchock's", sector: null, district: null, city: "Libreville", country: "Gabon" },
    minimumWage: 150_000,
  };

  it("montre le début sous filigrane, verrouille le reste sans son texte", () => {
    const html = renderToStaticMarkup(createElement(PlanDocumentView, { ...props, doc: previewDocument(SAMPLE_DOC), preview: true }));
    expect(html).toContain("APER");
    expect(html).toContain(SAMPLE_DOC.resume.slice(0, 30));
    expect(html).toContain("Calendrier des 90 premiers jours");
    expect(html).not.toContain(SAMPLE_DOC.conclusion.slice(0, 30));
    expect(html).not.toContain(SAMPLE_DOC.marche.clientele.slice(0, 30));
  });

  it("affiche tout, sans filigrane, une fois débloqué", () => {
    const html = renderToStaticMarkup(createElement(PlanDocumentView, { ...props, doc: SAMPLE_DOC }));
    expect(html).not.toContain("APER%C3%87U");
    expect(html).toContain(SAMPLE_DOC.conclusion.slice(0, 30));
  });
});

import { describe, expect, it } from "vitest";
import { DATA_STATUS_LABEL, formatDateFr, isExpired } from "@/lib/data-status";

describe("statut des données", () => {
  it("a un libellé pour chaque statut", () => {
    expect(DATA_STATUS_LABEL).toEqual({
      verifie: "Vérifié",
      estimation: "Estimation",
      hypothese: "Hypothèse",
    });
  });

  it("considère une donnée valable jusqu'au soir de sa date d'expiration", () => {
    const today = new Date("2026-11-20T12:00:00Z");
    expect(isExpired("2026-11-20", today)).toBe(false);
    expect(isExpired("2026-11-19", today)).toBe(true);
  });

  it("formate les dates à la française", () => {
    expect(formatDateFr("2026-11-20T10:00:00Z")).toBe("20/11/2026");
  });
});

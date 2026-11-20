import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase", "migrations");
const sql = readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(dir, file), "utf8"))
  .join("\n");

const createdTables = [...sql.matchAll(/create table public\.(\w+)/gi)].map((m) => m[1]);

describe("migrations SQL", () => {
  it("crée les tables attendues", () => {
    expect(createdTables).toEqual(
      expect.arrayContaining(["profiles", "projects", "sources", "data_points", "procedures", "tax_parameters"]),
    );
  });

  it.each(createdTables)("active la sécurité au niveau des lignes sur %s", (table) => {
    expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  });

  it("interdit les hypothèses dans le référentiel et exige une source", () => {
    expect(sql).toMatch(/check \(status <> 'hypothese'\)/);
    expect(sql).toMatch(/source_id uuid not null references public\.sources/);
  });
});

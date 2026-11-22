-- Design du business plan choisi par l'entrepreneur (10 designs, voir src/lib/plan-designs.ts).
alter table public.projects
  add column plan_design text not null default 'flamme'
  check (plan_design in ('flamme', 'foret', 'ocean', 'kente', 'terre', 'nuit', 'savane', 'corail', 'ebene', 'indigo'));

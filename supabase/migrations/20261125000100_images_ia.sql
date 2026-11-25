-- Illustrations générées par IA pour les business plans (couverture sur mesure).
-- Dossier privé : chaque fichier est rangé sous l'identifiant du projet, et seul
-- le propriétaire du projet peut le lire, l'écrire ou le supprimer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-images', 'plan-images', false, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "plan_images_lecture" on storage.objects for select to authenticated
using (
  bucket_id = 'plan-images'
  and (storage.foldername(name))[1] in (select p.id::text from public.projects p where p.owner_id = (select auth.uid()))
);

create policy "plan_images_ajout" on storage.objects for insert to authenticated
with check (
  bucket_id = 'plan-images'
  and (storage.foldername(name))[1] in (select p.id::text from public.projects p where p.owner_id = (select auth.uid()))
);

create policy "plan_images_modification" on storage.objects for update to authenticated
using (
  bucket_id = 'plan-images'
  and (storage.foldername(name))[1] in (select p.id::text from public.projects p where p.owner_id = (select auth.uid()))
);

create policy "plan_images_suppression" on storage.objects for delete to authenticated
using (
  bucket_id = 'plan-images'
  and (storage.foldername(name))[1] in (select p.id::text from public.projects p where p.owner_id = (select auth.uid()))
);

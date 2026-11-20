-- =============================================================================
-- Durcissement : les fonctions internes ne sont pas appelables depuis l'API.
-- Les déclencheurs continuent de fonctionner (le droit EXECUTE n'est vérifié
-- qu'à la création du déclencheur, pas à son exécution).
-- is_admin() reste exécutable par les utilisateurs connectés, car les règles
-- RLS l'appellent avec leurs droits ; elle ne renvoie que leur propre statut.
-- =============================================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_reference_change() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

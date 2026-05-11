-- Nachrichten-Tabelle: Nachrichten-Austausch pro Auftrag
create table if not exists nachrichten (
  id          uuid primary key default gen_random_uuid(),
  auftrag_id  uuid not null references auftraege(id) on delete cascade,
  inhalt      text not null,
  von         text not null check (von in ('werkstatt', 'kunde')),
  erstellt_am timestamptz not null default now()
);

create index if not exists idx_nachrichten_auftrag_id on nachrichten(auftrag_id);

-- RLS: öffentlich lesbar und schreibbar (anpassen für Prod)
alter table nachrichten enable row level security;

create policy "nachrichten_select" on nachrichten for select using (true);
create policy "nachrichten_insert" on nachrichten for insert with check (true);

-- Supabase Storage Bucket für Freigabe-Fotos
insert into storage.buckets (id, name, public)
values ('freigabe-fotos', 'freigabe-fotos', true)
on conflict (id) do nothing;

create policy "freigabe_fotos_upload" on storage.objects
  for insert with check (bucket_id = 'freigabe-fotos');

create policy "freigabe_fotos_select" on storage.objects
  for select using (bucket_id = 'freigabe-fotos');

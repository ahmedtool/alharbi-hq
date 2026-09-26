-- ============================================================
-- alharbi-hq: إعداد Supabase
-- شغّل هذا الملف مرة وحدة في: Supabase → SQL Editor → Run
-- ============================================================

-- 1) جدول واحد لكل البيانات
-- كل مستند من Firestore يصير صف: collection = اسم المجموعة، id = معرّف المستند، data = حقوله كـ JSON.
-- المجموعات الفرعية تنحفظ بمسارها الكامل، مثل: support_tickets/<id>/messages
create table if not exists public.documents (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists documents_collection_idx on public.documents (collection);
create index if not exists documents_data_gin_idx on public.documents using gin (data jsonb_path_ops);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();

-- 2) صاحب الموقع
-- بعد ما تنشئ حسابك من Authentication → Users، أضف معرّفه هنا (شوف README).
create table if not exists public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.owners enable row level security;
-- ما فيه سياسات على owners: ما أحد يقرأها أو يعدلها من الموقع.

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.owners where user_id = auth.uid());
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-- 3) قواعد الحماية على البيانات
alter table public.documents enable row level security;

-- صاحب الموقع: كل شي
drop policy if exists "owner full access" on public.documents;
create policy "owner full access" on public.documents
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- الزوار: قراءة الأشياء العامة فقط
drop policy if exists "public read" on public.documents;
create policy "public read" on public.documents
  for select to anon, authenticated
  using (
    collection in ('numbered_links', 'public_tools', 'blog_posts')
    or (collection = 'app_config' and id = 'branding')
    or (collection = 'products' and data->>'isPublic' = 'true')   -- المنتجات العامة في نموذج الدعم الفني
  );

-- الزوار: فتح تذكرة دعم فني ورسالتها الأولى فقط
drop policy if exists "public submit ticket" on public.documents;
create policy "public submit ticket" on public.documents
  for insert to anon, authenticated
  with check (
    (collection = 'support_tickets' and coalesce(data->>'status', 'new') = 'new')
    or (collection ~ '^support_tickets/[^/]+/messages$' and data->>'sender' = 'customer')
  );

-- 4) تخزين الملفات
-- حاوية عامة للقراءة (الروابط فيها معرّفات عشوائية ما تنخمّن، مثل روابط Firebase)
insert into storage.buckets (id, name, public)
values ('files', 'files', true)
on conflict (id) do nothing;

drop policy if exists "owner manage files" on storage.objects;
create policy "owner manage files" on storage.objects
  for all to authenticated
  using (bucket_id = 'files' and public.is_owner())
  with check (bucket_id = 'files' and public.is_owner());

drop policy if exists "public upload ticket attachments" on storage.objects;
create policy "public upload ticket attachments" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'files' and name like 'support_tickets/%');

-- 5) التحديث اللحظي (عداد التذاكر الجديدة في القائمة الجانبية)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;

-- 6) دمج الحقول (مثل updateDoc و setDoc مع merge في Firestore)
-- security invoker: تمشي عليها نفس قواعد الحماية حق المستخدم
create or replace function public.merge_document(p_collection text, p_id text, p_patch jsonb, p_upsert boolean default false)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.documents
     set data = data || p_patch
   where collection = p_collection and id = p_id;
  if not found then
    if p_upsert then
      insert into public.documents (collection, id, data) values (p_collection, p_id, p_patch);
    else
      raise exception 'No document to update: %/%', p_collection, p_id using errcode = 'P0002';
    end if;
  end if;
end $$;
grant execute on function public.merge_document(text, text, jsonb, boolean) to authenticated;

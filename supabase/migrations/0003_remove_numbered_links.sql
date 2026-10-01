-- حذف بيانات «الوصول بالرقم» نهائيًا (الميزة انحذفت مع صفحة /bio)
delete from public.documents where collection = 'numbered_links';

-- الزوار ما عاد يقرون numbered_links
drop policy if exists "public read" on public.documents;
create policy "public read" on public.documents
  for select to anon, authenticated
  using (
    collection in ('public_tools', 'blog_posts')
    or (collection = 'app_config' and id = 'branding')
    or (collection = 'products' and data->>'isPublic' = 'true')
  );

-- للتأكد: لازم يطلع 0
select count(*) as remaining from public.documents where collection = 'numbered_links';

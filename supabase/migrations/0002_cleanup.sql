-- ============================================================
-- تنظيف بعد النقل: شغّله مرة وحدة في SQL Editor
-- ============================================================

-- الدوال في Postgres مسموحة للكل افتراضيًا؛ نخلي دالة الدمج للمسجّلين بس
revoke execute on function public.merge_document(text, text, jsonb, boolean) from public, anon;
grant execute on function public.merge_document(text, text, jsonb, boolean) to authenticated;

-- كلمة مرور النظام القديم (Firebase) ما عاد لها استخدام
delete from public.documents where collection = 'app_config' and id = 'auth';

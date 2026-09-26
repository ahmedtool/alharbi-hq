# alharbi-hq — مقر أحمد الحربي

لوحة تحكم شخصية وموقع عام مبني بـ **Next.js 15** و **Supabase** (قاعدة البيانات، تسجيل الدخول، تخزين الملفات) و **Genkit + Gemini** للذكاء الاصطناعي.

## وش فيه
- **صفحات عامة:** الصفحة الرئيسية، صفحة الروابط `/bio`، وطلب الدعم الفني `/support/submit`.
- **لوحة التحكم (تسجيل دخول بالبريد وكلمة المرور):** المهام، المشاريع، العملاء، المالية والفواتير والاشتراكات، الأفكار، الملفات، المدونة، التوكنات والمقتطفات، المساعد الذكي، والإعدادات.
- **أدوات:** مولّد الفواتير، منشئ العقود (مع إرسال بالإيميل)، حاسبة التسعير، توقع المبيعات، متتبع العادات.

## الإعداد لأول مرة

### ١. قاعدة البيانات
في لوحة Supabase ← **SQL Editor**، انسخ محتوى `supabase/migrations/0001_init.sql` واضغط **Run**.

### ٢. حسابك
1. **Authentication ← Users ← Add user ← Create new user**: بريدك وكلمة مرور قوية، وفعّل **Auto Confirm User**.
2. انسخ **User UID** حق الحساب، وشغّل في SQL Editor:
   ```sql
   insert into public.owners (user_id) values ('ضع-الـUID-هنا');
   ```
3. **Authentication ← Sign In / Providers**: أطفِ **Allow new users to sign up** عشان محد غيرك يسجّل.

### ٣. المتغيرات
انسخ `.env.example` إلى `.env.local` وعبّ القيم.

### ٤. التشغيل
```bash
npm install
npm run dev        # http://localhost:3000
```

## الفحص والبناء
```bash
npm run typecheck
npm run build
```
البناء يتوقف إذا فيه أي خطأ TypeScript.

## كيف البيانات منظمة
كل البيانات في جدول واحد `public.documents` (`collection`, `id`, `data jsonb`). الملف `src/lib/db.ts` يعطي نفس دوال Firestore اللي تعود عليها الكود (`collection`, `getDocs`, `addDoc`…) بس فوق Supabase. الملفات في حاوية `files` عبر `src/lib/storage.ts`.

**الحماية:** صاحب الموقع (المسجّل في `owners`) له كل الصلاحيات. الزوار يقدرون بس: يقرؤون الروابط والأدوات العامة والمنتجات العامة وشعار الموقع، ويفتحون تذكرة دعم فني ويرفعون مرفقاتها.

## النشر
أي استضافة تدعم Next.js (مثل Vercel): اربط المستودع وحط نفس متغيرات `.env.example`.

# alharbi-hq — مقر أحمد الحربي

لوحة تحكم شخصية وموقع عام مبني بـ **Next.js 15** و **Firebase** (Firestore، Auth، Storage) و **Genkit** للذكاء الاصطناعي.

## وش فيه
- **صفحات عامة:** الصفحة الرئيسية، صفحة الروابط `/bio`، وطلب الدعم الفني `/support/submit`.
- **لوحة التحكم (برمز دخول PIN):** المهام، المشاريع، العملاء، المالية والفواتير والاشتراكات، الأفكار، الملفات، المدونة، التوكنات والمقتطفات، المساعد الذكي، والإعدادات.
- **أدوات:** مولّد الفواتير، منشئ العقود، حاسبة التسعير، توقع المبيعات، متتبع العادات.
- **Cloud Function** لإرسال الإيميل في مجلد `functions/` (مشروع مستقل، شوف `DEPLOYMENT_GUIDE.md`).

## التشغيل على جهازك
```bash
npm install
cp .env.example .env.local   # وعبّ القيم
npm run dev                  # http://localhost:3000
```

## الفحص والبناء
```bash
npm run typecheck
npm run build
```
البناء يتوقف إذا فيه أي خطأ TypeScript.

## المتغيرات السرية
شوف `.env.example`. لا ترفع `.env` أو `.env.local` أبدًا.

## ملفات Firebase
- `firestore.rules` و `storage.rules`: قواعد الحماية. تنشرها بـ `firebase deploy --only firestore:rules,storage`.
- `firebase.json` و `apphosting.yaml`: إعدادات الاستضافة على Firebase App Hosting.

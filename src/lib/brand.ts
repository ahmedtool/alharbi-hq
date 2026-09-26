/** شعار الموقع (نفس الشعار المستخدم في صفحة الروابط وصفحة الدخول). */
export const LOGO_URL =
  "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";

/**
 * رابط الشعار لحجم معيّن. نرجع الملف الأصلي والمتصفح يصغّره، عشان ما نعتمد
 * على تحويلات Cloudinary (بعض الحسابات تمنعها فتنكسر الصورة).
 */
export function logoAt(_size: number) {
  return LOGO_URL;
}


import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as cors from "cors";

// Initialize Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });

/**
 * دالة إرسال البريد الإلكتروني
 * تستقبل: to, subject, htmlBody, fromName
 */
export const sendEmail = functions.https.onRequest((req, res) => {
  // تغليف كامل المنطق داخل corsHandler لمعالجة مشاكل الـ Cross-Origin
  return corsHandler(req, res, async () => {
    // التحقق من نوع الطلب (يجب أن يكون POST)
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { to, subject, htmlBody, fromName } = req.body;

      // التحقق من البيانات
      if (!to || !subject || !htmlBody || !fromName) {
        console.error("Missing required fields:", { to, subject, fromName });
        res.status(400).json({ success: false, message: "البيانات المطلوبة غير كاملة." });
        return;
      }

      // جلب بيانات SMTP من إعدادات Firebase
      const smtpUser = functions.config().smtp?.user;
      const smtpPass = functions.config().smtp?.pass;

      if (!smtpUser || !smtpPass) {
        console.error("SMTP config missing. Run: firebase functions:config:set smtp.user='...' smtp.pass='...'");
        res.status(500).json({ success: false, message: "بيانات SMTP غير مهيأة على الخادم." });
        return;
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to,
        subject,
        html: htmlBody,
      });

      console.log(`Email sent successfully to ${to}`);
      res.status(200).json({ success: true, message: "تم إرسال البريد بنجاح!" });
    } catch (err: any) {
      console.error("Email sending error:", err);
      res.status(500).json({ 
        success: false, 
        message: "❌ فشل إرسال البريد: " + (err.message || "خطأ غير معروف") 
      });
    }
  });
});

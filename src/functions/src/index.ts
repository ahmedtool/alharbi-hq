
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as cors from "cors";

admin.initializeApp();

const corsHandler = cors({origin: true});

// إعداد SMTP مع Gmail App Password باستخدام إعدادات بيئة Firebase
// قم بتعيينها باستخدام الأوامر التالية في التيرمينال:
// firebase functions:config:set smtp.user="YOUR_GMAIL@gmail.com"
// firebase functions:config:set smtp.pass="YOUR_GMAIL_APP_PASSWORD"
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().smtp.user,
    pass: functions.config().smtp.pass,
  },
});

export const sendEmail = functions.https.onRequest((req, res) => {
  // استخدم corsHandler للسماح بالطلبات من نطاق تطبيقك
  corsHandler(req, res, async () => {
    // تحقق من أن الطلب هو POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
      const { to, subject, htmlBody, fromName } = req.body;

      // تحقق من وجود البيانات المطلوبة
      if (!to || !subject || !htmlBody || !fromName) {
        res.status(400).send("البيانات المطلوبة غير كاملة: to, subject, htmlBody, fromName");
        return;
      }
      
      // تحقق من تهيئة بيانات SMTP
      if (!functions.config().smtp.user || !functions.config().smtp.pass) {
          console.error("SMTP credentials are not set in Firebase config.");
          res.status(500).send("بيانات اعتماد SMTP غير مهيأة على الخادم.");
          return;
      }

      await transporter.sendMail({
        from: `"${fromName}" <${functions.config().smtp.user}>`,
        to,
        subject,
        html: htmlBody,
      });

      res.status(200).json({ success: true, message: "تم إرسال البريد بنجاح!" });
    } catch (err: any) {
      console.error("Email error:", err);
      res.status(500).json({ success: false, message: "❌ Error sending email: " + err.message });
    }
  });
});

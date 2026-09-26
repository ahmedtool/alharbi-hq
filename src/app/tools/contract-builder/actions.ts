'use server';

import nodemailer from "nodemailer";
import { userForToken } from "@/lib/supabase";

/**
 * Sends the contract email through Gmail SMTP.
 * Replaces the old public Firebase Cloud Function: only the signed-in owner can send.
 * Needs SMTP_USER and SMTP_PASS (a Gmail App Password) in the environment.
 */
export async function sendContractEmail(
    input: { to: string; subject: string; htmlBody: string; fromName: string },
    accessToken: string,
): Promise<{ success: boolean; message: string }> {
    if (!(await userForToken(accessToken))) {
        return { success: false, message: "لازم تكون مسجّل دخول." };
    }

    const { to, subject, htmlBody, fromName } = input;
    if (!to || !subject || !htmlBody || !fromName) {
        return { success: false, message: "البيانات المطلوبة غير كاملة." };
    }

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
        return { success: false, message: "بيانات SMTP غير مهيأة على الخادم (SMTP_USER و SMTP_PASS)." };
    }

    try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
        await transporter.sendMail({
            from: { name: fromName.replace(/["<>\r\n]/g, ""), address: user },
            to,
            subject,
            html: htmlBody,
        });
        return { success: true, message: "تم إرسال البريد بنجاح!" };
    } catch (err: any) {
        console.error("Email sending error:", err);
        return { success: false, message: "فشل إرسال البريد: " + (err?.message || "خطأ غير معروف") };
    }
}

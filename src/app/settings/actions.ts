
'use server';

import { db } from "@/lib/firebase-admin";

async function getPinFromFirestore(): Promise<string | null> {
    try {
        const docSnap = await db.collection("app_config").doc("security").get();
        const loginPin = docSnap.data()?.loginPin;
        return typeof loginPin === "string" && loginPin ? loginPin : null;
    } catch (error) {
        console.error("Error fetching PIN from Firestore:", error);
        return null;
    }
}

export async function updatePin(currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
    // 1. Try to get PIN from Firestore
    // 2. If not in Firestore, fall back to environment variable
    const serverPin = (await getPinFromFirestore()) ?? process.env.LOGIN_PIN;
    
    // 3. If no PIN is set anywhere, deny access
    if (!serverPin) {
        return { success: false, message: 'لم يتم تعيين رمز PIN على الخادم.' };
    }

    if (currentPin !== serverPin) {
        return { success: false, message: 'رمز PIN الحالي غير صحيح.' };
    }

    try {
        await db.collection("app_config").doc("security").set({ loginPin: newPin }, { merge: true });
        return { success: true, message: 'تم تحديث رمز PIN بنجاح!' };
    } catch (error) {
        console.error("Error updating PIN in Firestore:", error);
        return { success: false, message: 'حدث خطأ أثناء تحديث الرمز في قاعدة البيانات.' };
    }
}


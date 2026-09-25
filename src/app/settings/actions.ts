
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

async function getPinFromFirestore(): Promise<string | null> {
    try {
        const docRef = doc(db, "app_config", "security");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().loginPin) {
            return docSnap.data().loginPin;
        }
        return null;
    } catch (error) {
        console.error("Error fetching PIN from Firestore:", error);
        return null;
    }
}

export async function updatePin(currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
    // 1. Try to get PIN from Firestore
    let serverPin = await getPinFromFirestore();

    // 2. If not in Firestore, fall back to environment variable
    if (!serverPin) {
        serverPin = process.env.LOGIN_PIN;
    }
    
    // 3. If no PIN is set anywhere, deny access
    if (!serverPin) {
        return { success: false, message: 'لم يتم تعيين رمز PIN على الخادم.' };
    }

    if (currentPin !== serverPin) {
        return { success: false, message: 'رمز PIN الحالي غير صحيح.' };
    }

    try {
        const docRef = doc(db, "app_config", "security");
        await setDoc(docRef, { loginPin: newPin }, { merge: true });
        return { success: true, message: 'تم تحديث رمز PIN بنجاح!' };
    } catch (error) {
        console.error("Error updating PIN in Firestore:", error);
        return { success: false, message: 'حدث خطأ أثناء تحديث الرمز في قاعدة البيانات.' };
    }
}


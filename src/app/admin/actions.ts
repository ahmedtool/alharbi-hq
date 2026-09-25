
'use server';

import { db } from "@/lib/firebase-admin";
import { doc, getDoc } from "firebase/firestore";

// This function now uses the Firebase Admin SDK to interact with Firestore
// to fetch the PIN, but it no longer sets custom claims.

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

export async function verifyPin(pin: string): Promise<{ success: boolean; message: string }> {
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

    // 4. Compare the provided PIN with the server PIN
    if (pin === serverPin) {
        return { success: true, message: 'تم التحقق بنجاح.' };
    } else {
        return { success: false, message: 'رمز PIN غير صحيح.' };
    }
}

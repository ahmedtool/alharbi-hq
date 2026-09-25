
'use server';

import { db } from "@/lib/firebase-admin";
import type { WriteBatch } from "firebase-admin/firestore";

// Firestore allows at most 500 writes per batch.
const BATCH_LIMIT = 500;

async function commitInChunks(ops: Array<(batch: WriteBatch) => void>) {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
        await batch.commit();
    }
}

const COLLECTIONS_TO_MANAGE = [
    'api_tokens',
    'clients',
    'folders',
    'files',
    'habits',
    'ideas',
    'invoices',
    'legal_files',
    'legal_info',
    'products',
    'projects',
    'snippets',
    'subscriptions',
    'support_tickets',
    'tasks',
    'tools',
    'transactions',
    'numbered_links'
];

// Fetches all data from specified collections
export async function exportData(): Promise<Record<string, any[]>> {
    const allData: Record<string, any[]> = {};
    
    for (const collectionName of COLLECTIONS_TO_MANAGE) {
        try {
            const querySnapshot = await db.collection(collectionName).get();
            allData[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Error exporting collection ${collectionName}:`, error);
        }
    }
    
    return allData;
}


// Wipes and imports data into specified collections
export async function importData(jsonString: string): Promise<{ success: boolean; message: string }> {
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (error) {
        return { success: false, message: "ملف JSON غير صالح." };
    }

    try {
        for (const collectionName of COLLECTIONS_TO_MANAGE) {
            const querySnapshot = await db.collection(collectionName).get();
            await commitInChunks(querySnapshot.docs.map((d) => (batch: WriteBatch) => batch.delete(d.ref)));
        }

        const writes: Array<(batch: WriteBatch) => void> = [];
        for (const collectionName of COLLECTIONS_TO_MANAGE) {
            if (data[collectionName] && Array.isArray(data[collectionName])) {
                for (const item of data[collectionName]) {
                    if (item.id) {
                        const { id, ...itemData } = item;
                        const docRef = db.collection(collectionName).doc(String(id));
                        writes.push((batch) => batch.set(docRef, itemData));
                    }
                }
            }
        }
        await commitInChunks(writes);
        
        return { success: true, message: "تم استيراد البيانات بنجاح." };

    } catch (error: any) {
        console.error("Error during data import:", error);
        return { success: false, message: `فشل الاستيراد: ${error.message}` };
    }
}

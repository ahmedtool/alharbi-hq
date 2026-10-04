

// Runs in the browser as the signed-in owner; the database rules allow only them.
import { db, collection, getDocs, doc, writeBatch } from "@/lib/db";

type Batch = ReturnType<typeof writeBatch>;

async function commitAll(ops: Array<(batch: Batch) => void>) {
    const batch = writeBatch(db);
    ops.forEach((op) => op(batch));
    await batch.commit();
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
    'contracts',
];

// Fetches all data from specified collections
export async function exportData(): Promise<Record<string, any[]>> {
    const allData: Record<string, any[]> = {};
    
    for (const collectionName of COLLECTIONS_TO_MANAGE) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
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
            const querySnapshot = await getDocs(collection(db, collectionName));
            await commitAll(querySnapshot.docs.map((d) => (batch: Batch) => batch.delete(d.ref)));
        }

        const writes: Array<(batch: Batch) => void> = [];
        for (const collectionName of COLLECTIONS_TO_MANAGE) {
            if (data[collectionName] && Array.isArray(data[collectionName])) {
                for (const item of data[collectionName]) {
                    if (item.id) {
                        const { id, ...itemData } = item;
                        const docRef = doc(db, collectionName, String(id));
                        writes.push((batch) => batch.set(docRef, itemData));
                    }
                }
            }
        }
        await commitAll(writes);
        
        return { success: true, message: "تم استيراد البيانات بنجاح." };

    } catch (error: any) {
        console.error("Error during data import:", error);
        return { success: false, message: `فشل الاستيراد: ${error.message}` };
    }
}

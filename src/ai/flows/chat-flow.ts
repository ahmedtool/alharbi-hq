'use server';
/**
 * @fileOverview A flow for handling chat conversations.
 *
 * - chat - A function that takes a chat history and returns a new response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { chatHistorySchema } from '@/ai/schemas/chat-schema';
import { collection, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function to safely stringify and format collection data
async function formatCollectionData(name: string, querySnapshot: QuerySnapshot<DocumentData, DocumentData>): Promise<string> {
    if (querySnapshot.empty) {
        return `// No data for ${name}\n[]`;
    }
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return `// Data for ${name}\n${JSON.stringify(data, null, 2)}`;
}


// Fetches all relevant data from Firestore and formats it as a JSON string for the prompt.
async function fetchAllDataForPrompt(): Promise<string> {
    const collectionsToFetch = [
      'clients',
      'projects',
      'tasks',
      'invoices',
      'subscriptions',
    ];
    
    let dataString = "Here is the data from the user's dashboard in JSON format:\n\n";

    for (const collectionName of collectionsToFetch) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const collectionData = await formatCollectionData(collectionName, querySnapshot);
            dataString += `\n--- ${collectionName.toUpperCase()} ---\n${collectionData}\n`;
        } catch (e) {
            console.error(`Error fetching collection ${collectionName}:`, e);
            dataString += `\n--- ${collectionName.toUpperCase()} ---\n// Error fetching data.\n[]\n`;
        }
    }
    
    return dataString;
}


export async function chat(history: z.infer<typeof chatHistorySchema>): Promise<string> {
    // 1. Fetch the live data from Firestore.
    const dataContext = await fetchAllDataForPrompt();

    // 2. Generate a response using the data as context.
    const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash', 
        history: history,
        prompt: `
            You are a smart assistant named 'Ahmed' in a personal dashboard application.
            Your user, 'Ahmed Al-Harbi', will ask you questions about his data.
            You must answer his questions based *only* on the JSON data provided below. Do not make up any information.
            Your personality is friendly, helpful, and you speak in a Saudi dialect. Keep your answers concise and to the point.

            --- START OF DASHBOARD DATA ---
            ${dataContext}
            --- END OF DASHBOARD DATA ---

            Based on the data, answer the user's question. If the data is not present to answer the question, say you don't have information about it.
        `,
        config: {
            temperature: 0.2, // Lower temperature for more factual and less creative responses
        }
    });

    return response.text;
}

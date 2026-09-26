'use server';
/**
 * @fileOverview A flow for handling chat conversations.
 *
 * - chat - A function that takes a chat history and returns a new response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { chatHistorySchema } from '@/ai/schemas/chat-schema';
import { collection, getDocs, dbFor, type Db, type QuerySnapshot } from '@/lib/db';
import { supabaseForToken, userForToken } from '@/lib/supabase';

// Helper function to safely stringify and format collection data
async function formatCollectionData(name: string, querySnapshot: QuerySnapshot): Promise<string> {
    if (querySnapshot.empty) {
        return `// No data for ${name}\n[]`;
    }
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return `// Data for ${name}\n${JSON.stringify(data, null, 2)}`;
}


// Fetches all relevant data from the database and formats it as a JSON string for the prompt.
async function fetchAllDataForPrompt(db: Db): Promise<string> {
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


export async function chat(history: z.infer<typeof chatHistorySchema>, accessToken: string): Promise<string> {
    // Server actions are public endpoints: only answer a signed-in user, and read
    // the data as that user so the database rules decide what they can see.
    const user = await userForToken(accessToken);
    if (!user) {
        throw new Error('Not signed in');
    }

    // 1. Fetch the live data.
    const dataContext = await fetchAllDataForPrompt(dbFor(supabaseForToken(accessToken)));

    // 2. Generate a response using the data as context.
    const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash', 
        messages: history,
        system: `
            You are a smart assistant named 'Ahmed' in a personal dashboard application.
            Your user, 'Ahmed Al-Harbi', will ask you questions about his data.
            You must answer his questions based *only* on the JSON data provided below. Do not make up any information.
            Your personality is friendly, helpful, and you speak in a Saudi dialect. Keep your answers concise and to the point.

            --- START OF DASHBOARD DATA ---
            ${dataContext}
            --- END OF DASHBOARD DATA ---

            Based on the data, answer the user's latest message. If the data is not present to answer the question, say you don't have information about it.
        `,
        config: {
            temperature: 0.2, // Lower temperature for more factual and less creative responses
        }
    });

    return response.text;
}

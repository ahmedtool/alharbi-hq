import {z} from 'genkit';

export const chatHistorySchema = z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({text: z.string()})),
}));


import {z} from 'genkit';

export const SalesForecastInputSchema = z.object({
  historicalData: z.array(z.number()).describe('An array of historical sales numbers.'),
  period: z.string().describe("The time period for each data point (e.g., 'شهري', 'أسبوعي')."),
});
export type SalesForecastInput = z.infer<typeof SalesForecastInputSchema>;

export const SalesForecastOutputSchema = z.object({
  forecast: z.number().describe('The forecasted sales number for the next period.'),
  analysis: z.string().describe('A brief analysis of the sales trend and the reasoning behind the forecast.'),
});
export type SalesForecastOutput = z.infer<typeof SalesForecastOutputSchema>;

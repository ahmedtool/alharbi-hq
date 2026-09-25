
'use server';
/**
 * @fileOverview A flow for forecasting sales data.
 *
 * - forecastSales - A function that takes historical sales data and returns a forecast.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SalesForecastInputSchema, SalesForecastOutputSchema, SalesForecastInput, SalesForecastOutput } from '@/ai/schemas/sales-forecasting-schema';


export async function forecastSales(input: SalesForecastInput): Promise<SalesForecastOutput> {
  return salesForecastingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesForecastingPrompt',
  input: {schema: SalesForecastInputSchema},
  output: {schema: SalesForecastOutputSchema},
  prompt: `أنت خبير في تحليل البيانات والتنبؤ المالي. مهمتك هي تحليل بيانات المبيعات التاريخية التالية والتنبؤ بقيمة المبيعات للفترة القادمة.

البيانات تمثل المبيعات بشكل {{period}}.

بيانات المبيعات التاريخية (بالترتيب الزمني):
{{{historicalData}}}

قم بتحليل الاتجاه في هذه البيانات (هل هو في نمو، انخفاض، أو استقرار؟)، ثم قم بتوفير تنبؤ منطقي للفترة القادمة. اشرح باختصار كيف توصلت إلى هذا التنبؤ في حقل التحليل.`,
});

const salesForecastingFlow = ai.defineFlow(
  {
    name: 'salesForecastingFlow',
    inputSchema: SalesForecastInputSchema,
    outputSchema: SalesForecastOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء التنبؤ.");
    }
    return output;
  }
);


'use client';

import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Sparkles, BrainCircuit, X, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { forecastSales, SalesForecastOutput } from "@/ai/flows/sales-forecasting-flow";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from 'recharts';

interface DataInput {
    id: number;
    value: string;
}

let nextId = 3; // Start IDs from 3 since we have 2 initial inputs

export default function SalesForecastingPage() {
    const { toast } = useToast();
    const [dataInputs, setDataInputs] = React.useState<DataInput[]>([{id: 1, value: ''}, {id: 2, value: ''}]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<SalesForecastOutput | null>(null);
    const [historicalData, setHistoricalData] = React.useState<number[]>([]);

    const handleInputChange = (id: number, value: string) => {
        setDataInputs(prev => prev.map(input => input.id === id ? {...input, value} : input));
    }
    
    const addInput = () => {
        setDataInputs(prev => [...prev, {id: nextId++, value: ''}]);
    }

    const removeInput = (id: number) => {
        setDataInputs(prev => prev.filter(input => input.id !== id));
    }


    const handleGenerateForecast = async () => {
        const numbers = dataInputs
            .map(input => parseFloat(input.value))
            .filter(num => !isNaN(num) && num > 0);

        if (numbers.length < 2) {
            toast({
                variant: 'destructive',
                title: "خطأ",
                description: "الرجاء إدخال قيم رقمية صحيحة في حقلين على الأقل.",
            });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const forecastResult = await forecastSales({
                historicalData: numbers,
                period: 'شهري' // Assuming monthly for now, can be made dynamic later
            });
            setResult(forecastResult);
            setHistoricalData(numbers);
            toast({
                title: "تم إنشاء التنبؤ بنجاح!",
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: "حدث خطأ",
                description: "لم نتمكن من إنشاء التنبؤ. الرجاء المحاولة مرة أخرى.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const chartData = React.useMemo(() => {
        const data = historicalData.map((value, index) => ({
            name: `فترة ${new Intl.NumberFormat('ar-SA').format(index + 1)}`,
            'المبيعات الفعلية': value,
        }));
        if(result) {
            data.push({
                name: 'التنبؤ',
                'المبيعات المتوقعة': result.forecast
            })
        }
        return data;

    }, [historicalData, result]);

    const hasValidInputs = dataInputs.map(i => i.value).filter(Boolean).length >= 2;


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="أداة تنبؤ المبيعات"
        description="استخدم الذكاء الاصطناعي لتحليل بيانات مبيعاتك السابقة وتوقع الأداء المستقبلي."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BrainCircuit /> الخطوة 1: أدخل بياناتك</CardTitle>
            <CardDescription>أدخل أرقام مبيعاتك للفترات السابقة في الخانات أدناه.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dataInputs.map((input, index) => (
                <div key={input.id} className="flex items-center gap-2">
                   <Label htmlFor={`period-${input.id}`} className="min-w-[50px] text-sm text-muted-foreground">الفترة {new Intl.NumberFormat('ar-SA').format(index + 1)}</Label>
                   <Input
                     id={`period-${input.id}`}
                     type="number"
                     placeholder="أدخل قيمة المبيعات"
                     value={input.value}
                     onChange={(e) => handleInputChange(input.id, e.target.value)}
                     disabled={isLoading}
                     dir="ltr"
                     className="text-center"
                   />
                   {dataInputs.length > 2 && (
                     <Button variant="ghost" size="icon" onClick={() => removeInput(input.id)} disabled={isLoading}>
                       <X className="h-4 w-4"/>
                     </Button>
                   )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addInput} disabled={isLoading}>
                <PlusCircle className="ml-2 h-4 w-4"/>
                إضافة فترة
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
              <Button size="lg" onClick={handleGenerateForecast} disabled={isLoading || !hasValidInputs}>
                  {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Sparkles className="ml-2 h-4 w-4"/>}
                  {isLoading ? "جاري التحليل..." : "أنشئ التنبؤ الآن"}
              </Button>
               {result && (
                  <Button variant="outline" onClick={() => { setResult(null); setHistoricalData([]); setDataInputs([{id: 1, value: ''}, {id: 2, value: ''}])}}>
                      <X className="ml-2 h-4 w-4"/> مسح وبدء من جديد
                  </Button>
              )}
          </CardFooter>
        </Card>

        {/* Result Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp/> الخطوة 2: النتائج والتوقعات</CardTitle>
            <CardDescription>هنا تظهر النتائج بعد تحليل البيانات.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center gap-8">
            {isLoading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : result ? (
              <div className="w-full space-y-8">
                 <div className="text-center">
                    <Label>المبيعات المتوقعة للفترة القادمة</Label>
                    <p className="text-5xl font-bold text-primary mt-2" dir="ltr">
                        {new Intl.NumberFormat('ar-SA').format(result.forecast)} <span className="text-2xl text-muted-foreground">ر.س</span>
                    </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">تحليل الذكاء الاصطناعي:</h4>
                    <p className="text-sm text-muted-foreground">{result.analysis}</p>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => new Intl.NumberFormat('ar-SA').format(Number(value))} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "var(--radius)",
                                    border: "1px solid hsl(var(--border))",
                                    background: "hsl(var(--background))",
                                    direction: "rtl"
                                }}
                                formatter={(value) => `${new Intl.NumberFormat('ar-SA').format(Number(value))} ر.س`}
                            />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Bar dataKey="المبيعات الفعلية" fill="hsl(var(--primary))" name="المبيعات الفعلية" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="المبيعات المتوقعة" fill="hsl(var(--primary) / 0.5)" name="المبيعات المتوقعة" radius={[4, 4, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            ) : (
                <div className="text-center text-muted-foreground space-y-2">
                    <TrendingUp className="h-12 w-12 mx-auto" />
                    <p>ستظهر نتائج التنبؤ والتحليل البياني هنا.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


'use client';

import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, PlusCircle, Trash2, TrendingUp, DollarSign, WalletCards } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface TimeCost {
    id: number;
    description: string;
    days: number;
    hours: number;
    minutes: number;
    ratePerHour: number;
}

interface FixedCost {
    id: number;
    description: string;
    amount: number;
}

interface Result {
    finalPrice: number;
    totalCost: number;
    netProfit: number;
    profitPercentage: number;
    paymentFee: number;
}

type PaymentMethod = 'bank' | 'mada' | 'gcc' | 'visa';

export default function PricingCalculatorPage() {
    const { toast } = useToast();
    
    const [serviceDescription, setServiceDescription] = React.useState("");
    const [baseCost, setBaseCost] = React.useState<number | string>("");
    const [sellingPrice, setSellingPrice] = React.useState<number | string>("");
    const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('bank');
    
    const [fixedCosts, setFixedCosts] = React.useState<FixedCost[]>([
        { id: 1, description: "", amount: 0 },
    ]);
    const [timeCosts, setTimeCosts] = React.useState<TimeCost[]>([
        { id: 1, description: "", days: 0, hours: 0, minutes: 0, ratePerHour: 50 },
    ]);

    const [result, setResult] = React.useState<Result | null>(null);
    
    // Handlers for Fixed Costs
    const handleFixedCostChange = (id: number, field: 'description' | 'amount', value: string) => {
        setFixedCosts(costs => 
            costs.map(cost => {
                if (cost.id === id) {
                    if (field === 'amount') {
                        return { ...cost, [field]: parseFloat(value) || 0 };
                    }
                    return { ...cost, [field]: value };
                }
                return cost;
            })
        );
    };

    const addFixedCostRow = () => {
        setFixedCosts(costs => [...costs, {id: Date.now(), description: "", amount: 0}]);
    }
    const removeFixedCostRow = (id: number) => {
        if (fixedCosts.length > 1) {
            setFixedCosts(costs => costs.filter(cost => cost.id !== id));
        }
    }

    // Handlers for Time Costs
    const handleTimeCostChange = (id: number, field: keyof Omit<TimeCost, 'id'>, value: string) => {
        setTimeCosts(costs => 
            costs.map(cost => {
                 if (cost.id === id) {
                    if (field === 'description') {
                        return { ...cost, [field]: value };
                    }
                    return { ...cost, [field]: parseFloat(value) || 0 };
                }
                return cost;
            })
        );
    };

    const addTimeCostRow = () => {
        setTimeCosts(costs => [...costs, {id: Date.now(), description: "", days: 0, hours: 0, minutes: 0, ratePerHour: 50}]);
    }
    const removeTimeCostRow = (id: number) => {
         if (timeCosts.length > 1) {
            setTimeCosts(costs => costs.filter(cost => cost.id !== id));
        }
    }
    
    const calculatePaymentFee = (price: number, method: PaymentMethod): number => {
        switch (method) {
            case 'mada':
                return Math.min(price * 0.00695, 160);
            case 'gcc':
                return Math.min(price * 0.02, 37.5);
            case 'visa':
                // The image says for transactions <= 250, but it's more likely a general fee.
                // Assuming 2.25% + 1 SAR for all transactions for a more standard calculation.
                return (price * 0.0225) + 1;
            case 'bank':
            default:
                return 0;
        }
    }

    const { totalFixedCosts, totalTimeCosts, grandTotalCost, paymentProcessingFee } = React.useMemo(() => {
        const totalFixed = fixedCosts.reduce((acc, cost) => acc + (cost.amount || 0), 0);
        
        const totalTime = timeCosts.reduce((acc, cost) => {
            const totalHours = ((cost.days || 0) * 8) + (cost.hours || 0) + ((cost.minutes || 0) / 60);
            return acc + (totalHours * (cost.ratePerHour || 0));
        }, 0);
        
        const priceForFee = Number(sellingPrice) || 0;
        const paymentFee = calculatePaymentFee(priceForFee, paymentMethod);

        const grandTotal = (Number(baseCost) || 0) + totalFixed + totalTime + paymentFee;

        return { 
            totalFixedCosts: totalFixed, 
            totalTimeCosts: totalTime, 
            paymentProcessingFee: paymentFee,
            grandTotalCost: grandTotal 
        };
    }, [fixedCosts, timeCosts, baseCost, sellingPrice, paymentMethod]);

    const handleCalculate = async () => {
        const finalPrice = Number(sellingPrice) || 0;
        if (finalPrice <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال سعر بيع صحيح.' });
            return;
        }

        const netProfit = finalPrice - grandTotalCost;
        const profitPercentage = grandTotalCost > 0 ? (netProfit / finalPrice) * 100 : (netProfit > 0 ? Infinity : -Infinity);
        
        const currentResult = { finalPrice, totalCost: grandTotalCost, netProfit, profitPercentage, paymentFee: paymentProcessingFee };
        setResult(currentResult);
        
    }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="أداة تسعير الخدمات"
        description="حلل تكاليف خدماتك بدقة لتحديد السعر المثالي وتحقيق أقصى ربح."
      />
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>حاسبة التسعير</CardTitle>
            <CardDescription>أدخل تفاصيل الخدمة والتكاليف المرتبطة بها، ثم حدد سعر البيع لتحليل الربحية.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="service-description">1. وصف الخدمة/المنتج</Label>
                    <Input id="service-description" placeholder="مثال: تصميم وتطوير موقع إلكتروني" value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} />
                </div>
                 <div className="grid gap-3">
                    <Label htmlFor="base-cost">2. التكلفة المباشرة/المبدئية (ر.س)</Label>
                    <Input id="base-cost" type="number" placeholder="0.00" value={baseCost} onChange={e => setBaseCost(e.target.value)} />
                </div>
            </div>

            {/* Time Costs Section */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">3. التكاليف المتغيرة (حسب الوقت)</h3>
                <p className="text-sm text-muted-foreground mb-4">أدخل الوقت المستغرق لكل مهمة. يوم العمل يعادل 8 ساعات.</p>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">وصف المهمة</TableHead>
                                <TableHead className="text-center">أيام</TableHead>
                                <TableHead className="text-center">ساعات</TableHead>
                                <TableHead className="text-center">دقائق</TableHead>
                                <TableHead className="text-center">تكلفة الساعة (ر.س)</TableHead>
                                <TableHead className="text-left">الإجمالي</TableHead>
                                <TableHead className="w-12"><span className="sr-only">حذف</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timeCosts.map(cost => {
                                const totalHours = ((cost.days || 0) * 8) + (cost.hours || 0) + ((cost.minutes || 0) / 60);
                                const totalCost = totalHours * (cost.ratePerHour || 0);
                                return (
                                    <TableRow key={cost.id}>
                                        <TableCell><Input placeholder="مثال: تصميم الواجهات" value={cost.description} onChange={e => handleTimeCostChange(cost.id, 'description', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" placeholder="0" value={cost.days || ''} onChange={e => handleTimeCostChange(cost.id, 'days', e.target.value)} className="text-center min-w-[60px]" /></TableCell>
                                        <TableCell><Input type="number" placeholder="0" value={cost.hours || ''} onChange={e => handleTimeCostChange(cost.id, 'hours', e.target.value)} className="text-center min-w-[60px]" /></TableCell>
                                        <TableCell><Input type="number" placeholder="0" value={cost.minutes || ''} onChange={e => handleTimeCostChange(cost.id, 'minutes', e.target.value)} className="text-center min-w-[60px]" /></TableCell>
                                        <TableCell><Input type="number" placeholder="0" value={cost.ratePerHour || ''} onChange={e => handleTimeCostChange(cost.id, 'ratePerHour', e.target.value)} className="text-center min-w-[80px]" /></TableCell>
                                        <TableCell className="text-left font-medium">{new Intl.NumberFormat('ar-SA').format(totalCost)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeTimeCostRow(cost.id)} disabled={timeCosts.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/></Button></TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Button variant="outline" size="sm" onClick={addTimeCostRow}><PlusCircle className="ml-2 h-4 w-4" /> إضافة مهمة</Button>
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={5}>إجمالي تكاليف الوقت</TableCell>
                                <TableCell colSpan={2} className="text-left">{new Intl.NumberFormat('ar-SA').format(totalTimeCosts)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>

            {/* Fixed Costs Section */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">4. التكاليف الثابتة الإضافية</h3>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[70%]">وصف التكلفة</TableHead>
                            <TableHead className="text-left">المبلغ (ر.س)</TableHead>
                            <TableHead className="w-12"><span className="sr-only">حذف</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fixedCosts.map((cost) => (
                             <TableRow key={cost.id}>
                                <TableCell><Input placeholder="مثال: رسوم استضافة، اشتراك أداة..." value={cost.description} onChange={e => handleFixedCostChange(cost.id, 'description', e.target.value)}/></TableCell>
                                <TableCell><Input type="number" placeholder="0.00" value={cost.amount || ''} onChange={e => handleFixedCostChange(cost.id, 'amount', e.target.value)} className="text-left" /></TableCell>
                                <TableCell><Button variant="ghost" size="icon" onClick={() => removeFixedCostRow(cost.id)} disabled={fixedCosts.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                         <TableRow>
                            <TableCell colSpan={3}>
                                <Button variant="outline" size="sm" onClick={addFixedCostRow}><PlusCircle className="ml-2 h-4 w-4" /> إضافة تكلفة</Button>
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                            <TableCell>إجمالي التكاليف الثابتة</TableCell>
                            <TableCell colSpan={2} className="text-left">{new Intl.NumberFormat('ar-SA').format(totalFixedCosts)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

             {/* Calculation Section */}
             <div className="border-t pt-6 grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                     <h3 className="text-lg font-bold mb-2">5. رسوم عمليات الدفع</h3>
                     <div className="grid gap-3">
                        <Label htmlFor="payment-method">اختر طريقة الدفع المتوقعة</Label>
                        <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                            <SelectTrigger id="payment-method">
                                <SelectValue placeholder="اختر طريقة الدفع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank">حوالة بنكية (0 ر.س)</SelectItem>
                                <SelectItem value="mada">مدى (0.695%، بحد أقصى 160 ر.س)</SelectItem>
                                <SelectItem value="gcc">شبكة مجلس التعاون (2%، بحد أقصى 37.5 ر.س)</SelectItem>
                                <SelectItem value="visa">بطاقة ائتمانية (2.25% + 1 ر.س)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator className="my-4"/>
                    <div className="flex justify-between items-center text-base font-bold">
                        <span>إجمالي التكلفة النهائية:</span>
                        <span className="text-destructive" dir="ltr">{new Intl.NumberFormat('ar-SA').format(grandTotalCost)} <span className="saudi-riyal">&#xea;</span></span>
                    </div>
                     <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>(شاملة رسوم الدفع: {new Intl.NumberFormat('ar-SA').format(paymentProcessingFee)} <span className="saudi-riyal">&#xea;</span>)</span>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="grid gap-3">
                        <Label htmlFor="selling-price" className="text-base font-bold">6. سعر البيع المقترح (ر.س)</Label>
                        <Input id="selling-price" type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="h-12 text-lg text-center font-bold"/>
                    </div>
                    <Button size="lg" onClick={handleCalculate} className="w-full">
                        <Calculator className="ml-2 h-4 w-4"/>
                        احسب الربحية
                    </Button>
                </div>

             </div>

             {result && (
                 <CardFooter className="border-t pt-6 text-center flex-col gap-6">
                    <h3 className="text-2xl font-bold">النتيجة النهائية لـ: {serviceDescription || "الخدمة المحددة"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <Card className="text-center">
                            <CardHeader><CardTitle className="text-base font-semibold">إجمالي التكلفة</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-destructive" dir="ltr">{new Intl.NumberFormat('ar-SA').format(result.totalCost)} <span className="saudi-riyal">&#xea;</span></p>
                            </CardContent>
                        </Card>
                         <Card className="text-center">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-semibold"><WalletCards/> رسوم الدفع</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(result.paymentFee)} <span className="saudi-riyal">&#xea;</span></p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-semibold"><DollarSign/> صافي الربح</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-600" dir="ltr">{new Intl.NumberFormat('ar-SA').format(result.netProfit)} <span className="saudi-riyal">&#xea;</span></p>
                            </CardContent>
                        </Card>
                         <Card className="text-center">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-semibold text-green-600"><TrendingUp/> نسبة الربح</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold" dir="ltr">
                                    {isFinite(result.profitPercentage) ? `${new Intl.NumberFormat('ar-SA').format(result.profitPercentage)}%` : 'N/A'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                 </CardFooter>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

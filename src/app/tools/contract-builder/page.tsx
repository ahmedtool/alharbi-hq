
'use client';

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Printer, CalendarIcon, PlusCircle, Trash2, Mail, Loader2, Send, UserCheck, Wallet, ArrowLeft } from "lucide-react";
import React, { useRef, useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ar } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import useClient from "@/hooks/use-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AmiriFont } from '@/lib/fonts/amiri-font';

interface ScopeItem {
  id: number;
  text: string;
}

interface PaymentInstallment {
    id: number;
    amount: number;
    condition: string;
}

export default function ContractBuilderPage() {
    const { toast } = useToast();
    const contractPreviewRef = useRef<HTMLDivElement>(null);
    const isClient = useClient();

    // 1. Party 1 Details (Provider)
    const [providerName, setProviderName] = useState("أحمد الحربي");
    const [providerTitle, setProviderTitle] = useState("مطور ويب مستقل");
    const [providerEmail, setProviderEmail] = useState("ahmedsupsa@gmail.com");
    const [providerPhone, setProviderPhone] = useState("+966560766880");

    // 2. Client Details
    const [clientName, setClientName] = useState("");
    const [clientCompany, setClientCompany] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");

    // 3. Project Details
    const [serviceDesc, setServiceDesc] = useState("تصميم وتطوير المواقع الإلكترونية");
    const [scopeItems, setScopeItems] = useState<ScopeItem[]>([
      { id: 1, text: "تصميم واجهات المستخدم (UI/UX) للموقع." },
      { id: 2, text: "تطوير الموقع ليكون متجاوب مع جميع الشاشات." },
    ]);
    const [contractDuration, setContractDuration] = useState("3 أشهر");
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    // 4. Financial Details (Installments)
    const [installments, setInstallments] = useState<PaymentInstallment[]>([
        { id: 1, amount: 5000, condition: "عند توقيع العقد مباشرة (دفعة مقدمة)" },
        { id: 2, amount: 5000, condition: "عند تسليم العمل بشكل كامل" },
    ]);

    // UI States
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

    useEffect(() => {
        const initialEndDate = new Date();
        initialEndDate.setMonth(initialEndDate.getMonth() + 3);
        setEndDate(initialEndDate);
    }, []);

    const totalCost = useMemo(() => installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0), [installments]);

    const handleAddInstallment = () => {
        setInstallments([...installments, { id: Date.now(), amount: 0, condition: "" }]);
    };

    const handleRemoveInstallment = (id: number) => {
        if (installments.length > 1) {
            setInstallments(installments.filter(inst => inst.id !== id));
        }
    };

    const handleInstallmentChange = (id: number, field: keyof PaymentInstallment, value: any) => {
        setInstallments(installments.map(inst => inst.id === id ? { ...inst, [field]: value } : inst));
    };

    const handleAddScopeItem = () => {
      setScopeItems([...scopeItems, { id: Date.now(), text: "" }]);
    };

    const handleRemoveScopeItem = (id: number) => {
      setScopeItems(scopeItems.filter(item => item.id !== id));
    };

    const handleScopeItemChange = (id: number, text: string) => {
      setScopeItems(scopeItems.map(item => (item.id === id ? { ...item, text } : item)));
    };

    const b64Decode = (str: string) => {
        if (typeof window !== 'undefined') {
            const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, '');
            return window.atob(cleanStr);
        }
        return Buffer.from(str, 'base64').toString('binary');
    };
    
    const handleExportPdf = async () => {
        const input = contractPreviewRef.current;
        if (!input) return;
        toast({ title: "جاري تجهيز ملف PDF..."});
        try {
            const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            let finalImgWidth = pdfWidth;
            let finalImgHeight = pdfWidth / ratio;
            
            if (finalImgHeight > pdfHeight) {
                 finalImgHeight = pdfHeight;
                 finalImgWidth = pdfHeight * ratio;
            }
            
            const xPos = (pdfWidth - finalImgWidth) / 2;
            pdf.addImage(imgData, 'PNG', xPos, 0, finalImgWidth, finalImgHeight);
            pdf.save(`عقد-${clientName || 'جديد'}.pdf`);
            toast({ title: "تم تصدير العقد بنجاح." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "فشل إنشاء PDF" });
        }
    };

    const handleSendEmail = async () => {
        if (!clientEmail) {
            toast({ variant: 'destructive', title: "الرجاء إدخال بريد العميل أولاً." });
            return;
        }
        setIsSendingEmail(true);
        try {
            const formattedTotal = isClient ? new Intl.NumberFormat('ar-SA').format(totalCost) : totalCost.toString();
            
            const emailHtml = `
                <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #09090b; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0;">عقد تقديم خدمات رقمية</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>عزيزي/عزيزتي <strong>${clientName || 'العميل'}</strong>،</p>
                        <p>أتمنى أن تكون بخير.</p>
                        <p>يسرني إرسال مسودة العقد الخاصة بمشروع <strong>"${serviceDesc}"</strong> للمراجعة والاعتماد.</p>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #000;">ملخص العقد:</h3>
                            <ul style="list-style: none; padding: 0;">
                                <li>📅 <strong>مدة التنفيذ:</strong> ${contractDuration}</li>
                                <li>💰 <strong>إجمالي التكلفة:</strong> ${formattedTotal} ريال سعودي</li>
                                <li>🔢 <strong>عدد الدفعات:</strong> ${installments.length} دفعات</li>
                            </ul>
                        </div>

                        <p>يرجى الاطلاع على كامل التفاصيل في الملف المرفق أو عبر الرابط المعتمد. في حال وجود أي استفسارات، أنا متاح للنقاش دائماً.</p>
                        
                        <p style="margin-top: 30px;">مع خالص التحية،،<br><strong>${providerName}</strong><br>${providerTitle}</p>
                    </div>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                        هذا الإيميل مرسل عبر منصة "أدوات أحمد" - النظام الإداري المتكامل.
                    </div>
                </div>
            `;

            // استخدام معرّف المشروع الفعلي us-central1-my-cockpit-vu7m6
            const functionUrl = 'https://us-central1-my-cockpit-vu7m6.cloudfunctions.net/sendEmail';
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: clientEmail,
                    subject: `عقد تقديم خدمات - ${providerName}`,
                    htmlBody: emailHtml,
                    fromName: providerName
                })
            });

            if (response.status === 404) {
                throw new Error("رابط خدمة الإرسال غير موجود (404). هل قمت بنشر الدوال باستخدام firebase deploy؟");
            }

            const result = await response.json();

            if (response.ok && result.success) {
                toast({ title: "تم إرسال الإيميل للعميل بنجاح!", description: "ستصل العميل رسالة احترافية تحتوي على ملخص العقد." });
                setIsEmailDialogOpen(false);
            } else {
                throw new Error(result.message || "فشل إرسال البريد من السيرفر.");
            }
        } catch (error: any) {
            console.error("Fetch error:", error);
            toast({ 
                variant: 'destructive', 
                title: 'فشل في عملية الإرسال', 
                description: error.message || 'تأكد من نشر الدوال (Functions) واتصال الإنترنت.' 
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (!isClient) {
        return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="اداة بناء العقود المطورة"
        description="أنشئ عقودك ببياناتك الخاصة، وجدول دفعاتك، وأرسلها للعميل مباشرة عبر الإيميل."
      >
        <div className="flex gap-2">
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Mail className="ml-2 h-4 w-4"/>
                        إرسال للعميل
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>إرسال العقد بريدياً</DialogTitle>
                        <DialogDescription>سيتم إرسال رسالة احترافية مصممة للعميل تحتوي على ملخص العقد.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 text-right">
                        <div className="space-y-2">
                            <Label>بريد العميل الإلكتروني</Label>
                            <Input placeholder="email@example.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} dir="ltr" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEmailDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSendEmail} disabled={isSendingEmail || !clientEmail}>
                            {isSendingEmail ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Send className="ml-2 h-4 w-4"/>}
                            إرسال الآن
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button onClick={handleExportPdf}>
                <Printer className="ml-2 h-4 w-4"/>
                تصدير كـ PDF
            </Button>
        </div>
      </PageHeader>

      <main className="grid gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary"/> 1. بياناتك (الطرف الأول)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                     <div className="grid gap-2">
                        <Label>اسمك الثلاثي</Label>
                        <Input value={providerName} onChange={e => setProviderName(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label>المسمى الوظيفي</Label>
                        <Input value={providerTitle} onChange={e => setProviderTitle(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label>بريدك الإلكتروني</Label>
                        <Input type="email" dir="ltr" value={providerEmail} onChange={e => setProviderEmail(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label>رقم الجوال</Label>
                        <Input type="tel" dir="ltr" value={providerPhone} onChange={e => setProviderPhone(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. بيانات العميل (الطرف الثاني)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                     <div className="grid gap-2">
                        <Label>اسم العميل</Label>
                        <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="مثال: خالد العتيبي" />
                    </div>
                     <div className="grid gap-2">
                        <Label>اسم الشركة</Label>
                        <Input value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="مثال: مؤسسة الحلول الرقمية" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>3. تفاصيل المشروع والنطاق</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                     <div className="grid gap-2">
                        <Label>وصف الخدمة الرئيسي</Label>
                        <Textarea value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                         <Label>بنود نطاق العمل</Label>
                         <div className="space-y-2">
                            {scopeItems.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <Input value={item.text} onChange={e => handleScopeItemChange(item.id, e.target.value)} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveScopeItem(item.id)} disabled={scopeItems.length === 1}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                         </div>
                         <Button variant="outline" size="sm" onClick={handleAddScopeItem} className="mt-2"><PlusCircle className="h-4 w-4 ml-2"/> إضافة بند</Button>
                    </div>
                     <div className="grid gap-2">
                        <Label>مدة العقد</Label>
                        <Input value={contractDuration} onChange={e => setContractDuration(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/> 4. جدولة الدفعات المالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {installments.map((inst, index) => (
                        <div key={inst.id} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground">الدفعة {index + 1}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveInstallment(inst.id)} disabled={installments.length === 1}>
                                    <Trash2 className="h-3 w-3"/>
                                </Button>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs">المبلغ (ر.س)</Label>
                                <Input type="number" value={inst.amount} onChange={e => handleInstallmentChange(inst.id, 'amount', Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs">شرط الاستحقاق</Label>
                                <Input placeholder="مثال: عند توقيع العقد" value={inst.condition} onChange={e => handleInstallmentChange(inst.id, 'condition', e.target.value)} />
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={handleAddInstallment}>
                        <PlusCircle className="ml-2 h-4 w-4" /> إضافة دفعة مالية
                    </Button>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                        <p className="text-sm font-bold">إجمالي قيمة العقد</p>
                        <p className="text-2xl font-extrabold text-primary" dir="ltr">
                            {isClient ? new Intl.NumberFormat('ar-SA').format(totalCost) : totalCost} <span className="saudi-riyal">&#xea;</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
          <div ref={contractPreviewRef} className="p-10 bg-card text-card-foreground shadow-lg rounded-lg border leading-loose text-sm min-h-[1000px]">
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div className="text-right">
                    <h1 className="text-2xl font-bold">عقد تقديم خدمات عمل حر</h1>
                    <p className="text-muted-foreground">التاريخ: {isClient ? new Date().toLocaleDateString('ar-EG-u-nu-latn') : ''}</p>
                </div>
                <div className="bg-primary text-primary-foreground p-3 rounded font-bold">نسخة معتمدة</div>
            </div>

            <div className="mb-8">
                <p className="font-bold text-lg mb-4">بين كل من:</p>
                <div className="grid sm:grid-cols-2 gap-8 text-xs bg-muted/20 p-4 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-primary mb-2 border-b pb-1">الطرف الأول (مقدم الخدمة):</p>
                    <p><strong>الاسم:</strong> {providerName}</p>
                    <p><strong>المسمى:</strong> {providerTitle}</p>
                    <p><strong>البريد:</strong> {providerEmail}</p>
                    <p><strong>الجوال:</strong> {providerPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-primary mb-2 border-b pb-1">الطرف الثاني (العميل):</p>
                    <p><strong>الاسم:</strong> {clientName || '[اسم العميل]'}</p>
                    <p><strong>الشركة:</strong> {clientCompany || '[اسم الشركة]'}</p>
                    {clientEmail && <p><strong>البريد:</strong> {clientEmail}</p>}
                    {clientPhone && <p><strong>الجوال:</strong> {clientPhone}</p>}
                  </div>
                </div>
            </div>
            
            <h2 className="font-bold text-base mt-6 mb-2">تمهيد:</h2>
            <p className="mb-4 text-xs text-justify">
              حيث أن الطرف الأول لديه الخبرة المهنية في تقديم خدمات {serviceDesc}، وحيث أن الطرف الثاني يرغب في الاستعانة بخبرات الطرف الأول لتنفيذ المشروع المتفق عليه، فقد اتفق الطرفان وهما بكامل أهليتهما المعتبرة على ما يلي:
            </p>

            <h2 className="font-bold text-base mt-4 mb-2">المادة (1): نطاق العمل</h2>
            <p className="mb-2 text-xs">يلتزم الطرف الأول بتنفيذ المهام التالية:</p>
            <ul className="list-decimal list-inside space-y-1.5 pr-4 text-xs">
              {scopeItems.map(item => <li key={item.id}>{item.text || '...'}</li>)}
            </ul>

            <h2 className="font-bold text-base mt-4 mb-2">المادة (2): مدة التنفيذ</h2>
            <p className="text-xs">
              مدة هذا العقد هي {contractDuration} تبدأ من تاريخ توقيع هذا العقد وسداد الدفعة الأولى، ومن المتوقع انتهاء العمل بتاريخ {endDate ? format(endDate, "yyyy/MM/dd", { locale: ar }) : "[تاريخ الانتهاء]"}.
            </p>

            <h2 className="font-bold text-base mt-4 mb-2">المادة (3): التكاليف وجدول الدفعات</h2>
            <p className="text-xs mb-2">إجمالي قيمة العقد هي مبلغ وقدره <span className="font-bold text-primary">{isClient ? new Intl.NumberFormat('ar-SA').format(totalCost) : totalCost}</span> ريال سعودي، تُدفع وفق الجدول التالي:</p>
            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-xs">رقم الدفعة</TableHead>
                            <TableHead className="text-xs text-center">المبلغ</TableHead>
                            <TableHead className="text-xs text-center">شرط الاستحقاق</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {installments.map((inst, i) => (
                            <TableRow key={inst.id} className="text-xs">
                                <TableCell>الدفعة {i+1}</TableCell>
                                <TableCell className="font-bold text-center">{isClient ? new Intl.NumberFormat('ar-SA').format(inst.amount) : inst.amount} ر.س</TableCell>
                                <TableCell className="text-center">{inst.condition || '...'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <h2 className="font-bold text-base mt-6 mb-2">المادة (4): الملكية الفكرية</h2>
            <p className="text-xs text-justify">تنتقل كافة حقوق الملكية الفكرية والملفات المصدرية للعمل النهائي إلى الطرف الثاني فور سداد كامل مستحقات العقد الواردة في المادة (3). ويحق للطرف الأول عرض العمل في معرض أعماله الخاص ما لم يتم الاتفاق كتابياً على خلاف ذلك.</p>

            <div className="mt-24 border-t pt-8">
              <div className="flex justify-between items-start text-xs">
                 <div className="w-1/2 text-center border-l border-dashed">
                  <p className="font-bold text-sm mb-4">توقيع الطرف الأول</p>
                  <p className="font-semibold">{providerName}</p>
                  <div className="mt-8 h-12 border-b border-dashed w-3/4 mx-auto opacity-30 flex items-center justify-center italic text-[10px]">توقيع إلكتروني معتمد</div>
                </div>
                 <div className="w-1/2 text-center">
                  <p className="font-bold text-sm mb-4">توقيع الطرف الثاني (العميل)</p>
                  <p className="font-semibold">{clientName || '...'}</p>
                  <div className="mt-8 h-12 border-b border-dashed w-3/4 mx-auto opacity-30 flex items-center justify-center italic text-[10px]">توقيع وختم الطرف الثاني</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

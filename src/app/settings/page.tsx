
"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, RefreshCcw, Download, Upload, ShieldCheck, KeyRound } from "lucide-react";
import React, { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { exportData, importData } from "./data-actions";
import { updatePin } from "./actions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function SettingsPage() {
    const { toast } = useToast();
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);


    const handleClearCache = async () => {
        if (!window.confirm("هل أنت متأكد أنك تريد مسح الكاش؟ سيتم تسجيل خروجك وإعادة تحميل التطبيق بالكامل.")) return;
        setIsClearingCache(true);
        toast({
            title: "جاري مسح الكاش...",
            description: "قد يستغرق هذا بضع ثوانٍ.",
        });

        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if (window.caches) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }
            
            localStorage.clear();
            sessionStorage.clear();

            toast({
                title: "تم مسح الكاش بنجاح!",
                description: "جاري إعادة تحميل التطبيق...",
            });
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Error clearing cache:", error);
            toast({
                variant: "destructive",
                title: "فشل مسح الكاش",
                description: "حدث خطأ غير متوقع. حاول إعادة تحميل الصفحة يدويًا.",
            });
            setIsClearingCache(false);
        }
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        toast({ title: "جاري تجهيز البيانات للتصدير..." });
        try {
            const data = await exportData();

            if (Object.keys(data).length === 0) {
                 toast({ variant: "destructive", title: "فشل التصدير", description: "لم يتم العثور على بيانات للتصدير." });
                 setIsExporting(false);
                 return;
            }

            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            toast({ title: "تم تصدير البيانات بنجاح." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "فشل تصدير البيانات.", description: "يرجى مراجعة سجلات الخادم." });
        } finally {
            setIsExporting(false);
        }
    }

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        toast({ title: "جاري قراءة ملف الاستيراد..." });
        try {
            const fileContent = await file.text();
            
            const result = await importData(fileContent);

            if (result.success) {
                toast({ title: "تم استيراد البيانات بنجاح!", description: "سيتم إعادة تحميل الصفحة لتطبيق التغييرات." });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                 toast({ variant: "destructive", title: "فشل استيراد البيانات.", description: result.message });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "فشل استيراد البيانات.", description: "تأكد من أن الملف صحيح وأن لديك الصلاحيات اللازمة." });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }
    
    const handleUpdatePin = async () => {
        if (currentPin.length !== 4 || newPin.length !== 4) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رمز PIN مكون من 4 أرقام." });
            return;
        }
        setIsUpdatingPin(true);
        try {
            const result = await updatePin(currentPin, newPin);
            if (result.success) {
                toast({ title: "نجاح", description: result.message });
                setCurrentPin("");
                setNewPin("");
            } else {
                toast({ variant: "destructive", title: "فشل", description: result.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ في الخادم" });
        } finally {
            setIsUpdatingPin(false);
        }
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title="الإعدادات" description="خصص تجربة أدوات أحمد على كيفك." />
            <div className="max-w-xl space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound/> إدارة رمز الدخول (PIN)</CardTitle>
                        <CardDescription>
                            يمكنك تحديث رمز الدخول السري للوحة التحكم من هنا.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Label htmlFor="current-pin">رمز PIN الحالي</Label>
                            <div className="flex justify-center" dir="ltr">
                                <InputOTP id="current-pin" maxLength={4} value={currentPin} onChange={setCurrentPin}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                         <div>
                            <Label htmlFor="new-pin">رمز PIN الجديد</Label>
                             <div className="flex justify-center" dir="ltr">
                                <InputOTP id="new-pin" maxLength={4} value={newPin} onChange={setNewPin}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleUpdatePin} disabled={isUpdatingPin || currentPin.length < 4 || newPin.length < 4}>
                            {isUpdatingPin ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="ml-2 h-4 w-4"/>}
                            {isUpdatingPin ? "جاري التحديث..." : "تحديث الرمز"}
                        </Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>إدارة البيانات (استيراد/تصدير)</CardTitle>
                        <CardDescription>
                            خذ نسخة احتياطية من جميع بياناتك أو استعدها من نسخة سابقة.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Button onClick={handleExport} disabled={isExporting}>
                             {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Download className="ml-2 h-4 w-4"/>}
                             {isExporting ? "جاري التصدير..." : "تصدير جميع البيانات"}
                        </Button>

                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isImporting}>
                                    {isImporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Upload className="ml-2 h-4 w-4"/>}
                                    استيراد بيانات
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيؤدي استيراد البيانات إلى <span className="font-bold text-destructive">حذف جميع البيانات الحالية بشكل نهائي</span> واستبدالها بالبيانات الموجودة في الملف الذي سترفعه. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                                    نعم، متابعة الاستيراد
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                         <Input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport}/>

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>إدارة الكاش</CardTitle>
                        <CardDescription>
                            امسح البيانات المؤقتة للتطبيق لضمان عرض أحدث المعلومات من السيرفر. سيؤدي هذا إلى تسجيل خروجك.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={handleClearCache} disabled={isClearingCache}>
                            {isClearingCache ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="ml-2 h-4 w-4"/>}
                            {isClearingCache ? "جاري المسح..." : "مسح الكاش وإعادة التحميل"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}



"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { collection, addDoc, Timestamp, getDocs } from "@/lib/db";
import { ref, uploadBytes, getDownloadURL } from "@/lib/storage";
import { Loader2, Send, File as FileIcon, X, Check, Mail, Phone, User, Package, MessageSquare, Briefcase, ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence, motion } from "framer-motion";


const generateTicketId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

interface Product {
    id: string;
    name: string;
    price: number;
}

const categoryMap: { [key: string]: {label: string, icon: React.ElementType, needsMessage: boolean} } = {
    'service-request': { label: 'طلب خدمة/منتج', icon: Package, needsMessage: false },
    'project-request': { label: 'طلب مشروع', icon: Briefcase, needsMessage: true },
    'quote-request': { label: 'طلب تسعيرة', icon: MessageSquare, needsMessage: true },
    'collaboration': { label: 'تعاون مشترك', icon: User, needsMessage: true },
    'job-inquiry': { label: 'بحث عن عمل', icon: FileIcon, needsMessage: true },
    'other': { label: 'غيرها', icon: MessageSquare, needsMessage: true },
};

export default function SubmitTicketPage() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = React.useState(1);

    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    
    const [category, setCategory] = React.useState<string>('');
    const [selectedProduct, setSelectedProduct] = React.useState<string>('');

    const [subject, setSubject] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [files, setFiles] = React.useState<File[]>([]);
    const [isSending, setIsSending] = React.useState(false);
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    
    const [products, setProducts] = React.useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);

     useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsSnapshot = await getDocs(collection(db, "products"));
                const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        if (category === 'service-request' && selectedProduct) {
            const product = products.find(p => p.id === selectedProduct);
            if (product) {
                setSubject(`طلب خدمة: ${product.name}`);
            }
        }
    }, [category, selectedProduct, products]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > 3) {
                toast({
                    variant: 'destructive',
                    title: 'حد أقصى 3 ملفات',
                });
                return;
            }
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };
    
    const removeFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };
    
    const handleNextStep = () => {
        if (!name) {
            toast({ variant: 'destructive', title: "الرجاء إدخال الاسم الكامل." });
            return;
        }
        if (!email && !phone) {
             toast({ variant: 'destructive', title: "الرجاء إدخال بريدك الإلكتروني أو رقم جوالك على الأقل." });
             return;
        }
        if (phone && !/^05\d{8}$/.test(phone)) {
            toast({ variant: 'destructive', title: "رقم الجوال المدخل غير صحيح.", description: "يجب أن يبدأ بـ 05 ويتكون من 10 أرقام."});
            return;
        }
        setCurrentStep(2);
    }

    const validateStep2 = () => {
        if (!category) {
            toast({ variant: 'destructive', title: "الرجاء اختيار تصنيف الطلب." });
            return false;
        }
        const needsMessage = categoryMap[category]?.needsMessage ?? true;
        if (category === 'service-request' && !selectedProduct) {
             toast({ variant: 'destructive', title: "الرجاء اختيار الخدمة أو المنتج." });
             return false;
        }
        if (needsMessage && !subject) {
             toast({ variant: 'destructive', title: "الرجاء كتابة موضوع الطلب." });
             return false;
        }
        if (needsMessage && !message) {
            toast({ variant: 'destructive', title: "الرجاء كتابة تفاصيل الرسالة." });
            return false;
        }
        return true;
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep2()) return;

        setIsSending(true);

        try {
            const isServiceRequest = category === 'service-request';
            const productDetails = isServiceRequest ? products.find(p => p.id === selectedProduct) : null;
            const finalSubject = isServiceRequest && productDetails ? `طلب خدمة: ${productDetails.name}` : subject;
            const finalMessage = message || (isServiceRequest && productDetails ? `العميل يطلب المنتج/الخدمة: ${productDetails.name}` : 'لا يوجد نص رسالة.');


            const now = Timestamp.now();
            const ticketId = generateTicketId();

            const fileUploadPromises = files.map(file => {
                const storageRef = ref(storage, `support_tickets/${ticketId}/${file.name}`);
                return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            
            const fileUrls = await Promise.all(fileUploadPromises);

            const ticketDocRef = await addDoc(collection(db, "support_tickets"), {
                ticketId: ticketId,
                customerName: name,
                customerEmail: email || null,
                customerPhone: phone || null,
                category: category,
                subject: finalSubject,
                productDetails: productDetails ? { name: productDetails.name, price: productDetails.price } : null,
                fileUrls: fileUrls,
                status: 'new',
                createdAt: now,
                updatedAt: now,
            });

            await addDoc(collection(db, `support_tickets/${ticketDocRef.id}/messages`), {
                text: finalMessage,
                sender: 'customer',
                createdAt: now,
            });

            setIsSubmitted(true);
            toast({
                title: "تم استلام طلبك بنجاح!",
                description: `شكرًا لك. رقم طلبك هو ${ticketId}. سيتم التواصل معك قريبًا.`,
            });
            
        } catch (error) {
            console.error("Error submitting ticket: ", error);
            toast({
                variant: 'destructive',
                title: "حدث خطأ",
                description: "لم نتمكن من إرسال طلبك. الرجاء المحاولة مرة أخرى.",
            });
        } finally {
            setIsSending(false);
        }
    };

    if (isSubmitted) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-background">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                         <Card className="w-full max-w-lg shadow-none">
                            <CardHeader className="items-center">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                                    className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
                                >
                                    <Check className="w-8 h-8 text-green-600" />
                                </motion.div>
                                <CardTitle className="text-2xl">تم الإرسال بنجاح</CardTitle>
                                <CardDescription>شكرًا لتواصلك معنا. سنقوم بالرد عليك في أقرب وقت ممكن عبر وسيلة التواصل التي قدمتها.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">يمكنك الآن إغلاق هذه الصفحة بأمان.</p>
                            </CardContent>
                         </Card>
                    </motion.div>
                 </AnimatePresence>
            </div>
        )
    }
    
    const needsMessageInput = category ? (categoryMap[category]?.needsMessage ?? true) : true;

    const cardVariants = {
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 },
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-right bg-background">
             <div className="absolute top-6">
                <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="Logo" width={48} height={48} priority />
            </div>
            
            <AnimatePresence mode="wait">
                {currentStep === 1 && (
                     <motion.div key="step1" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-2xl mt-20">
                        <Card className="w-full shadow-none">
                            <CardHeader>
                                <CardTitle>الخطوة 1: معلومات التواصل</CardTitle>
                                <CardDescription>نحتاج إلى معلوماتك الأساسية للتواصل معك بخصوص طلبك.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-4">
                                     <div className="space-y-1.5">
                                        <Label htmlFor="name">الاسم الكامل *</Label>
                                        <div className="relative">
                                             <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                             <Input id="name" value={name} onChange={e => setName(e.target.value)} required className="pr-10"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">البريد الإلكتروني</Label>
                                         <div className="relative">
                                             <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                             <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="pr-10 text-right"/>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone">رقم الجوال</Label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="05xxxxxxxx" className="pr-10 text-right"/>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">الرجاء إدخال البريد الإلكتروني أو رقم الجوال على الأقل.</p>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleNextStep} size="lg" className="w-full">
                                    التالي <ArrowLeft className="mr-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}

                 {currentStep === 2 && (
                    <motion.div key="step2" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-2xl mt-20">
                        <Card className="w-full shadow-none">
                            <CardHeader>
                                <CardTitle>الخطوة 2: تفاصيل الطلب</CardTitle>
                                <CardDescription>الرجاء تقديم تفاصيل دقيقة حول طلبك.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-6">
                                     <div className="space-y-1.5">
                                        <Label htmlFor="category-select">تصنيف الطلب *</Label>
                                        <Select onValueChange={setCategory} value={category}>
                                            <SelectTrigger id="category-select">
                                                <SelectValue placeholder="اختر تصنيف الطلب..." />
                                            </SelectTrigger>
                                            <SelectContent position="popper">
                                                {Object.entries(categoryMap).map(([key, {label, icon: Icon}]) => (
                                                    <SelectItem key={key} value={key}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                            {label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <AnimatePresence>
                                    {category === 'service-request' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-1.5 pt-2 overflow-hidden"
                                        >
                                            <Label htmlFor="product-select">اختر الخدمة / المنتج *</Label>
                                            <Select onValueChange={setSelectedProduct} value={selectedProduct}>
                                                <SelectTrigger id="product-select" disabled={isLoadingProducts}>
                                                    <SelectValue placeholder={isLoadingProducts ? "جاري تحميل الخدمات..." : "اختر من القائمة..."} />
                                                </SelectTrigger>
                                                <SelectContent position="popper">
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} - ({p.price.toFixed(2)} ر.س)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>

                                    <AnimatePresence>
                                    {category && needsMessageInput && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-4 pt-2 overflow-hidden"
                                        >
                                            <div className="space-y-1.5">
                                                <Label htmlFor="subject">الموضوع *</Label>
                                                <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} required/>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="message">الرسالة *</Label>
                                                <Textarea id="message" rows={5} value={message} onChange={e => setMessage(e.target.value)} required/>
                                            </div>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="attachments">المرفقات (اختياري، 3 ملفات كحد أقصى)</Label>
                                        <Input id="attachments" type="file" multiple onChange={handleFileChange} className="pt-2" disabled={files.length >= 3}/>
                                        <AnimatePresence>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {files.map((file, index) => (
                                                <motion.div 
                                                    key={file.name + index}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm"
                                                >
                                                    <FileIcon className="h-4 w-4" />
                                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                                    <button type="button" onClick={() => removeFile(index)} className="text-destructive hover:text-destructive/80">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                        </AnimatePresence>
                                    </div>
                                </CardContent>
                                <CardFooter className="gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(1)}>
                                        العودة
                                    </Button>
                                    <Button type="submit" className="w-full" disabled={isSending} size="lg">
                                        {isSending && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                                        {isSending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


"use client";

import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import { db } from "@/lib/db";
import { collection, doc, getDoc, updateDoc, query, orderBy, Timestamp, getDocs, addDoc, setDoc, where, limit, deleteDoc, writeBatch } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, FileText, CheckCircle, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardTitle, CardHeader, CardFooter } from "@/components/ui/card";
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from "next/link";
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


interface Ticket {
    id: string;
    ticketId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    category: string;
    subject: string;
    productDetails?: { name: string, price: number } | null;
    fileUrls?: string[];
    status: 'new' | 'in-progress' | 'closed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface Message {
    id: string;
    text: string;
    sender: 'customer' | 'support';
    createdAt: Timestamp;
}

const categoryMap: { [key: string]: string } = {
    'project-request': 'طلب مشروع',
    'service-request': 'طلب خدمة/منتج',
    'custom-request': 'طلب خدمة مخصصة',
    'quote-request': 'طلب تسعيرة',
    'collaboration': 'تعاون مشترك',
    'job-inquiry': 'بحث عن عمل',
    'other': 'غيرها',
};

const generateInvoiceNumber = async () => {
    const q = query(collection(db, "invoices"), orderBy("invoiceNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return "INV-001";
    }
    const lastInvoice = querySnapshot.docs[0].data();
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1], 10);
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `INV-${newNumber}`;
}

export default function TicketDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id: ticketId } = params;
    const { toast } = useToast();

    const [ticket, setTicket] = React.useState<Ticket | null>(null);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [reply, setReply] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSending, setIsSending] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isClient, setIsClient] = React.useState(false);
    
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const fetchTicketAndMessages = React.useCallback(async () => {
         if (!ticketId) return;
        setIsLoading(true);
        try {
            const ticketDoc = await getDoc(doc(db, "support_tickets", ticketId as string));
            if (!ticketDoc.exists()) {
                toast({ variant: "destructive", title: "التذكرة غير موجودة." });
                router.push('/support');
                return;
            }
            setTicket({ id: ticketDoc.id, ...ticketDoc.data() } as Ticket);

            const messagesQuery = query(collection(db, `support_tickets/${ticketId}/messages`), orderBy("createdAt", "asc"));
            const messagesSnapshot = await getDocs(messagesQuery);
            const messagesData = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(messagesData);
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ في جلب بيانات التذكرة" });
        } finally {
            setIsLoading(false);
        }
    }, [ticketId, toast, router]);

    React.useEffect(() => {
        fetchTicketAndMessages();
    }, [fetchTicketAndMessages]);

    const handleSendReply = async () => {
        if (!ticket || !reply.trim()) return;
        setIsSending(true);
        try {
            await addDoc(collection(db, `support_tickets/${ticket.id}/messages`), {
                text: reply,
                sender: 'support',
                createdAt: Timestamp.now(),
            });

            await updateDoc(doc(db, "support_tickets", ticket.id), {
                updatedAt: Timestamp.now(),
            });

            toast({ title: "تم إرسال الرد بنجاح وحفظه في السجل." });

            setReply("");
            fetchTicketAndMessages();

        } catch (error) {
             toast({ variant: "destructive", title: "خطأ في إرسال الرد" });
             console.error(error);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleStatusChange = async (status: Ticket['status']) => {
        if (!ticket) return;
        try {
            await updateDoc(doc(db, "support_tickets", ticket.id), { status, updatedAt: Timestamp.now() });
            toast({ title: "تم تحديث حالة التذكرة." });
            setTicket(prev => prev ? {...prev, status} : null);
        } catch(error) {
            toast({ variant: "destructive", title: "خطأ في تحديث الحالة." });
        }
    };
    
    const handleDeleteTicket = async () => {
        if (!ticket) return;
        setIsDeleting(true);
        try {
            const messagesQuery = query(collection(db, `support_tickets/${ticket.id}/messages`));
            const messagesSnapshot = await getDocs(messagesQuery);
            const batch = writeBatch(db);
            messagesSnapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();

            await deleteDoc(doc(db, "support_tickets", ticket.id));
            
            toast({ title: "تم حذف التذكرة بنجاح" });
            router.push('/support');

        } catch (error) {
            console.error("Error deleting ticket:", error);
            toast({ variant: "destructive", title: "خطأ في حذف التذكرة." });
            setIsDeleting(false);
        }
    }


    const handleConfirmSale = async () => {
        if (!ticket || !ticket.productDetails) return;
        
        setIsSending(true);
        toast({title: "جاري تأكيد البيع..."});

        try {
            const invoiceNumber = await generateInvoiceNumber();
            const today = new Date();
            const dueDate = new Date();
            dueDate.setDate(today.getDate() + 14);

            const invoiceId = `inv_${ticket.id}`;
            const invoiceData = {
                id: invoiceId,
                invoiceNumber: invoiceNumber,
                clientName: ticket.customerName,
                total: ticket.productDetails.price,
                invoiceDate: today.toISOString().split('T')[0],
                dueDate: dueDate.toISOString().split('T')[0],
                status: "paid",
                paymentMethod: "متجر سلة",
                internalNotes: `تم إنشاؤها تلقائيًا من طلب الدعم #${ticket.ticketId}`,
                yourDetails: "أحمد الحربي\nمطور ويب مستقل\nالرياض، المملكة العربية السعودية\nahmed@example.com",
                clientCompany: "",
                lineItems: [{
                    id: 1,
                    description: ticket.productDetails.name,
                    quantity: 1,
                    price: ticket.productDetails.price,
                }],
                subtotal: ticket.productDetails.price,
            };
            await setDoc(doc(db, "invoices", invoiceId), invoiceData);
            toast({title: "تم إنشاء الفاتورة بنجاح", description: `رقم الفاتورة: ${invoiceNumber}`});

            const transactionId = `inv_${invoiceId}`;
            await setDoc(doc(db, "transactions", transactionId), {
                id: transactionId,
                description: `دخل من الفاتورة #${invoiceNumber}`,
                amount: ticket.productDetails.price,
                type: 'income',
                category: 'دخل فواتير',
                date: new Date().toISOString()
            });
            toast({title: "تم تسجيل معاملة الدخل بنجاح"});

            await updateDoc(doc(db, "support_tickets", ticket.id), { 
                status: 'closed',
                updatedAt: Timestamp.now() 
            });
            toast({title: "تم إغلاق التذكرة"});
            
            fetchTicketAndMessages();
            router.push('/finance/invoices');

        } catch (error) {
            console.error("Error confirming sale:", error);
            toast({ variant: "destructive", title: "خطأ في عملية تأكيد البيع." });
        } finally {
            setIsSending(false);
        }
    };


    if (isLoading) {
        return (
             <div className="p-4 sm:p-6 lg:p-8 space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
                <Card>
                    <CardContent className="p-6 space-y-4">
                         <Skeleton className="h-20 w-full" />
                         <Skeleton className="h-40 w-full" />
                         <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 text-center">
                <p>لم يتم العثور على التذكرة.</p>
                <Button asChild variant="link">
                    <Link href="/support">
                        <ArrowLeft className="ml-2 h-4 w-4" />
                        العودة للدعم الفني
                    </Link>
                </Button>
            </div>
        )
    }

    const canConfirmSale = ticket.category === 'service-request' && ticket.productDetails && ticket.status !== 'closed';

    return (
         <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title={`طلب #${ticket.ticketId}`} description={ticket.subject}>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="ml-2 h-4 w-4" /> حذف التذكرة
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيتم حذف هذه التذكرة وجميع الرسائل المتعلقة بها بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                               {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : "نعم، حذف"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                 <Button asChild variant="outline">
                    <Link href="/support">
                        <ArrowLeft className="ml-2 h-4 w-4" />
                        العودة لكل الطلبات
                    </Link>
                </Button>
            </PageHeader>
            <main className="grid gap-8 md:grid-cols-3 items-start">
                <div className="md:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>سجل المحادثة</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[60vh] flex flex-col gap-4">
                                 <div className="flex-1 overflow-y-auto p-4 bg-muted/50 rounded-md space-y-4">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'support' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-lg rounded-lg p-3 text-sm ${msg.sender === 'support' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {isClient ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: ar }) : '...'}
                                            </p>
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8">لا توجد رسائل في هذه المحادثة.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>الرد على الطلب</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Textarea 
                                placeholder="اكتب ردك هنا..."
                                rows={6}
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                disabled={isSending}
                            />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button onClick={handleSendReply} disabled={isSending || !reply.trim()}>
                                {isSending && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                                إرسال الرد
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                <aside className="space-y-6 md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل العميل</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           <p><span className="font-semibold">الاسم:</span> {ticket.customerName}</p>
                           <p><span className="font-semibold">البريد:</span> {ticket.customerEmail}</p>
                           {ticket.customerPhone && <p><span className="font-semibold">الجوال:</span> {ticket.customerPhone}</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل الطلب</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-1">
                                <Label>حالة الطلب</Label>
                                 <Select 
                                    value={ticket.status}
                                    onValueChange={(status) => handleStatusChange(status as Ticket['status'])}
                                 >
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">جديد</SelectItem>
                                        <SelectItem value="in-progress">قيد المعالجة</SelectItem>
                                        <SelectItem value="closed">مغلق</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                             <p className="text-sm"><span className="font-semibold">التصنيف:</span> {categoryMap[ticket.category] || ticket.category}</p>
                             
                              {ticket.productDetails && (
                                <div className="rounded-md border p-3 text-sm">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4"/>المنتج/الخدمة المطلوبة</h4>
                                    <p><span className="text-muted-foreground">الاسم:</span> {ticket.productDetails.name}</p>
                                    <p><span className="text-muted-foreground">السعر:</span> {ticket.productDetails.price.toFixed(2)} ر.س</p>
                                </div>
                            )}

                            {ticket.fileUrls && ticket.fileUrls.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h4 className="font-semibold text-sm">المرفقات:</h4>
                                    <div className="flex flex-col gap-2">
                                        {ticket.fileUrls.map((url, index) => (
                                            <a href={url} target="_blank" rel="noopener noreferrer" key={index} className="text-sm">
                                                <Button variant="outline" size="sm" className="w-full justify-start">
                                                    <FileText className="ml-2 h-4 w-4"/>
                                                    ملف {index + 1}
                                                </Button>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        {canConfirmSale && (
                            <CardFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full" variant="secondary" disabled={isSending}>
                                            <CheckCircle className="ml-2 h-4 w-4" />
                                            تأكيد البيع وإنشاء فاتورة
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                سيؤدي هذا الإجراء إلى:
                                                <ul className="list-disc pr-5 mt-2 space-y-1">
                                                    <li>إنشاء فاتورة مدفوعة بقيمة {ticket.productDetails?.price.toFixed(2)} ر.س</li>
                                                    <li>تسجيل معاملة دخل جديدة بنفس القيمة.</li>
                                                    <li>إغلاق هذه التذكرة.</li>
                                                </ul>
                                                 لا يمكن التراجع عن هذا الإجراء.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleConfirmSale}>نعم، تأكيد البيع</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        )}
                    </Card>
                </aside>
            </main>
        </div>
    )
}


"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";


interface Subscription {
    id: string;
    serviceName: string;
    amount: number;
    renewalDate: string;
}

const SubscriptionForm = ({ 
    subscription, 
    onSave, 
    onClose 
}: { 
    subscription?: Subscription | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [serviceName, setServiceName] = React.useState(subscription?.serviceName || "");
  const [amount, setAmount] = React.useState(subscription?.amount || 0);
  const [renewalDate, setRenewalDate] = React.useState<Date | undefined>(
    subscription ? parseISO(subscription.renewalDate) : undefined
  );
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!serviceName || !amount || !renewalDate) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const subscriptionData = { 
            serviceName, 
            amount: Number(amount), 
            renewalDate: renewalDate.toISOString()
        };
        const transactionData = {
            description: `مصروف اشتراك: ${serviceName}`,
            amount: Number(amount),
            type: 'expense',
            category: 'اشتراكات',
            date: new Date().toISOString()
        };

        if (subscription) {
            const subscriptionRef = doc(db, "subscriptions", subscription.id);
            await updateDoc(subscriptionRef, subscriptionData);
            const transactionRef = doc(db, "transactions", `sub_${subscription.id}`);
            await setDoc(transactionRef, transactionData);
            toast({ title: "تم تحديث الاشتراك بنجاح!" });
        } else {
            const newSubDoc = await addDoc(collection(db, "subscriptions"), subscriptionData);
            const transactionRef = doc(db, "transactions", `sub_${newSubDoc.id}`);
            await setDoc(transactionRef, transactionData);
            toast({ title: "تم إضافة الاشتراك بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving subscription: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ الاشتراك.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>{subscription ? "تعديل اشتراك" : "إضافة اشتراك جديد"}</DialogTitle>
            <DialogDescription>
                أدخل تفاصيل الاشتراك. سيتم تسجيله كمصروف تلقائي.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serviceName" className="text-right">اسم الخدمة</Label>
                <Input id="serviceName" value={serviceName} onChange={e => setServiceName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">المبلغ (ر.س)</Label>
                <Input id="amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">تاريخ التجديد</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("col-span-3 justify-start text-right font-normal", !renewalDate && "text-muted-foreground")}
                        >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {renewalDate ? format(renewalDate, "PPP", { locale: ar }) : <span>اختر تاريخًا</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={renewalDate} onSelect={setRenewalDate} initialFocus locale={ar}/>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ الاشتراك'}
            </Button>
        </DialogFooter>
    </DialogContent>
  );
};


export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);

  const fetchSubscriptions = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "subscriptions"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
        setSubscriptions(data.sort((a,b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()));
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء جلب الاشتراكات." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleEdit = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDialogOpen(true);
  };

  const handleDelete = async (subscription: Subscription) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا الاشتراك؟ سيتم حذف المصروف المرتبط به أيضًا.")) return;
    try {
        // Delete subscription document
        await deleteDoc(doc(db, "subscriptions", subscription.id));
        
        // Delete associated transaction
        const transactionRef = doc(db, "transactions", `sub_${subscription.id}`);
        await deleteDoc(transactionRef);

        toast({ title: "تم حذف الاشتراك والمصروف المرتبط به بنجاح" });
        fetchSubscriptions();
    } catch (error) {
        console.error("Error deleting subscription:", error);
        toast({ variant: "destructive", title: "حدث خطأ أثناء حذف الاشتراك." });
    }
  };
  
  const handleOpenDialog = () => {
      setSelectedSubscription(null);
      setIsDialogOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="الاشتراكات"
        description="إدارة اشتراكاتك الدورية. يتم تسجيلها كمصاريف تلقائيًا."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة اشتراك
            </Button>
          </DialogTrigger>
          <SubscriptionForm 
            subscription={selectedSubscription} 
            onSave={() => {
                fetchSubscriptions();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      <div className="border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الخدمة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead className="hidden sm:table-cell">تاريخ التجديد</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
            ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => (
                    <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.serviceName}</TableCell>
                        <TableCell dir="ltr">{new Intl.NumberFormat('ar-SA').format(sub.amount)} <span className="saudi-riyal">&#xea;</span></TableCell>
                        <TableCell className="hidden sm:table-cell">{format(parseISO(sub.renewalDate), "PPP", { locale: ar })}</TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(sub)}>تعديل</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(sub)} className="text-destructive">حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        لا توجد اشتراكات محفوظة حاليًا.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

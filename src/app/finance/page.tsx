
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Wallet, TrendingUp, TrendingDown, Percent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";


interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
}

const TransactionForm = ({ 
    transaction, 
    onSave, 
    onClose 
}: { 
    transaction?: Transaction | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [description, setDescription] = React.useState(transaction?.description || "");
  const [amount, setAmount] = React.useState(transaction?.amount || 0);
  const [type, setType] = React.useState<Transaction['type']>(transaction?.type || 'expense');
  const [category, setCategory] = React.useState(transaction?.category || "");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!description || !amount || !category) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const transactionData = { 
            description, 
            amount: Number(amount), 
            type, 
            category,
            date: new Date().toISOString()
        };

        if (transaction) {
            const transactionRef = doc(db, "transactions", transaction.id);
            await updateDoc(transactionRef, transactionData);
            toast({ title: "تم تحديث المعاملة بنجاح!" });
        } else {
            await addDoc(collection(db, "transactions"), transactionData);
            toast({ title: "تم إضافة المعاملة بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving transaction: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ المعاملة. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{transaction ? "تعديل معاملة" : "إضافة معاملة جديدة"}</DialogTitle>
        <DialogDescription>
          أدخل تفاصيل معاملتك المالية هنا. اضغط على "حفظ" لما تخلص.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 text-right">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            الوصف
          </Label>
          <Input id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">
            المبلغ
          </Label>
          <div className="col-span-3 relative">
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="pl-7" />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 saudi-riyal">&#xea;</span>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            النوع
          </Label>
          <Select value={type} onValueChange={(v) => setType(v as Transaction['type'])}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">دخل</SelectItem>
              <SelectItem value="expense">مصروف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="category" className="text-right">
            الفئة
          </Label>
          <Input id="category" value={category} onChange={e => setCategory(e.target.value)} className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default function FinancePage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const transactionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transactionsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
        console.error("Error fetching transactions: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء جلب المعاملات.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTransactions();
  }, []);
  
  const handleOpenDialog = () => {
      setSelectedTransaction(null);
      setIsDialogOpen(true);
  }

  const { income, expenses, netProfit, profitPercentage } = React.useMemo(() => {
      const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const netProfit = income - expenses;
      const profitPercentage = income > 0 ? (netProfit / income) * 100 : 0;
      return { income, expenses, netProfit, profitPercentage };
  }, [transactions]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right bg-background dark:bg-zinc-900">
      <PageHeader
        title="مالية المشاريع"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} variant="outline" className="bg-card text-card-foreground hover:bg-card/90">
              <PlusCircle className="ml-2 h-4 w-4" /> معاملة جديدة
            </Button>
          </DialogTrigger>
          <TransactionForm 
            transaction={selectedTransaction} 
            onSave={() => {
                fetchTransactions();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <Card className="lg:col-span-2 bg-card text-card-foreground p-6 flex flex-col items-center justify-center min-h-[400px]">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <Wallet className="w-24 h-24 text-muted-foreground opacity-50 mb-6" />
              <h3 className="text-muted-foreground text-lg">صافي الربح الإجمالي</h3>
              <p className="text-6xl font-bold my-2" dir="ltr">
                {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(netProfit)}
              </p>
               <Button asChild variant="outline" className="mt-6 bg-background">
                  <Link href="/finance/reports">
                    عرض التقارير التفصيلية
                  </Link>
                </Button>
            </>
          )}
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
           <Card className="bg-primary text-primary-foreground p-4">
              <CardDescription className="text-primary-foreground/80">إجمالي الدخل</CardDescription>
              <CardTitle className="text-4xl" dir="ltr">
                 {isLoading ? <Skeleton className="h-10 w-3/4 bg-white/20"/> : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(income)}
              </CardTitle>
          </Card>
          <Card className="bg-card text-card-foreground p-4">
              <CardDescription>إجمالي المصاريف</CardDescription>
              <CardTitle className="text-3xl flex items-center justify-between" dir="ltr">
                 {isLoading ? <Skeleton className="h-8 w-1/2"/> : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(expenses)}
                 <TrendingDown className="text-destructive"/>
              </CardTitle>
          </Card>
           <Card className="bg-card text-card-foreground p-4">
              <CardDescription>نسبة صافي الربح</CardDescription>
              <CardTitle className="text-3xl flex items-center justify-between" dir="ltr">
                 {isLoading ? <Skeleton className="h-8 w-1/2"/> : `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 1 }).format(profitPercentage)}%`}
                 <Percent className="text-green-500"/>
              </CardTitle>
          </Card>
        </div>

      </main>
    </div>
  );
}
